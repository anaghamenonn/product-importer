from django.urls import path, include
from rest_framework import routers
from .views import ProductViewSet, upload_csv, task_status, delete_all_products

router = routers.DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [

    path('delete-all/', delete_all_products, name='delete_all_products'),
    path('upload/', upload_csv, name='upload_csv'),
    path('tasks/<str:task_id>/status/', task_status, name='task_status'),

    path('', include(router.urls)),
]
