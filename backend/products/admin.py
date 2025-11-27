from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku','name','price','active','created_at')
    search_fields = ('sku','name','description')
    readonly_fields = ('sku_lower','created_at','updated_at')
