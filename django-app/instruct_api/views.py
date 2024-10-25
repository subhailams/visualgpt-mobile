# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import permissions
from io import BytesIO
import requests
from PIL import Image, ImageDraw, ImageOps, ImageFont
from .models import ProcessedImage
from .instruct import *
from .inpaint import * 
from .drag import *
import cv2

from django.core.files.base import ContentFile 


drag = DemoMove(pretrained_model_path="runwayml/stable-diffusion-v1-5")

class DragView(APIView):

    def get(self, request, *args, **kwargs):

        return Response({}, status=status.HTTP_200_OK)
    
    def post(self, request, *args, **kwargs):
        '''
        Create the Todo with given todo data
        '''
        data = request.data
        image_url = data.get('image_url')  # Expecting the image as a URL
        mask_url = data.get('mask_url')
        selected_points = data.get('selected_points')

        print(image_url, mask_url, selected_points)

        if not image_url:  # Check if image_url is None or empty
            return Response({'error': 'image_url is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(image_url)
            image = BytesIO(response.content)
            image = Image.open(image)  # Convert the downloaded image to a PIL Image

            response2 = requests.get(mask_url)
            mask = BytesIO(response2.content)
            mask = Image.open(mask)  # Convert the downloaded image to a PIL Image

            # Call the inference function and get a PIL Image back
            points_list = list(map(float, selected_points.split(' ')))
            start_point, end_point = (points_list[0], points_list[1]),(points_list[2] , points_list[3])
            sel_pix = [start_point, end_point]
            updated_image, sel_pix = drag.get_point_move(image, start_point, end_point)
            resized_image = cv2.resize(updated_image, (800, 450))
            resized_image = Image.fromarray(resized_image.astype('uint8'), 'RGB')

            # Save the updated image to a BytesIO object
            img_io = BytesIO()
            resized_image.save(img_io, format='PNG')
            img_io.seek(0)

            # Create a new ProcessedImage object and save the image
            processed_image = ProcessedImage()
            processed_image.image.save('point_image.png', ContentFile(img_io.read()), save=False)
            processed_image.save()

            image_url = "http://localhost:8001" + processed_image.image.url
            print(image_url)
            
            # Save the updated_image in django server
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'image_url': image_url}, status=status.HTTP_200_OK)

class MoveView(APIView):

    def get(self, request, *args, **kwargs):

        return Response({}, status=status.HTTP_200_OK)
    
    def post(self, request, *args, **kwargs):
        '''
        Create the Todo with given todo data
        '''
        data = request.data
        image_url = data.get('image_url')  # Expecting the image as a URL
        mask_url = data.get('mask_url')
        selected_points = data.get('selected_points')
        prompt = data.get('prompt')

        print(image_url, mask_url, selected_points)

        if not image_url:  # Check if image_url is None or empty
            return Response({'error': 'image_url is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(image_url)
            image = BytesIO(response.content)
            image = Image.open(image)  # Convert the downloaded image to a PIL Image

            image = np.array(image)

            response2 = requests.get(mask_url)
            mask = BytesIO(response2.content)
            mask = Image.open(mask)  # Convert the downloaded image to a PIL Image
            # mask = mask.convert('RGB')

            mask = np.array(mask)
            # Call the inference function and get a PIL Image back
            points_list = list(map(float, selected_points.split(' ')))
            start_point, end_point = (points_list[0], points_list[1]),(points_list[2] , points_list[3])
            sel_pix = [start_point, end_point]

            updated_image = drag.run_move(image, mask, sel_pix, prompt)
            resized_image = cv2.resize(updated_image, (800, 450))
            resized_image = Image.fromarray(resized_image.astype('uint8'), 'RGB')

            # Save the updated image to a BytesIO object
            img_io = BytesIO()
            resized_image.save(img_io, format='PNG')
            img_io.seek(0)
            
            # Create a new ProcessedImage object and save the image
            processed_image = ProcessedImage()
            processed_image.image.save('move_image.png', ContentFile(img_io.read()), save=False)
            processed_image.save()

            image_url = "http://localhost:8001" + processed_image.image.url
            print(image_url)
            
            # Save the updated_image in django server
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'image_url': image_url}, status=status.HTTP_200_OK)

class ResizeView(APIView):

    def get(self, request, *args, **kwargs):

        return Response({}, status=status.HTTP_200_OK)
    
    def post(self, request, *args, **kwargs):
        '''
        Create the Todo with given todo data
        '''
        data = request.data
        image_url = data.get('image_url')  # Expecting the image as a URL
        mask_url = data.get('mask_url')
        resize_scale = data.get('resize_scale')
        prompt = data.get('prompt')

        print(image_url, mask_url, resize_scale)

        if not image_url:  # Check if image_url is None or empty
            return Response({'error': 'image_url is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(image_url)
            image = BytesIO(response.content)
            image = Image.open(image)  # Convert the downloaded image to a PIL Image

            image = np.array(image)

            response2 = requests.get(mask_url)
            mask = BytesIO(response2.content)
            mask = Image.open(mask)  # Convert the downloaded image to a PIL Image
            mask = mask.convert('RGB')
            mask = np.array(mask)


            updated_image = drag.run_resize(image, mask, resize_scale, prompt)
            resized_image = cv2.resize(updated_image, (800, 450))
            resized_image = Image.fromarray(resized_image.astype('uint8'), 'RGB')

            # Save the updated image to a BytesIO object
            img_io = BytesIO()
            resized_image.save(img_io, format='PNG')
            img_io.seek(0)

            # Create a new ProcessedImage object and save the image
            processed_image = ProcessedImage()
            processed_image.image.save('resize_image.png', ContentFile(img_io.read()), save=False)
            processed_image.save()

            image_url = "http://localhost:8001" + processed_image.image.url
            print(image_url)
            
            # Save the updated_image in django server
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'image_url': image_url}, status=status.HTTP_200_OK)