import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { MdUndo, MdSave } from "react-icons/md";

const DragCanvas = () => {
  const navigate = useNavigate();
  const imageRef = useRef();
  const [dragInfo, setDragInfo] = useState({
    drag1: { start: null, end: null },
    drag2: { start: null, end: null },
    action: 'move'
  });
  const [fetchedImage, setFetchedImage] = useState('');
  const [tempEndCoords1, setTempEndCoords1] = useState(null);
  const [tempEndCoords2, setTempEndCoords2] = useState(null);
  const [undoButtonStyle, setundoButtonStyle] = useState(undobuttonStyle);
  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const [history, setHistory] = useState([]);

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
    }
  }, []);

  const adjustCoordinates = (coordinates) => {
    const imageRect = imageRef.current.getBoundingClientRect();
    const adjustedX = (coordinates.x - imageRect.left) / (imageRect.width) * 800;
    const adjustedY = (coordinates.y - imageRect.top) / (imageRect.height) * 450;
    return { x: adjustedX, y: adjustedY };
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startCoords = adjustCoordinates({ x: touch.pageX, y: touch.pageY });
    if (dragInfo.action === 'move') {
      setDragInfo(prev => ({
        ...prev,
        drag1: { start: startCoords, end: startCoords }
      }));
    } else if (dragInfo.action === 'remove' && !dragInfo.drag1.end) {
      // Begin a new line for removal if previous move line is complete
      setDragInfo(prev => ({
        ...prev,
        drag2: { start: startCoords, end: startCoords }
      }));
    }
  };
 
  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const moveCoords = adjustCoordinates({ x: touch.pageX, y: touch.pageY });
    if (dragInfo.action === 'move') {
      setTempEndCoords1(moveCoords);
      setDragInfo(prev => ({
        ...prev,
        drag1: { ...prev.drag1, end: moveCoords }
      }));
    } else if (dragInfo.action === 'remove') {
      setTempEndCoords2(moveCoords);
      setDragInfo(prev => ({
        ...prev,
        drag2: { ...prev.drag2, end: moveCoords }
      }));
    }
  };
 
  const handleTouchEnd = () => {
    if (dragInfo.action === 'move') {
      setDragInfo(prev => ({
        ...prev,
        drag1: { ...prev.drag1, end: tempEndCoords1 }
      }));
    } else if (dragInfo.action === 'remove') {
      setDragInfo(prev => ({
        ...prev,
        drag2: { ...prev.drag2, end: tempEndCoords2 }
      }));
    }
  };
  const renderDragLine = () => {
    const lines = [];
    if (dragInfo.drag1.start && dragInfo.drag1.end) {
      lines.push(
        <line
          key="line1"
          x1={dragInfo.drag1.start.x}
          y1={dragInfo.drag1.start.y}
          x2={dragInfo.drag1.end.x}
          y2={dragInfo.drag1.end.y}
          stroke="white"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      );
    }
    if (dragInfo.drag2.start && dragInfo.drag2.end) {
      lines.push(
        <line
          key="line2"
          x1={dragInfo.drag2.start.x}
          y1={dragInfo.drag2.start.y}
          x2={dragInfo.drag2.end.x}
          y2={dragInfo.drag2.end.y}
          stroke="white" // Different color for the second line
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      );
    }
    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
        {lines}
      </svg>
    );
  };





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


  return (
    <div style={{ alignItems: 'center', maxWidth: '100%', maxHeight: '100%', marginTop: '20px', marginLeft: '20px'}}>
      <h1 style={{ marginBottom: '10px', color: 'white', fontSize: '20px'}}>Please follow the gesture instructions</h1>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'inline-block',
          cursor: 'pointer',
          position: 'relative',
          justifyContent: 'center',
          userSelect: 'none',
          outline: 'none',
          maxWidth: '100%',
          maxHeight: '100%'
        }}>
        <img
          ref={imageRef}
          src={fetchedImage}
          alt="Draggable"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            pointerEvents: 'none',
            userSelect: 'none',
            outline: 'none'
          }}
        />
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
  padding: '10px 20px',
  backgroundColor: '#808080',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center'
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
  alignItems: 'center'
};

export default DragCanvas;
