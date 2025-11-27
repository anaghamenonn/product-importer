from celery import shared_task
import csv, os, json
from django.db import connection
from psycopg2.extras import execute_values
from django.conf import settings
import time

REDIS_PROGRESS_PREFIX = "import_progress:"

def _redis_set(task_id, payload):
    import redis
    r = redis.StrictRedis.from_url(settings.CELERY_BROKER_URL)
    r.set(REDIS_PROGRESS_PREFIX + task_id, json.dumps(payload), ex=3600)

@shared_task(bind=True)
def import_products_from_csv(self, filepath):
    task_id = self.request.id
    processed = 0
    total_rows = 0
    errors = []
    try:
        with open(filepath, 'rb') as fh:
            for _ in fh:
                total_rows += 1
        if total_rows > 0:
            total_rows -= 1  

        _redis_set(task_id, {"task_id": task_id, "stage": "starting", "processed": 0, "total": total_rows, "message": "Starting"})

        chunk_size = 5000
        batch = []
        with open(filepath, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                sku = row.get('sku') or row.get('SKU') or row.get('Sku')
                if not sku:
                    if len(errors) < 100:
                        errors.append({"row": row, "reason": "missing sku"})
                    continue
                name = row.get('name') or ''
                description = row.get('description') or ''
                price = row.get('price') or '0'
                active = True
                extra = {k:v for k,v in row.items() if k.lower() not in ('sku','name','description','price')}
                batch.append((sku, sku.lower(), name, description, price, active, json.dumps(extra)))
                if len(batch) >= chunk_size:
                    _upsert_batch(batch)
                    processed += len(batch)
                    _redis_set(task_id, {"task_id": task_id, "stage": "importing", "processed": processed, "total": total_rows, "message": f"Imported {processed}/{total_rows}", "errors": errors})
                    batch = []
            if batch:
                _upsert_batch(batch)
                processed += len(batch)
                _redis_set(task_id, {"task_id": task_id, "stage": "importing", "processed": processed, "total": total_rows, "message": f"Imported {processed}/{total_rows}", "errors": errors})

        _redis_set(task_id, {"task_id": task_id, "stage": "complete", "processed": processed, "total": total_rows, "message": "Import complete", "errors": errors})

        try:
            from webhooks.models import Webhook
            from webhooks.tasks import deliver_webhook

            payload = {
                "event": "product.import.completed",
                "task_id": task_id,
                "status": "complete",
                "processed": processed,
                "total": total_rows,
                "errors": errors,
            }

            for wh in Webhook.objects.filter(event='product.import.completed', enabled=True):
                deliver_webhook.delay(wh.id, payload)

        except Exception as e_webhook:
            print("Webhook trigger error:", e_webhook)

    except Exception as e:
        _redis_set(task_id, {"task_id": task_id, "stage": "failed", "processed": processed, "total": total_rows, "message": str(e), "errors": errors})

        try:
            from webhooks.models import Webhook
            from webhooks.tasks import deliver_webhook

            payload = {
                "event": "product.import.failed",
                "task_id": task_id,
                "status": "failed",
                "processed": processed,
                "total": total_rows,
                "errors": errors,
                "error_message": str(e),
            }

            for wh in Webhook.objects.filter(event='product.import.failed', enabled=True):
                deliver_webhook.delay(wh.id, payload)

        except Exception as ex:
            print("Webhook failure handling exception:", ex)

        raise
    finally:
        try:
            os.remove(filepath)
        except Exception:
            pass

def _upsert_batch(batch):
    with connection.cursor() as cur:
        sql = """
        INSERT INTO products_product
            (sku, sku_lower, name, description, price, active, extra, created_at, updated_at)
        VALUES %s
        ON CONFLICT (sku_lower) DO UPDATE
        SET sku = EXCLUDED.sku,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            active = EXCLUDED.active,
            extra = EXCLUDED.extra,
            updated_at = now()
        """
        execute_values(cur, sql, batch, template="(%s, %s, %s, %s, %s, %s, %s, now(), now())")

@shared_task
def delete_all_products_task():
    from .models import Product
    Product.objects.all().delete()
    return {"status": "deleted"}

@shared_task(bind=True)
def test_task(self):
    for i in range(3):
        print(f"test_task step {i+1}/3")
        time.sleep(1)
    return "OK"
