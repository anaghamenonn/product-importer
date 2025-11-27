from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from .models import Product
from .serializers import ProductSerializer
from django.conf import settings
import uuid, os
from .tasks import import_products_from_csv, delete_all_products_task
from django.views.decorators.csrf import csrf_exempt
    
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-id')
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        sku = self.request.query_params.get('sku')
        name = self.request.query_params.get('name')
        active = self.request.query_params.get('active')
        description = self.request.query_params.get('description')
        if sku:
            qs = qs.filter(sku__icontains=sku)
        if name:
            qs = qs.filter(name__icontains=name)
        if active is not None:
            if active.lower() in ('true','1'):
                qs = qs.filter(active=True)
            elif active.lower() in ('false','0'):
                qs = qs.filter(active=False)
        if description:
            qs = qs.filter(description__icontains=description)
        return qs

    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        task = delete_all_products_task.delay()
        return Response(
            {
                'message': 'Bulk delete task started.',
                'task_id': task.id,
                'status': 'processing'
            },
            status=status.HTTP_202_ACCEPTED
        )

@api_view(['POST'])
@csrf_exempt
def upload_csv(request):
    f = request.FILES.get('file')
    if not f:
        return Response({'error': 'No file provided'}, status=400)

    tmp_dir = os.path.join(settings.BASE_DIR, 'tmp_uploads')
    os.makedirs(tmp_dir, exist_ok=True)
    filename = f'{uuid.uuid4().hex}_{f.name}'
    filepath = os.path.join(tmp_dir, filename)
    with open(filepath, 'wb+') as dest:
        for chunk in f.chunks():
            dest.write(chunk)

    task = import_products_from_csv.delay(filepath)
    return Response({'task_id': task.id})

@api_view(['GET'])
def task_status(request, task_id):
    import redis, json
    r = redis.StrictRedis.from_url(settings.CELERY_BROKER_URL)
    key = f"import_progress:{task_id}"
    raw = r.get(key)
    if not raw:
        return Response({'status': 'notfound'}, status=404)
    data = json.loads(raw)
    return Response(data)

@api_view(['DELETE'])
def delete_all_products(request):
    Product.objects.all().delete()
    return Response({"message": "All products deleted successfully."}, status=status.HTTP_200_OK)