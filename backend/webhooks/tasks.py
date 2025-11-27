from celery import shared_task
import requests
from django.conf import settings
import time

@shared_task(bind=True, max_retries=5)
def deliver_webhook(self, webhook_id, payload):
    from .models import Webhook
    try:
        wh = Webhook.objects.get(id=webhook_id, enabled=True)
    except Webhook.DoesNotExist:
        return {'status': 'disabled'}

    try:
        resp = requests.post(wh.url, json=payload, timeout=10)
        return {'status_code': resp.status_code, 'body': resp.text}
    except requests.RequestException as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

