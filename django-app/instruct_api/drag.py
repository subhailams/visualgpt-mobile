import cv2

from .src.demo.model import DragonModels
import numpy as np
from PIL import Image
import cv2
from .src.utils.utils import resize_numpy_image, split_ldm, process_move, process_drag_face, process_drag, process_appearance, process_paste

import torch
from pytorch_lightning import seed_everything
from PIL import Image
from torchvision.transforms import PILToTensor
import numpy as np
import torch.nn.functional as F
from basicsr.utils import img2tensor


class DemoMove:
    def __init__(self, pretrained_model_path="runwayml/stable-diffusion-v1-5"):
        self.model = DragonModels(pretrained_model_path=pretrained_model_path)
    
    def run_move(self, original_image, mask, selected_points, prompt):
        result_img = self.model.run_move(original_image=original_image, mask=mask, mask_ref=None, prompt=prompt, resize_scale=1, w_edit=4, w_content=6, w_contrast=0.2, w_inpaint=0.8, seed=42, selected_points=selected_points, guidance_scale=4, energy_scale=0.5, max_resolution=768, SDE_strength=0.4, ip_scale=0.1)
        result_img = np.array(result_img[0])
        return result_img

    def run_resize(self, original_image, mask, resize_scale, prompt):
        result_img = self.model.run_move(original_image=original_image, mask=mask, mask_ref=None, prompt=prompt, resize_scale=resize_scale, w_edit=4, w_content=6, w_contrast=0.2, w_inpaint=0.8, seed=42, selected_points=[(0,0), (0,0)], guidance_scale=4, energy_scale=0.5, max_resolution=768, SDE_strength=0.4, ip_scale=0.1)
        result_img = np.array(result_img[0])
        return result_img