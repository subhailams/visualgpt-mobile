import torch
import os
import uuid
import numpy as np
from PIL import Image, ImageDraw, ImageOps, ImageFont

from diffusers import StableDiffusionPipeline, StableDiffusionInpaintPipeline, StableDiffusionInstructPix2PixPipeline
from diffusers import EulerAncestralDiscreteScheduler
#from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler
from diffusers.pipelines.stable_diffusion import StableDiffusionSafetyChecker

def get_new_image_name(org_img_name, func_name="update"):
    head_tail = os.path.split(org_img_name)
    head = head_tail[0]
    tail = head_tail[1]
    name_split = tail.split('.')[0].split('_')
    this_new_uuid = str(uuid.uuid4())[:4]
    if len(name_split) == 1:
        most_org_file_name = name_split[0]
    else:
        assert len(name_split) == 4
        most_org_file_name = name_split[3]
    recent_prev_file_name = name_split[0]
    new_file_name = f'{this_new_uuid}_{func_name}_{recent_prev_file_name}_{most_org_file_name}.png'
    return os.path.join(head, new_file_name)

class InstructPix2Pix:
    def __init__(self, device):
        print(f"Initializing InstructPix2Pix to {device}")
        self.device = device
        self.torch_dtype = torch.float16 if 'cuda' in device else torch.float32
       
        self.pipe = StableDiffusionInstructPix2PixPipeline.from_pretrained("timbrooks/instruct-pix2pix",
                                                                           safety_checker=StableDiffusionSafetyChecker.from_pretrained('CompVis/stable-diffusion-safety-checker'),
                                                                           torch_dtype=self.torch_dtype).to(device)
        self.pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(self.pipe.scheduler.config)


    def inference(self, image, prompt):
        """Change style of image."""
        print("===>Starting InstructPix2Pix Inference")
        width, height = image.size
        ratio = min(512 / width, 512 / height)
        width_new, height_new = (round(width * ratio), round(height * ratio))
        width_new = int(np.round(width_new / 64.0)) * 64
        height_new = int(np.round(height_new / 64.0)) * 64
        image = image.resize((width_new, height_new))
        image = image.convert('RGB')
        updated_image = self.pipe(prompt, image=image, num_inference_steps=40, image_guidance_scale=1.2).images[0]
        # updated_image_path = get_new_image_name("image/demo", func_name="pix2pix")
        # image.save(updated_image_path)
        
        # print(f"\nProcessed InstructPix2Pix, Input Image: {image_path}, Instruct Text: {text}, "
        #       f"Output Image: {updated_image_path}")
        return updated_image
    

# if __name__ == '__main__':
#     instruct = InstructPix2Pix(device="cuda:0")
#     inputs="image/dog.png,Replace dog with a cat"
#     instruct.inference(inputs=inputs)

