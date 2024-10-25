
def create_demo_move(runner):
    DESCRIPTION = """
    ## Object Moving & Resizing
    Usage:
    - Upload a source image, and then draw a box to generate the mask corresponding to the editing object.
    - Label the object's movement path on the source image.
    - Label reference region. (optional)
    - Add a text description to the image and click the `Edit` button to start editing."""
    
    with gr.Blocks() as demo:
        original_image = gr.State(value=None) # store original image
        mask_ref = gr.State(value=None)
        selected_points = gr.State([])
        global_points = gr.State([])
        global_point_label = gr.State([])
        gr.Markdown(DESCRIPTION)
        with gr.Row():
            with gr.Column():
                with gr.Box():
                    gr.Markdown("# INPUT")
                    gr.Markdown("## 1. Draw box to mask target object")
                    img_draw_box = gr.Image(source='upload', label="Draw box", interactive=True, type="numpy")

                    gr.Markdown("## 2. Draw arrow to describe the movement")
                    img = gr.Image(source='upload', label="Original image", interactive=True, type="numpy")

                    gr.Markdown("## 3. Label reference region (Optional)")
                    img_ref = gr.Image(tool="sketch", label="Original image", interactive=True, type="numpy") 
        
                    gr.Markdown("## 4. Prompt")
                    prompt = gr.Textbox(label="Prompt")

                    with gr.Row():
                        run_button = gr.Button("Edit")
                        clear_button = gr.Button("Clear")

                    with gr.Box():
                        guidance_scale = gr.Slider(label="Classifier-free guidance strength", value=4, minimum=1, maximum=10, step=0.1)
                        energy_scale = gr.Slider(label="Classifier guidance strength (x1e3)", value=0.5, minimum=0, maximum=10, step=0.1)
                        max_resolution = gr.Slider(label="Resolution", value=768, minimum=428, maximum=1024, step=1)
                        with gr.Accordion('Advanced options', open=False):
                            seed = gr.Slider(label="Seed", value=42, minimum=0, maximum=10000, step=1, randomize=False)
                            resize_scale = gr.Slider(
                                        label="Object resizing scale",
                                        minimum=0,
                                        maximum=10,
                                        step=0.1,
                                        value=1,
                                        interactive=True)
                            w_edit = gr.Slider(
                                        label="Weight of moving strength",
                                        minimum=0,
                                        maximum=10,
                                        step=0.1,
                                        value=4,
                                        interactive=True)
                            w_content = gr.Slider(
                                        label="Weight of content consistency strength",
                                        minimum=0,
                                        maximum=10,
                                        step=0.1,
                                        value=6,
                                        interactive=True)
                            w_contrast = gr.Slider(
                                        label="Weight of contrast strength",
                                        minimum=0,
                                        maximum=10,
                                        step=0.1,
                                        value=0.2,
                                        interactive=True)
                            w_inpaint = gr.Slider(
                                        label="Weight of inpainting strength",
                                        minimum=0,
                                        maximum=10,
                                        step=0.1,
                                        value=0.8,
                                        interactive=True)
                            SDE_strength = gr.Slider(
                                        label="Flexibility strength",
                                        minimum=0,
                                        maximum=1,
                                        step=0.1,
                                        value=0.4,
                                        interactive=True)
                            ip_scale = gr.Slider(
                                        label="Image prompt scale",
                                        minimum=0,
                                        maximum=1,
                                        step=0.1,
                                        value=0.1,
                                        interactive=True)
            with gr.Column():
                with gr.Box():
                    gr.Markdown("# OUTPUT")
                    mask = gr.Image(source='upload', label="Mask of object", interactive=True, type="numpy")
                    im_w_mask_ref = gr.Image(label="Mask of reference region", interactive=True, type="numpy")
                    
                    gr.Markdown("<h5><center>Results</center></h5>")
                    output = gr.Gallery().style(grid=1, height='auto')     
            
            img.select(
                get_point_move,
                [original_image, img, selected_points],
                [img, original_image, selected_points],
            )
            img_draw_box.select(
                segment_with_points, 
                inputs=[img_draw_box, original_image, global_points, global_point_label, img], 
                outputs=[img_draw_box, original_image, mask, global_points, global_point_label, img, img_ref]
            )
            img_ref.edit(
                store_img_move,
                [img_ref],
                [original_image, im_w_mask_ref, mask_ref]
            )

            args_str = f"""
            - original_image: {original_image}
            - mask_ref: {mask_ref}
            - selected_points: {selected_points}
            - global_points: {global_points}
            - global_point_label: {global_point_label}
            - mask: {mask}
            - prompt: {prompt}
            - guidance_scale: {guidance_scale}
            - energy_scale: {energy_scale}
            - max_resolution: {max_resolution}
            - seed: {seed}
            - resize_scale: {resize_scale}
            - w_edit: {w_edit}
            - w_content: {w_content}
            - w_contrast: {w_contrast}
            - w_inpaint: {w_inpaint}
            - SDE_strength: {SDE_strength}
            - ip_scale: {ip_scale}
            """
            print(args_str)
            # Create a Gradio interface to display the arguments
            def show_args():
                return args_str

            iface = gr.Interface(fn=show_args, outputs="markdown", title="Argument Values")
            iface.launch()
    
        with gr.Column():
            gr.Markdown("Try some of the examples below ⬇️")
            gr.Examples(
                examples=examples_move,
                inputs=[img_draw_box, prompt]
            )
                    
        run_button.click(fn=runner, inputs=[original_image, mask, mask_ref, prompt, resize_scale, w_edit, w_content, w_contrast, w_inpaint, seed, selected_points, guidance_scale, energy_scale, max_resolution, SDE_strength, ip_scale], outputs=[output])
        clear_button.click(fn=fun_clear, inputs=[original_image, global_points, global_point_label, selected_points, mask_ref, mask, img_draw_box, img, im_w_mask_ref], outputs=[original_image, global_points, global_point_label, selected_points, mask_ref, mask, img_draw_box, img, im_w_mask_ref])
    

    
    return demo