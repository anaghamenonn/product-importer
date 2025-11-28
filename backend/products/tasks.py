from celery import shared_task
import csv, os, json, io
from django.db import connection
from psycopg2.extras import execute_values
from django.conf import settings
import time

REDIS_PROGRESS_PREFIX = "import_progress:"

def _redis_set(task_id, payload):
    import redis
    r = redis.StrictRedis.from_url(settings.CELERY_BROKER_URL)
    r.set(REDIS_PROGRESS_PREFIX + task_id, json.dumps(payload), ex=3600)

@shared_task(bind=True, max_retries=3, retry_backoff=True)
def import_products_from_csv(self, file_bytes, filename):
    task_id = self.request.id
    processed = 0
    total_rows = 0
    errors = []

    try:
        if not file_bytes:
            raise ValueError("Uploaded file is empty or unreadable")

        text_data = io.StringIO(file_bytes.decode("utf-8"))

        # Count rows first
        total_rows = sum(1 for _ in text_data) - 1
        text_data.seek(0)

        if total_rows <= 0:
            raise ValueError("CSV contains no valid rows to process.")

        _redis_set(task_id, {
            "task_id": task_id,
            "stage": "starting",
            "processed": processed,
            "total": total_rows,
            "message": "Starting CSV import..."
        })

        batch = []
        chunk_size = 3000
        reader = csv.DictReader(text_data)

        for row in reader:
            sku = row.get('sku') or row.get('SKU')

            if not sku:
                errors.append({"row": row, "reason": "Missing SKU"})
                continue

            try:
                price = float(row.get('price', 0))
            except:
                errors.append({"row": row, "reason": "Invalid price"})
                continue

            batch.append((
                sku,
                sku.lower(),
                row.get('name', ''),
                row.get('description', ''),
                price,
                True,
                json.dumps({
                    k: v for k, v in row.items() if k.lower() not in ('sku','name','description','price')
                })
            ))

            if len(batch) >= chunk_size:
                _upsert_batch(batch)
                processed += len(batch)
                batch.clear()

                _redis_set(task_id, {
                    "task_id": task_id,
                    "stage": "importing",
                    "processed": processed,
                    "total": total_rows,
                    "message": f"Imported {processed}/{total_rows}"
                })

        # Final batch
        if batch:
            _upsert_batch(batch)
            processed += len(batch)

        result = {"processed": processed, "total": total_rows, "errors": errors}

        _redis_set(task_id, {
            "task_id": task_id,
            "stage": "complete",
            "processed": processed,
            "total": total_rows,
            "message": "Import completed successfully"
        })

        logger.info(f"CSV import complete: {result}")
        return result

    except Exception as e:
        logger.error(f"Task failed: {e}")

        _redis_set(task_id, {
            "task_id": task_id,
            "stage": "failed",
            "processed": processed,
            "total": total_rows,
            "message": str(e)
        })

        raise self.retry(exc=e)
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
