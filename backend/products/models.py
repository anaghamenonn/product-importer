from django.db import models

class Product(models.Model):
    sku = models.CharField(max_length=128)
    sku_lower = models.CharField(max_length=128, editable=False, db_index=True)
    name = models.CharField(max_length=512, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)
    extra = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['sku_lower'], name='unique_sku_lower')
        ]
        indexes = [
            models.Index(fields=['sku_lower']),
        ]

    def save(self, *args, **kwargs):
        if self.sku:
            self.sku_lower = self.sku.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sku} - {self.name}"
