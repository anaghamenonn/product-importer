from django.db import models

class Webhook(models.Model):
    name = models.CharField(max_length=200)
    url = models.URLField()
    event = models.CharField(max_length=100) 
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.event})"
