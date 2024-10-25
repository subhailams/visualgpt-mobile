from diffusers import StableDiffusionInpaintPipeline
import torch
from PIL import Image, ImageDraw, ImageOps, ImageFont
import numpy as np

class Inpainting:
        def __init__(self):
            self.pipe = StableDiffusionInpaintPipeline.from_pretrained(
                # "runwayml/stable-diffusion-inpainting",
                "stabilityai/stable-diffusion-2-inpainting",
                torch_dtype=torch.float16,
            )
            
            self.pipe.to("cuda:1")

        def inference(self, image,mask_image, prompt):
            #image and mask_image should be PIL images.
            #The mask structure is white for inpainting and black for keeping as is

            image = self.pipe(prompt=prompt, image=image, mask_image=mask_image).images[0]
            return image


