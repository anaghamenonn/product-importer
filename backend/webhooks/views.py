from rest_framework import viewsets
from .models import Webhook
from .serializers import WebhookSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from .tasks import deliver_webhook

class WebhookViewSet(viewsets.ModelViewSet):
    queryset = Webhook.objects.all().order_by('-id')
    serializer_class = WebhookSerializer

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        wh = self.get_object()
        payload = request.data.get('payload', {"test": "ok"})
        task = deliver_webhook.delay(wh.id, payload)
        return Response({"task_id": task.id})
