from django.urls import path, include
from rest_framework import routers
from .views import WebhookViewSet

router = routers.DefaultRouter()
router.register(r'webhooks', WebhookViewSet, basename='webhook')

urlpatterns = [
    path('', include(router.urls)),
]
