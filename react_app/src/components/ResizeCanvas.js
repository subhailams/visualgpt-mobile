import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import { MdUndo, MdSave} from "react-icons/md";


const ResizeCanvas = () => {
  const navigate = useNavigate();
  const [canvas, setCanvas] = useState(null);
  const [resizeFactor, setResizeFactor] = useState(0.5); // Default zoom factor
  const [points, setPoints] = useState(null); // To store the points
  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const page = localStorage.getItem('gesture_or_speech')
  const [pointsHistory, setPointsHistory] = useState([]);
  const [undoButtonStyle, setundoButtonStyle] = useState(undobuttonStyle);
  const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' CDT');
  const [pointsArray, setPointsArray] = useState([]);
  let baseX = 200;
  let baseY = 190;

  const originalImageUrl = localStorage.getItem('image.png');
  if (originalImageUrl && originalImageUrl.includes('trial')) {
    baseX = 200;
    baseY = 220;
  }
  else if (page == "gesture"){
    baseX = 190;
    baseY = 170;
    // baseX = 230;
    // baseY = 230;
  }
  else{
    baseX = 230;
    baseY = 230;
  }



  useEffect(() => {
    // Initialize the Fabric.js canvas
    const fabricCanvas = new fabric.Canvas('fabric-canvas', {
      width: 800,
      height: 450,
      selection: false,
    });
    setCanvas(fabricCanvas);

    const initialDistance = 50;

    // Initialize and add two points on the canvas, positioned diagonally
    const point1 = new fabric.Circle({
      radius: 5,
      fill: 'white',
      left: baseX - initialDistance, // Starting X position for point1
      top: baseY + initialDistance,  // Starting Y position for point1
      selectable: false,
    });

    const point2 = new fabric.Circle({
      radius: 5,
      fill: 'white',
      left: baseX + initialDistance, // Starting X position for point2
      top: baseY - initialDistance,  // Starting Y position for point2
      selectable: false,
    });


    setPoints([point1, point2]);
    


    return () => fabricCanvas.dispose(); // Cleanup
  }, []);

  useEffect(() => {

    // Adjust the positions of the points based on the resize factor, diagonally
    if (canvas && points) {

      const [point1, point2] = points;
      const baseDistance = 50; // Base distance between points

      const newDistance = baseDistance * resizeFactor;

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

  // Only re-run the effect if 'canvas' changes
  useEffect(() => {
    // Adjust the positions of the points based on the resize factor
    if (canvas && points) {
      const [point1, point2] = points;
      const midX = canvas.width / 2;
      const spacing = 300 * resizeFactor; // Change 300 to your desired base spacing

      point1.set({ left: midX - (spacing / 2) });
      point2.set({ left: midX + (spacing / 2) });

      
      setPointsHistory([[...canvas.getObjects()]]);

      canvas.renderAll();
    }
  }, [resizeFactor, canvas, points]);

  useEffect(() => {
    if (canvas) {
      // Handler for capturing zoom factor from mouse wheel event
      const handleWheel = (event) => {
        // Prevent the canvas from zooming
        event.preventDefault();
        event.stopPropagation();
  
        // Calculate the zoom factor
        var delta = event.deltaY;
        var scaleFactor = Math.pow(0.999, delta);
        var newResizeFactor = resizeFactor * scaleFactor;
  
        // Clamp the new zoom factor to the range [0, 1.5]
        newResizeFactor = Math.max(0, Math.min(newResizeFactor, 1));
  
        // Update the resize factor state without zooming the canvas
        setResizeFactor(newResizeFactor);
        const [point1, point2] = points;
        canvas.add(point1, point2);
        setPointsArray(prevPoints => [
          ...prevPoints,
          { x1: point1.left, y1: point1.top, x2: point2.left, y2: point2.top }
        ]);
      }
      // Add the wheel event listener
      const canvasWrapper = canvas.wrapperEl;
      canvasWrapper.addEventListener('wheel', handleWheel);
  
      // Clean up the event listener when the component is unmounted or the canvas is changed
      return () => {
        canvasWrapper.removeEventListener('wheel', handleWheel);
      };
    }
  }, [canvas, resizeFactor]); // Rerun the effect if 'canvas' or 'zoomFactor' changes
  
  const saveAnnotatedImage = async () => {
    localStorage.setItem('resize_points', JSON.stringify(pointsArray));

    setSaveButtonStyle({ ...buttonStyle, backgroundColor: '#388E3C' });

    if (canvas) {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1.0,
      });

      const img_name2 = 'resize_image_' + datetime + '.png'
      localStorage.setItem('resize_image',"http://localhost:3001/uploads/" + img_name2)
      // Instead of downloading the image, upload it
      uploadImageToServer(dataUrl, img_name2);
    }
    console.log("Saved resize")
    console.log(resizeFactor)
    localStorage.setItem('resize_scale', resizeFactor.toString());
    localStorage.setItem('resizeDone', true)
    localStorage.setItem('action', 'resize');
    localStorage.setItem('canvasType', 'Resize');
    localStorage.setItem('annotationDone', true);
    const page = localStorage.getItem('gesture_or_speech')
    if (page == "speech"){
      navigate('/text_speech');
    }
    else{
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

    setPointsHistory((currentHistory) => {
      if (currentHistory.length < 2) return currentHistory; // nothing to undo if no previous state
      const newHistory = currentHistory.slice(0, -1); // remove the last action
      const previousPoints = newHistory[newHistory.length - 1]; // get the previous state
  
      // Restore the previous points on the canvas
      canvas.remove(...canvas.getObjects()); // remove all objects
      previousPoints.forEach(point => canvas.add(point)); // add previous points back
      setPoints(previousPoints);
      return newHistory; // update the history
    });
  };
  

  const goBackToChat = () => {
      localStorage.setItem('resize_points', JSON.stringify(pointsArray));
      localStorage.setItem('annotationDone', true);
      const page = localStorage.getItem('gesture_or_speech')
      if (page == "speech"){
        navigate('/text_speech');
      }
      else{
        navigate('/text_gesture');
      }

  };

  return (
    <div style={{ alignItems: 'center',maxWidth: '100%',maxHeight: '100%', marginTop: '20px', marginLeft: '20px'}}>
      <h1 style={{ marginBottom: '10px' , color: 'white', fontSize: '20px' }}>Zoom In to make it smaller or Zoom out to make it larger</h1>

      <canvas id="fabric-canvas" style={{ width: '100%', height: '100%', cursor: 'zoom-in'}} />

      {/* <div style={{ position: 'absolute', top: 20, right: 150 }}>
        Resize Value: {resizeFactor.toFixed(1)}
      </div> */}

      <div style={{ display: 'flex', justifyContent: 'center' }}>


      </div>
      {/* <div style={{ display: 'flex'}}>
      <h1 style={{marginTop: '5px'}}>Undo</h1>
    <MdUndo size={24} onClick={handleUndo} color="white" style={{ cursor: 'pointer', transition: 'color 0.3s ease',marginTop: '5px', marginBottom: '10px', marginRight: '20px', marginLeft: '5px' }} />
    </div> */}
      <div style={{ display: 'flex' , marginTop: '10px'}}>
          <button onClick={handleUndo} style={undoButtonStyle}>
              <MdUndo size={24} color="white" style={{ marginRight: '5px' }} />
              <span>Undo</span>
          </button> 
          <button onClick={saveAnnotatedImage} style={saveButtonStyle}>
          <MdSave size={20} color="white" style={{ marginRight: '5px' }} />
        <span>Save</span>
          </button> 
        {/* <button onClick={goBackToChat} style={{ ...buttonStyle, marginLeft: '10px' }}>
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


export default ResizeCanvas;
