import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import { MdUndo, MdSave } from "react-icons/md";

const ResizeCanvas = () => {
  const navigate = useNavigate();
  const [canvas, setCanvas] = useState(null);
  const [resizeFactor, setResizeFactor] = useState(0.5); // Default zoom factor
  const [points, setPoints] = useState(null); // To store the points
  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const page = localStorage.getItem('gesture_or_speech');
  const [pointsArray, setPointsArray] = useState([]);
  
  let baseX = 400;
  let baseY = 170;

  const originalImageUrl = localStorage.getItem('image.png');
  if (originalImageUrl && originalImageUrl.includes('trial')) {
    baseX = 400;
    baseY = 170;
  }
  else if (page == "gesture"){
    baseX = 400;
    baseY = 170;
  }
  else{
    baseX = 400;
    baseY = 170;
  }



  useEffect(() => {
    // Initialize the Fabric.js canvas
    const fabricCanvas = new fabric.Canvas('fabric-canvas', {
      width: 800,
      height: 450,
      selection: false,
    });
    setCanvas(fabricCanvas);

    const initialDistance = 30;

    // Initialize and add two points on the canvas, positioned diagonally
    const point1 = new fabric.Circle({
      radius: 10,
      fill: 'white',
      left: baseX - initialDistance,
      top: baseY + initialDistance,
      selectable: false,
    });

    const point2 = new fabric.Circle({
      radius: 10,
      fill: 'white',
      left: baseX + initialDistance,
      top: baseY - initialDistance,
      selectable: false,
    });

    fabricCanvas.add(point1, point2);
    setPoints([point1, point2]);

    return () => fabricCanvas.dispose(); // Cleanup
  }, []);

  useEffect(() => {
    // Adjust the positions of the points based on the resize factor, diagonally
    if (canvas && points) {
      const [point1, point2] = points;
      // Base distance between points
      const baseDistance = 50;

      // Amplify the distance change by using a larger multiplier to make it more visible
      const newDistance = baseDistance  * resizeFactor; // More natural range of distance

      point1.set({ left: baseX - newDistance, top: baseY + newDistance });
      point2.set({ left: baseX + newDistance, top: baseY - newDistance });

      canvas.renderAll();
    }
  }, [resizeFactor, canvas, points]);

  useEffect(() => {
    const originalImageUrl = localStorage.getItem('image.png');
    if (originalImageUrl && canvas) {
      const proxyUrl = `http://localhost:3001/fetch-image?url=${encodeURIComponent(originalImageUrl)}`;
      fetch(proxyUrl)
        .then(response => response.blob())
        .then(blob => {
          const localUrl = URL.createObjectURL(blob);
          canvas.setBackgroundImage(localUrl, canvas.renderAll.bind(canvas), {
            originX: 'left',
            originY: 'top',
            scaleX: canvas.width / canvas.getWidth(),
            scaleY: canvas.height / canvas.getHeight(),
          });
        })
        .catch(e => console.error('Error fetching the image through proxy: ', e));
    }
  }, [canvas]);

  useEffect(() => {
    if (canvas) {
      let initialTouchDistance = null;

      // Handler for capturing zoom factor from touch gestures
      const handleTouchStart = (event) => {
        if (event.touches.length === 2) {
          // Store the initial distance between the two fingers
          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          initialTouchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
        }
      };

      const handleTouchMove = (event) => {
        if (event.touches.length === 2 && initialTouchDistance !== null) {
          event.preventDefault(); // Prevent default behavior like scrolling

          const touch1 = event.touches[0];
          const touch2 = event.touches[1];
          const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );

          // Calculate the new resize factor
          const scaleFactor = currentDistance / initialTouchDistance;
          let newResizeFactor = (resizeFactor * scaleFactor);
          newResizeFactor = Math.max(0.1, Math.min(newResizeFactor, 2)); // Clamp between 0.1 and 2


          setResizeFactor(newResizeFactor);

          const [point1, point2] = points;
          canvas.add(point1, point2);
          setPointsArray(prevPoints => [
            ...prevPoints,
            { x1: point1.left, y1: point1.top, x2: point2.left, y2: point2.top }
          ]);


          // Update initial distance for the next move event
          initialTouchDistance = currentDistance;
        }
      };

      const handleTouchEnd = () => {
        initialTouchDistance = null;
      };

      // Add touch event listeners to the canvas wrapper element
      const canvasWrapper = canvas.wrapperEl;
      canvasWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvasWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvasWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        canvasWrapper.removeEventListener('touchstart', handleTouchStart);
        canvasWrapper.removeEventListener('touchmove', handleTouchMove);
        canvasWrapper.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [canvas, resizeFactor]);

  const saveAnnotatedImage = async () => {
    localStorage.setItem('resize_points', JSON.stringify(pointsArray));
    setSaveButtonStyle({ ...buttonStyle, backgroundColor: '#388E3C' });

    if (canvas) {
      const dataUrl = canvas.toDataURL({ format: 'png', quality: 1.0 });
      const img_name2 = 'resize_image_' + new Date().toISOString() + '.png';
      localStorage.setItem('resize_image', "http://localhost:3001/uploads/" + img_name2);
      uploadImageToServer(dataUrl, img_name2);
    }
    console.log("Resize factor: ",resizeFactor)
    localStorage.setItem('resize_scale', resizeFactor.toString());
    localStorage.setItem('resizeDone', true);
    localStorage.setItem('action', 'resize');
    localStorage.setItem('canvasType', 'Resize');
    localStorage.setItem('annotationDone', true);
    if (page === "speech") {
      navigate('/text_speech');
    } else {
      navigate('/text_gesture');
    }
  };

  const uploadImageToServer = async (imageDataUrl, filename) => {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('image', blob, filename);

    const uploadEndpoint = 'http://localhost:3001/upload';
    try {
      const uploadResponse = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed: ' + uploadResponse.statusText);

      const data = await uploadResponse.json();
      console.log(`${filename} saved on server:`, data.imagePath);
      localStorage.setItem(filename, data.imagePath);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleUndo = () => {
    // Undo logic
  };

  return (
    <div style={{ alignItems: 'center', maxWidth: '100%', maxHeight: '100%', marginTop: '20px', marginLeft: '20px' }}>
      <h1 style={{ marginBottom: '10px', color: 'white', fontSize: '20px' }}>Pinch to zoom in or out</h1>

      <canvas id="fabric-canvas" style={{ width: '100%', height: '100%', cursor: 'zoom-in' }} />

      <div style={{ display: 'flex', marginTop: '10px' }}>
        <button onClick={handleUndo} style={undoButtonStyle}>
          <MdUndo size={24} color="white" style={{ marginRight: '5px' }} />
          <span>Undo</span>
        </button>
        <button onClick={saveAnnotatedImage} style={saveButtonStyle}>
          <MdSave size={20} color="white" style={{ marginRight: '5px' }} />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
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

const undoButtonStyle = {
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

export default ResizeCanvas;