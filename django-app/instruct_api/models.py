from django.db import models

class ProcessedImage(models.Model):
    title = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='processed_images/')