import numpy as np
# from src.demo.utils import get_point, store_img, get_point_move, store_img_move, clear_points, upload_image_move, segment_with_points, segment_with_points_paste, fun_clear
from PIL import Image
import cv2

# from src.models.dragondiff import DragonPipeline
# from src.utils.utils import resize_numpy_image, split_ldm, process_move, process_drag_face, process_drag, process_appearance, process_paste


from .src.models.dragondiff import DragonPipeline
from .src.utils.utils import resize_numpy_image, split_ldm, process_move, process_drag_face, process_drag, process_appearance, process_paste

import torch
import cv2
from pytorch_lightning import seed_everything
from PIL import Image
from torchvision.transforms import PILToTensor
import numpy as np
import torch.nn.functional as F
from basicsr.utils import img2tensor


class DemoMove:
    def __init__(self, pretrained_model_path="runwayml/stable-diffusion-v1-5",selected_points=None, global_points=None, global_point_label=None, mask=None,mask_ref=None, prompt="An apple in a table"):
        self.ip_scale = 0.1
        self.precision = torch.float16
        self.editor = DragonPipeline(sd_id=pretrained_model_path, NUM_DDIM_STEPS=50, precision=self.precision, ip_scale=self.ip_scale)
        self.up_ft_index = [1,2] 
        self.up_scale = 2        
        self.device = 'cuda'

        self.mask_ref = mask_ref
        self.selected_points = selected_points if selected_points is not None else []
        self.global_points = global_points if global_points is not None else []
        self.global_point_label = global_point_label if global_point_label is not None else []
        self.mask = mask
        self.prompt = prompt
        self.guidance_scale = 4
        self.energy_scale = 0.5
        self.max_resolution = 768
        self.seed = 42
        self.resize_scale = 1
        self.w_edit = 4
        self.w_content = 6
        self.w_contrast = 0.2
        self.w_inpaint = 0.8
        self.SDE_strength = 0.4
        self.ip_scale = 0.1
        self.sizes  =  {0:4, 1:2, 2:1, 3:1}


    def get_point_move(self, original_image, start_point, end_point):
            img = original_image
            img = np.array(img)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

            # Clear the previous points and add the new start and end points
            sel_pix = [start_point, end_point]
            print(sel_pix)

            points = []
            for idx, point in enumerate(sel_pix):
                print(point)
                # Convert the point to integer coordinates
                int_point = (int(round(float(point[0]))), int(round(float(point[1]))))
                if idx % 2 == 0:
                    cv2.circle(img, int_point, 10, (0, 0, 255), -1)
                else:
                    cv2.circle(img, int_point, 10, (255, 0, 0), -1)
                points.append(int_point)
                if len(points) == 2:
                    cv2.arrowedLine(img, points[0], points[1], (255, 255, 255), 4, tipLength=0.5)
                    points = []
            
            updated_img = np.asarray(img)
            B, G, R = updated_img.T
            rgb_image_array = np.array((R, G, B)).T
            rgb_image = Image.fromarray(rgb_image_array, mode='RGB')

            return rgb_image, sel_pix

    def run_move(self, original_image, mask, selected_points, ip_scale=0.1, mask_ref=None):
        seed_everything(self.seed)
        energy_scale = self.energy_scale*1e3
        img = np.array(original_image)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        img, input_scale = resize_numpy_image(img, self.max_resolution*self.max_resolution)
        h, w = img.shape[1], img.shape[0] 
        img = Image.fromarray(img)
        img_prompt = img.resize((256, 256))
        img_tensor = (PILToTensor()(img) / 255.0 - 0.5) * 2
        img_tensor = img_tensor.to(self.device, dtype=self.precision).unsqueeze(0)

        if mask_ref is not None and np.sum(mask_ref)!=0:
            mask_ref = np.repeat(mask_ref[:,:,None], 3, 2)
        else:
            mask_ref = None


        emb_im, emb_im_uncond = self.editor.get_image_embeds(img_prompt)
        if ip_scale is not None and ip_scale != self.ip_scale:
            self.ip_scale = ip_scale
            self.editor.load_adapter(self.editor.ip_id, self.ip_scale)
        latent = self.editor.image2latent(img_tensor)
        ddim_latents = self.editor.ddim_inv(latent=latent, prompt=self.prompt)
        latent_in = ddim_latents[-1].squeeze(2)
        scale = 8*self.sizes[max(self.up_ft_index)]/self.up_scale
        x=[]
        y=[]
        x_cur = []
        y_cur = []
        
        for idx, point in enumerate(selected_points):
            if idx%2 == 0:
                y.append(point[1])
                x.append(point[0])
            else:
                y_cur.append(point[1])
                x_cur.append(point[0])
        
        dx = x_cur[0]-x[0]
        dy = y_cur[0]-y[0]


        edit_kwargs = process_move(
            path_mask=mask, 
            h=h, 
            w=w, 
            dx=dx, 
            dy=dy, 
            scale=scale, 
            input_scale=self.ip_scale, 
            resize_scale=self.resize_scale, 
            up_scale=self.up_scale, 
            up_ft_index=self.up_ft_index, 
            w_edit=self.w_edit, 
            w_content=self.w_content, 
            w_contrast=self.w_contrast, 
            w_inpaint=self.w_inpaint,  
            precision=self.precision, 
            path_mask_ref=mask_ref
        )
        # pre-process zT
        mask_tmp = (F.interpolate(img2tensor(mask)[0].unsqueeze(0).unsqueeze(0), (int(latent_in.shape[-2]*self.resize_scale), int(latent_in.shape[-1]*self.resize_scale)))>0).float().to('cuda', dtype=latent_in.dtype)
        latent_tmp = F.interpolate(latent_in, (int(latent_in.shape[-2]*self.resize_scale), int(latent_in.shape[-1]*self.resize_scale)))
        mask_tmp = torch.roll(mask_tmp, (int(dy/(w/latent_in.shape[-2])*self.resize_scale), int(dx/(w/latent_in.shape[-2])*self.resize_scale)), (-2,-1))
        latent_tmp = torch.roll(latent_tmp, (int(dy/(w/latent_in.shape[-2])*self.resize_scale), int(dx/(w/latent_in.shape[-2])*self.resize_scale)), (-2,-1))
        pad_size_x = abs(mask_tmp.shape[-1]-latent_in.shape[-1])//2
        pad_size_y = abs(mask_tmp.shape[-2]-latent_in.shape[-2])//2
        if self.resize_scale>1:
            sum_before = torch.sum(mask_tmp)
            mask_tmp = mask_tmp[:,:,pad_size_y:pad_size_y+latent_in.shape[-2],pad_size_x:pad_size_x+latent_in.shape[-1]]
            latent_tmp = latent_tmp[:,:,pad_size_y:pad_size_y+latent_in.shape[-2],pad_size_x:pad_size_x+latent_in.shape[-1]]
            sum_after = torch.sum(mask_tmp)
            if sum_after != sum_before:
                raise ValueError('Resize out of bounds.')
                exit(0)
        elif self.resize_scale<1:
            temp = torch.zeros(1,1,latent_in.shape[-2], latent_in.shape[-1]).to(latent_in.device, dtype=latent_in.dtype)
            temp[:,:,pad_size_y:pad_size_y+mask_tmp.shape[-2],pad_size_x:pad_size_x+mask_tmp.shape[-1]]=mask_tmp
            mask_tmp =(temp>0.5).float()
            temp = torch.zeros_like(latent_in)
            temp[:,:,pad_size_y:pad_size_y+latent_tmp.shape[-2],pad_size_x:pad_size_x+latent_tmp.shape[-1]]=latent_tmp
            latent_tmp = temp
        latent_in = (latent_in*(1-mask_tmp)+latent_tmp*mask_tmp).to(dtype=latent_in.dtype)

        latent_rec = self.editor.pipe.edit(
            mode = 'move',
            emb_im=emb_im,
            emb_im_uncond=emb_im_uncond,
            latent=latent_in, 
            prompt=self.prompt, 
            guidance_scale=self.guidance_scale, 
            energy_scale=self.energy_scale,  
            latent_noise_ref=ddim_latents, 
            SDE_strength=self.SDE_strength,
            edit_kwargs=edit_kwargs,
        )
        img_rec = self.editor.decode_latents(latent_rec)[:,:,::-1]
        torch.cuda.empty_cache()
       
        new_img = np.asarray(img_rec)
        print(new_img.shape)

        B, G, R = new_img.T
        rgb_image_array = np.array((R, G, B)).T
        rgb_image_new = Image.fromarray(rgb_image_array, mode='RGB')
        
        return rgb_image_new

    
    def run_resize(self, original_image, mask, resize_scale=0.1, ip_scale=0.1, mask_ref=None):
        seed_everything(self.seed)
        energy_scale = self.energy_scale*1e3
        img = np.array(original_image)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        img, input_scale = resize_numpy_image(img, self.max_resolution*self.max_resolution)
        h, w = img.shape[1], img.shape[0] 
        img = Image.fromarray(img)
        img_prompt = img.resize((256, 256))
        img_tensor = (PILToTensor()(img) / 255.0 - 0.5) * 2
        img_tensor = img_tensor.to(self.device, dtype=self.precision).unsqueeze(0)
        self.resize_scale = round(float(resize_scale),2)
        if mask_ref is not None and np.sum(mask_ref)!=0:
            mask_ref = np.repeat(mask_ref[:,:,None], 3, 2)
        else:
            mask_ref = None


        emb_im, emb_im_uncond = self.editor.get_image_embeds(img_prompt)
        if ip_scale is not None and ip_scale != self.ip_scale:
            self.ip_scale = ip_scale
            self.editor.load_adapter(self.editor.ip_id, self.ip_scale)
        latent = self.editor.image2latent(img_tensor)
        ddim_latents = self.editor.ddim_inv(latent=latent, prompt=self.prompt)
        latent_in = ddim_latents[-1].squeeze(2)
        scale = 8*self.sizes[max(self.up_ft_index)]/self.up_scale
        # x=[]
        # y=[]
        # x_cur = []
        # y_cur = []
        
        # for idx, point in enumerate(selected_points):
        #     if idx%2 == 0:
        #         y.append(point[1])
        #         x.append(point[0])
        #     else:
        #         y_cur.append(point[1])
        #         x_cur.append(point[0])
        
        # dx = x_cur[0]-x[0]
        # dy = y_cur[0]-y[0]
        dx = 0.0
        dy = 0.0


        edit_kwargs = process_move(
            path_mask=mask, 
            h=h, 
            w=w, 
            dx=dx, 
            dy=dy, 
            scale=scale, 
            input_scale=self.ip_scale, 
            resize_scale=self.resize_scale, 
            up_scale=self.up_scale, 
            up_ft_index=self.up_ft_index, 
            w_edit=self.w_edit, 
            w_content=self.w_content, 
            w_contrast=self.w_contrast, 
            w_inpaint=self.w_inpaint,  
            precision=self.precision, 
            path_mask_ref=mask_ref
        )
        # pre-process zT
        mask_tmp = (F.interpolate(img2tensor(mask)[0].unsqueeze(0).unsqueeze(0), (int(latent_in.shape[-2]*self.resize_scale), int(latent_in.shape[-1]*self.resize_scale)))>0).float().to('cuda', dtype=latent_in.dtype)
        latent_tmp = F.interpolate(latent_in, (int(latent_in.shape[-2]*self.resize_scale), int(latent_in.shape[-1]*self.resize_scale)))
        mask_tmp = torch.roll(mask_tmp, (int(dy/(w/latent_in.shape[-2])*self.resize_scale), int(dx/(w/latent_in.shape[-2])*self.resize_scale)), (-2,-1))
        latent_tmp = torch.roll(latent_tmp, (int(dy/(w/latent_in.shape[-2])*self.resize_scale), int(dx/(w/latent_in.shape[-2])*self.resize_scale)), (-2,-1))
        pad_size_x = abs(mask_tmp.shape[-1]-latent_in.shape[-1])//2
        pad_size_y = abs(mask_tmp.shape[-2]-latent_in.shape[-2])//2
        if self.resize_scale>1:
            sum_before = torch.sum(mask_tmp)
            mask_tmp = mask_tmp[:,:,pad_size_y:pad_size_y+latent_in.shape[-2],pad_size_x:pad_size_x+latent_in.shape[-1]]
            latent_tmp = latent_tmp[:,:,pad_size_y:pad_size_y+latent_in.shape[-2],pad_size_x:pad_size_x+latent_in.shape[-1]]
            sum_after = torch.sum(mask_tmp)
            if sum_after != sum_before:
                raise ValueError('Resize out of bounds.')
                exit(0)
        elif self.resize_scale<1:
            temp = torch.zeros(1,1,latent_in.shape[-2], latent_in.shape[-1]).to(latent_in.device, dtype=latent_in.dtype)
            temp[:,:,pad_size_y:pad_size_y+mask_tmp.shape[-2],pad_size_x:pad_size_x+mask_tmp.shape[-1]]=mask_tmp
            mask_tmp =(temp>0.5).float()
            temp = torch.zeros_like(latent_in)
            temp[:,:,pad_size_y:pad_size_y+latent_tmp.shape[-2],pad_size_x:pad_size_x+latent_tmp.shape[-1]]=latent_tmp
            latent_tmp = temp
        latent_in = (latent_in*(1-mask_tmp)+latent_tmp*mask_tmp).to(dtype=latent_in.dtype)

        latent_rec = self.editor.pipe.edit(
            mode = 'move',
            emb_im=emb_im,
            emb_im_uncond=emb_im_uncond,
            latent=latent_in, 
            prompt=self.prompt, 
            guidance_scale=self.guidance_scale, 
            energy_scale=self.energy_scale,  
            latent_noise_ref=ddim_latents, 
            SDE_strength=self.SDE_strength,
            edit_kwargs=edit_kwargs,
        )
        img_rec = self.editor.decode_latents(latent_rec)[:,:,::-1]
        torch.cuda.empty_cache()
       
        new_img = np.asarray(img_rec)
        print(new_img.shape)

        B, G, R = new_img.T
        rgb_image_array = np.array((R, G, B)).T
        rgb_image_new = Image.fromarray(rgb_image_array, mode='RGB')
        
        return rgb_image_new

    def segment_with_points_method(self, img_draw_box, original_image, global_points, global_point_label, img):
        return segment_with_points(img_draw_box, original_image, global_points, global_point_label, img)

    def store_img_move_method(self, img_ref):
        return store_img_move(img_ref)

    def clear(self):
        return fun_clear(self.original_image, self.global_points, self.global_point_label, self.selected_points, self.mask_ref, self.mask)

    def run(self, runner):
        # Implement the logic to run the editing process here, possibly using runner
        pass

    # Implement other methods as needed, possibly integrating the imported utility functions.



# original_image_path = 'image.png'
# original_image_pil = Image.open(original_image_path)
# original_image = np.array(original_image_pil)

# mask_path = 'mask.png'
# mask_pil = Image.open(mask_path)
# mask=np.array(mask_pil)
# mask = cv2.cvtColor(mask, cv2.COLOR_RGB2BGR)

# mask_ref=None
# selected_points=None
# global_points=None
# global_point_label=None
# prompt="An apple in a table"

# start_point = (302.54, 221.54)
# end_point = (10.24, 221.54)

# model_path = "runwayml/stable-diffusion-v1-5"
# drag = DemoMove(pretrained_model_path=model_path, prompt=prompt)

# updated_img, sel_pix = drag.get_point_move(original_image, start_point, end_point)
# # print(updated_img.shape)
# # cv2.imwrite('point_img.png', updated_img)


# result_img = drag.run_move(original_image, mask, sel_pix)
