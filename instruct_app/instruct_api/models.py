from django.db import models

class ProcessedImage(models.Model):
    title = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='processed_images/')

class APIRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        ('instruct', 'Instruct'),
        ('inpaint', 'Inpaint'),
        ('speech', 'Speech'),
    ]

    request_type = models.CharField(max_length=8, choices=REQUEST_TYPE_CHOICES)
    image_url = models.URLField(blank=True, null=True)
    mask_url = models.URLField(blank=True, null=True)
    audio_url = models.URLField(blank=True, null=True)
    prompt = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

