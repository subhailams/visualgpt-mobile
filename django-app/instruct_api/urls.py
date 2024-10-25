from django.urls import path, include
from .views import (
    DragView, MoveView, ResizeView
)

urlpatterns = [
    path('drag', DragView.as_view()),
    path('move', MoveView.as_view()),
    path('resize', ResizeView.as_view()),

]