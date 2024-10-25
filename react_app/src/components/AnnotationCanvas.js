import React, { useRef, useState, useEffect } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { useNavigate } from "react-router-dom";
import { MdUndo, MdSave } from "react-icons/md";

const AnnotationCanvas = ({ onDraw }) => {
  const canvasRef = useRef(null);
  const [fetchedImage1, setFetchedImage] = useState('');
  const navigate = useNavigate();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 }); // Default size or dynamically set
  const [brushSize, setBrushSize] = useState(50);
  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const [isDrawn, setIsDrawn] = useState(false);  // Track if the canvas has been drawn on
  const [undoButtonStyle, setundoButtonStyle] = useState(undobuttonStyle);


  useEffect(() => {
    const originalImageUrl = localStorage.getItem('image.png');
    if (originalImageUrl) {
      const proxyUrl = `http://localhost:3001/fetch-image?url=${encodeURIComponent(originalImageUrl)}`;
      fetch(proxyUrl)
        .then(response => response.blob())
        .then(blob => {
          const localUrl = URL.createObjectURL(blob);
          setFetchedImage(localUrl);
        })
        .catch(e => console.error('Error fetching the image through proxy: ', e));
    } else {
      console.error('No original image found in local storage');
    }
  }, []);



const uploadImageToServer = async (imageDataUrl, filename) => {
  // Convert data URL to blob for file upload
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const formData = new FormData();
  formData.append('image', blob, filename); // Use 'mask.png' or 'image.png' based on the argument

  const uploadEndpoint = 'http://localhost:3001/upload'; // Adjust if necessary
  try {
      const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
      });
      
      if (!uploadResponse.ok) throw new Error('Upload failed: ' + uploadResponse.statusText);
      
      const data = await uploadResponse.json();
      console.log(`${filename} saved on server:`, data.imagePath);
      localStorage.setItem(filename, data.imagePath); // Save path as mask.png or image.png
  } catch (error) {
      console.error('Upload failed:', error);
  }
};

  const goBackToChat = () => {
    localStorage.setItem('brush_size', brushSize)
    localStorage.setItem('action', 'selection');
    const page = localStorage.getItem('gesture_or_speech')
    if (page == "speech"){
      navigate('/text_speech');
    }
     
    else{
      navigate('/text_gesture');
    }
  };

  const handleStroke = ({ path, isEraser }) => {
    
    setIsDrawn(true);  // Set to true when the canvas is drawn on

      console.log("Drawing")
        localStorage.setItem('annotationDone', true);  
        // setSaveButtonStyle({ ...buttonStyle, backgroundColor: '#388E3C' });
        if (!canvasRef.current) {
            console.error('Canvas reference is not available');
            return;
        }

        if (!fetchedImage1) {
            console.error('Fetched image is not available');
            return;
        }

        // Load the background image
        const backgroundImg = new Image();
        backgroundImg.src = fetchedImage1;

        backgroundImg.onload = async () => {
            // Use the natural dimensions of the fetched image or scale it
            // let width = backgroundImg.naturalWidth;
            // let height = backgroundImg.naturalHeight;
            let width = 800;
            let height = 450;

            // Export the ReactSketchCanvas drawing as an image
            const sketchDataUrl = await canvasRef.current.exportImage('image/png');

            // Create an off-screen canvas with dimensions matching the scaled image
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = width;
            offscreenCanvas.height = height;
            const ctx = offscreenCanvas.getContext('2d');

            // Draw the background image first
            ctx.drawImage(backgroundImg, 0, 0, width, height);

            // Then overlay the sketch image
            const sketchImg = new Image();
            sketchImg.src = sketchDataUrl;
            sketchImg.onload = () => {
                ctx.drawImage(sketchImg, 0, 0, width, height);

                // Now offscreenCanvas contains the combined image
                const combinedDataUrl = offscreenCanvas.toDataURL('image/png');

                // Upload the combined image to the server
                const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' CDT');
                
                uploadImageToServer(combinedDataUrl, 'image_sktech' + datetime +'.png');
                localStorage.setItem('image_sketch', 'http://localhost:3001/uploads/' + 'image_sktech' + datetime +'.png')
                localStorage.setItem('annotationDone', true);
                localStorage.setItem('action', 'selection');
              };

            const offscreenCanvas1 = document.createElement('canvas');
            offscreenCanvas1.width = width;
            offscreenCanvas1.height = height;
            const ctx1 = offscreenCanvas1.getContext('2d');

            // Fill the canvas with white background
            // ctx1.fillStyle = '#FFFFFF'; // Set fill color to white
            ctx1.fillStyle = '#000000'; // Set fill color to black

            ctx1.fillRect(0, 0, width, height); // Fill the canvas area with white

            // Then overlay the sketch image
            const sketchImg1 = new Image();
            sketchImg1.src = sketchDataUrl;
            sketchImg1.onload = () => {
                ctx1.drawImage(sketchImg1, 0, 0, width, height);
                // Now offscreenCanvas contains the sketch over a white background
                const combinedDataUrl1 = offscreenCanvas1.toDataURL('image/png');
                // Proceed with uploading the combined image as before
                uploadImageToServer(combinedDataUrl1, 'mask.png');
            };
        };
        localStorage.setItem('annotationDone', true);


  };

  const handleBrushSizeChange = (e) => {
    setBrushSize(e.target.value);
  }

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  return (
    <div style={{ alignItems: 'center',maxWidth: '100%',maxHeight: '100%', marginTop: '20px', marginLeft: '20px'}}>
      <h1 style={{ marginBottom: '10px' , color: 'white', fontSize: '20px'}}>Paint the object to make changes.</h1>

    <div style={{ display: 'inline-block', cursor: 'pointer', position: 'relative', justifyContent: 'center', userSelect: 'none',  outline: 'none',maxHeight: '100%',maxHeight: '100%'}}>
      {/* Display image directly */}
      <ReactSketchCanvas
        ref={canvasRef}
        strokeWidth={brushSize} // Adjusted for finer lines
        strokeColor="white"
        canvasColor="transparent"
        onChange={onDraw}
        onStroke={handleStroke}
        className="circle-cursor"
        style={{ position: 'absolute', maxHeight: '100%',maxHeight: '100%' }}
      />
      <img src={fetchedImage1} alt="Fetched" style={{ position: 'abosulte', maxHeight: '100%',maxHeight: '100%'}} />

      {/* ReactSketchCanvas as overlay */}

    </div>
    <div style={{ display: 'flex', width: '80%' }}>

    <label htmlFor="brush-size-slider">Brush Size </label>
      <input
        id="brush-size-slider"
        type="range"
        min="1"
        max="100"
        value={brushSize}
        onChange={handleBrushSizeChange}
        style={{ cursor: 'pointer', marginLeft: '5px'}}
      />
        
</div>
      {/* Buttons displayed below the canvas */}
      <div style={{ display: 'flex', width: '100%', marginTop:'20px' }}>
      <button onClick={handleUndo} style={undoButtonStyle}>
              <MdUndo size={20} color="white" style={{ marginRight: '5px' }} />
              <span>Undo</span>
          </button> 
        <button onClick={goBackToChat} style={saveButtonStyle}>
        <MdSave size={20} color="white" style={{ marginRight: '5px' }} />
        <span>Save</span>
        </button>
      {/*         
        <button onClick={goBackToChat} style={{ ...buttonStyle, marginLeft: '10px' }}>
          Go Back to Chat
        </button> */}
      </div>
    </div>
  );
};

const buttonStyle = {
  // marginTop: '2px',
  padding: '10px 20px',
  backgroundColor: '#808080',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex', 
  alignItems: 'center', 

};


const undobuttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#808080',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  marginRight: '10px',
  display: 'flex', 
  alignItems: 'center', 
};

export default AnnotationCanvas;
