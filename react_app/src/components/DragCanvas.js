import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { MdUndo, MdSave } from "react-icons/md";

const DragCanvas = () => {
  const navigate = useNavigate();
  const [circleCoordinates, setcircleCoordinates] = useState({ cx: 410, cy: 170, r: 5 });

  const [dragInfo, setDragInfo] = useState({
    drag1: { start: null, end: null },
    drag2: { start: null, end: null },
    action: 'move' // 'move' or 'remove'
  });
  const [fetchedImage, setFetchedImage] = useState('');
  const imageRef = useRef();
  const [resizeFactor, setResizeFactor] = useState(1);
  const [undoButtonStyle, setundoButtonStyle] = useState(undobuttonStyle);

  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const [history, setHistory] = useState([]);
  const [tempEndCoords1, setTempEndCoords1] = useState(null);
  const [tempEndCoords2, setTempEndCoords2] = useState(null);
  const [dragPoints1, setDragPoints1] = useState([]);
  // const [dragPoints2, setDragPoints2] = useState([]);


  useEffect(() => {
    const originalImageUrl = localStorage.getItem('image.png');
    console.log(originalImageUrl);
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

  const actualWidth = 800;
  const actualHeight = 450;
  
  const adjustCoordinates = (coordinates) => {
    const adjustedX = (coordinates.x / (imageRef.current?.clientWidth ?? 1)) * actualWidth;
    const adjustedY = (coordinates.y / (imageRef.current?.clientHeight ?? 1)) * actualHeight;
    return { x: adjustedX, y: adjustedY };
  };
  const dragTimeoutDuration = 100; // Time in milliseconds to wait for a second drag
  let dragTimeout;



  const bind = useDrag((state) => {
    const { down, initial, xy, last } = state;
    const imageRect = imageRef.current?.getBoundingClientRect();

    const startX = initial[0] - imageRect.left;
    const startY = initial[1] - imageRect.top;
    const startCoords = adjustCoordinates({ x: startX, y: startY });
  
    const endX = xy[0] - imageRect.left;
    const endY = xy[1] - imageRect.top;
    setDragPoints1([{ x: startX, y: startY}]);
    const currentCoords = adjustCoordinates({ x: endX, y: endY });
    // When the user starts dragging
    if (down) {
      const startX = initial[0] - imageRect.left;
      const startY = initial[1] - imageRect.top;
      const startCoords = adjustCoordinates({ x: startX, y: startY });
      setTempEndCoords1(currentCoords);

      // Start tracking drag1 if it hasn't started yet
      if (!dragInfo.drag1.start && !dragInfo.drag1.end) {
        setDragInfo(prev => ({ ...prev, drag1: { start: startCoords, end: null }, action: 'move' }));
        setDragPoints1(prevPoints => [...prevPoints, { x: startX, y: startY }]);
      } 
      // Once drag1 is finished, start tracking drag2
      else if (dragInfo.drag1.end && !dragInfo.drag2.end) {
        setTempEndCoords2(currentCoords);

        setDragInfo(prev => ({ ...prev, drag2: { start: startCoords, end: null }, action: 'remove' }));
        setDragPoints1(prevPoints => [...prevPoints, { x: startX, y: startY }]);


      }
    }

    else{
      if (!dragInfo.drag1.end) {
        setTempEndCoords1(null);
      }
      if (!dragInfo.drag2.end) {
        setTempEndCoords2(null);
      }
    }

    // When the user stops dragging
    if (last) {

      // Finish tracking drag1 if it's in progress
      if (dragInfo.drag1.start && !dragInfo.drag1.end) {
        setDragInfo(prev => ({ ...prev, drag1: { ...prev.drag1, start: prev.drag1.start, end: currentCoords } }));
        setTempEndCoords1(null);
        setDragPoints1(prevPoints => [...prevPoints, { x: endX, y: endY }]);
      } 
      // Finish tracking drag2 if it's in progress
      else if (dragInfo.drag2.start && !dragInfo.drag2.end) {
        setDragInfo(prev => ({ ...prev, drag2: { ...prev.drag2, start: prev.drag2.start, end: currentCoords }, action: 'remove' }));
        setTempEndCoords2(null);
        setDragPoints1(prevPoints => [...prevPoints, { x: endX, y: endY }]);


      }
    }
  });
  


  useEffect(() => {
    if (dragInfo.action === 'move' && dragInfo.drag1.end) {
      console.log(`Move action: Drag started at (${dragInfo.drag1.start.x}, ${dragInfo.drag1.start.y}) and ended at (${dragInfo.drag1.end.x}, ${dragInfo.drag1.end.y})`);
      const movePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y}`;
      localStorage.setItem('move_selected_points', movePointsString);

      const serializedPoints = JSON.stringify(dragPoints1);
      localStorage.setItem('gesture_points', movePointsString);
  
      // Only reset drag2 to avoid unnecessary re-render
      // if (dragInfo.drag2.start !== null || dragInfo.drag2.end !== null) {
      //   setDragInfo(current => ({ ...current, drag2: { start: null, end: null } }));
      // }
    } else if (dragInfo.action === 'remove' && dragInfo.drag2.end) {
      console.log(`Remove action: First drag started at (${dragInfo.drag1.start.x}, ${dragInfo.drag1.start.y}) and ended at (${dragInfo.drag1.end.x}, ${dragInfo.drag1.end.y})`);
      console.log(`Remove action: Second drag started at (${dragInfo.drag2.start.x}, ${dragInfo.drag2.start.y}) and ended at (${dragInfo.drag2.end.x}, ${dragInfo.drag2.end.y})`);
      const removePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y} ${dragInfo.drag2.start.x} ${dragInfo.drag2.start.y} ${dragInfo.drag2.end.x} ${dragInfo.drag2.end.y}`;
      localStorage.setItem('remove_selected_points', removePointsString);
      const serializedPoints = JSON.stringify(dragPoints1);
      localStorage.setItem('gesture_points', removePointsString);
    }
  }, [dragInfo]);
  
  const renderDragLine = () => {
    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
        {dragInfo.drag1.start && (dragInfo.drag1.end || tempEndCoords1) && (
          // Line for the first drag action (move)
          <line
            x1={dragInfo.drag1.start.x}
            y1={dragInfo.drag1.start.y}
            x2={(dragInfo.drag1.end || tempEndCoords1).x}
            y2={(dragInfo.drag1.end || tempEndCoords1).y}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
        {dragInfo.drag2.start && (dragInfo.drag2.end || tempEndCoords2) && (
          // Line for the second drag action (remove)
          <line
            x1={dragInfo.drag2.start.x}
            y1={dragInfo.drag2.start.y}
            x2={(dragInfo.drag2.end || tempEndCoords2).x}
            y2={(dragInfo.drag2.end || tempEndCoords2).y}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
      </svg>
    );
  };
  
  
  useEffect(() => {
    setHistory(prev => [...prev, dragInfo]);
  }, [dragInfo]);



  const handleSave = async () => {
    setSaveButtonStyle({ ...buttonStyle, backgroundColor: '#388E3C' });
    const canvas = document.createElement('canvas');
    canvas.width = imageRef.current.clientWidth;
    canvas.height = imageRef.current.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2; // Adjust the line width as needed
    ctx.setLineDash([5, 5]);
  
    // Draw the image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
  
    // Draw the line for the first drag action
    if (dragInfo.drag1.start && dragInfo.drag1.end) {
      ctx.beginPath();
      ctx.moveTo(dragInfo.drag1.start.x, dragInfo.drag1.start.y);
      ctx.lineTo(dragInfo.drag1.end.x, dragInfo.drag1.end.y);
      ctx.stroke();
    }
  
    // Draw the line for the second drag action (remove action)
    if (dragInfo.drag2.start && dragInfo.drag2.end) {
      ctx.beginPath();
      ctx.moveTo(dragInfo.drag2.start.x, dragInfo.drag2.start.y);
      ctx.lineTo(dragInfo.drag2.end.x, dragInfo.drag2.end.y);
      ctx.stroke();
    }
  
    // Convert canvas to data URL and upload
    const dataUrl = canvas.toDataURL('image/png');
    
    const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' CDT');
    // Logic to determine what action to save based on the drag information
    if (dragInfo.drag1.start && dragInfo.drag1.end &&  !dragInfo.drag2.end) {
      // Save as a move action if only the first drag is completed
      const movePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y}`;
      localStorage.setItem('action', 'move');
      localStorage.setItem('move_points', movePointsString);
      console.log('Move action saved:', movePointsString);
      

      const img_name = 'image_with_one_line_' + datetime + '.png';
      localStorage.setItem('img_one', "http://localhost:3001/uploads/"+ img_name)
      uploadImageToServer(dataUrl, img_name);
      await sleep(300);
    } else if (dragInfo.drag2.start && dragInfo.drag2.end) {
      // Save as a remove action if both drags are completed
      const removePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y} ${dragInfo.drag2.start.x} ${dragInfo.drag2.start.y} ${dragInfo.drag2.end.x} ${dragInfo.drag2.end.y}`;
      localStorage.setItem('action', 'remove');
      localStorage.setItem('remove_points', removePointsString);
      console.log('Remove action saved:', removePointsString);
      
      const img_name2 = 'image_with_two_lines_' + datetime + '.png'
      localStorage.setItem('img_two', "http://localhost:3001/uploads/"+img_name2)

      uploadImageToServer(dataUrl, img_name2);

    } else {  
      console.log('No valid action to save.');
    }

    localStorage.setItem('annotationDone', true);
    // localStorage.setItem('generationDone', false);
    const page = localStorage.getItem('gesture_or_speech')
      if (page == "speech"){
        navigate('/text_speech');
      }
      else{
        navigate('/text_gesture');
      }
  };
  
  
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
    localStorage.setItem('annotationDone', true);
    // localStorage.setItem('generationDone', false);
    const page = localStorage.getItem('gesture_or_speech')
      if (page == "speech"){
        navigate('/text_speech');
      }
      else{
        navigate('/text_gesture');
      }
  };


  const handleUndo = () => {

    setHistory((currentHistory) => {
      if (currentHistory.length < 2) return currentHistory; // nothing to undo if no previous state
      const newHistory = currentHistory.slice(0, -1); // remove the last action
      const prevState = newHistory[newHistory.length - 1]; // get the previous state
      setDragInfo(prev => ({ ...prev, drag1: { start: null, end: null }, action: 'null' }));
      setDragInfo(prev => ({ ...prev, drag2: { start: null, end: null }, action: 'null' }));
        return newHistory; // update the history
    });
  };


  const onImageLoad = () => {
    console.log('Image loaded with dimensions:', imageRef.current?.clientWidth, imageRef.current?.clientHeight);
    let circleX = 410;
  let circleY = 240;

  const originalImageUrl = localStorage.getItem('image.png');
  console.log(originalImageUrl);
  const page = localStorage.getItem('gesture_or_speech');
  if (originalImageUrl && originalImageUrl.includes('trial')) {
    circleX = 410;
    circleY = 240;
  }
  else if (page == "gesture"){
    circleX = 410;
    circleY = 180;
    // circleX = 397;
    // circleY = 250;
  }
  else{
    circleX = 411;
    circleY = 245;
  }
  
  setcircleCoordinates({ cx: circleX, cy: circleY, r: 5 });

  };

  return (
    <div style={{ alignItems: 'center',maxWidth: '100%',maxHeight: '100%', marginTop: '20px', marginLeft: '20px'}}>
      <h1 style={{ marginBottom: '10px' , color: 'white', fontSize: '20px'}}>Please follow the gesture instructions</h1>
      <div {...bind()} style={{
            display: 'inline-block',
            cursor: 'pointer',
            position: 'relative',
            justifyContent: 'center',
            userSelect: 'none', 
            outline: 'none',
            maxHeight: '100%',
            maxHeight: '100%'
          }}>
        
        <img
          ref={imageRef}
          src={fetchedImage}
          onLoad={onImageLoad}
          alt="Draggable"
          style={{
            maxWidth: '100%', // Prevents the image from exceeding the width of its container
            maxHeight: '100%', // Optional: you can set a maxHeight if you want to limit how tall the image can be
            pointerEvents: 'none',
            userSelect: 'none',
            outline: 'none'
          }}
        />
          <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
          {/* Red circle at coordinates (190, 170) */}

          {/* <circle {...circleCoordinates} fill="white" /> */}
        </svg>
         {renderDragLine()}
      </div>
     
  

      <div style={{ display: 'flex'}}>
          <button onClick={handleUndo} style={undoButtonStyle}>
              <MdUndo size={24} color="white" style={{ marginRight: '5px' }} />
              <span>Undo</span>
          </button> 
          <button onClick={handleSave} style={saveButtonStyle}>
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

export default DragCanvas;
