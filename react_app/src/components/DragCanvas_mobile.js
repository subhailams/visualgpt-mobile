import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { MdUndo, MdSave } from "react-icons/md";

const DragCanvas = () => {
  const navigate = useNavigate();
  const imageRef = useRef();
  const [dragInfo, setDragInfo] = useState([]); // Store an array of drag actions
  const [isDrawing, setIsDrawing] = useState(false); // Track if the user is drawing
  const [undoButtonStyle, setUndoButtonStyle] = useState(undobuttonStyle);
  const [saveButtonStyle, setSaveButtonStyle] = useState(buttonStyle);
  const [fetchedImage, setFetchedImage] = useState('');

  // Load the image from localStorage
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
        .catch(e => console.error('Error fetching the image through proxy:', e));
    }
  }, []);

  // Adjust coordinates based on image size
  const adjustCoordinates = (coordinates) => {
    const imageRect = imageRef.current.getBoundingClientRect();
    const adjustedX = ((coordinates.x - imageRect.left) / imageRect.width) * 800;
    const adjustedY = ((coordinates.y - imageRect.top) / imageRect.height) * 450;
    return { x: adjustedX, y: adjustedY };
  };

  // Handle the start of a drag action
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const startCoords = adjustCoordinates({ x: touch.pageX, y: touch.pageY });
    setIsDrawing(true); // Mark that a drawing is in progress

    // Add a new line with start coordinates
    setDragInfo((prev) => [...prev, { start: startCoords, end: startCoords }]);
  };

  // Handle the movement during the drag action
  const handleTouchMove = (e) => {
    if (!isDrawing) return; // Exit if no drawing is in progress
    e.preventDefault(); // Prevent scrolling behavior

    const touch = e.touches[0];
    const moveCoords = adjustCoordinates({ x: touch.pageX, y: touch.pageY });

    // Update the end coordinates of the latest drag action
    setDragInfo((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].end = moveCoords; // Update the last line
      return updated;
    });
  };

  // Handle the end of a drag action
  const handleTouchEnd = () => {
    setIsDrawing(false); // Mark that drawing has ended
    console.log("Lines:", dragInfo); // Log the current lines for debugging
  };

  // Render all lines on the canvas
  const renderDragLines = () => (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    >
      {dragInfo.map((drag, index) => (
        <line
          key={index}
          x1={drag.start.x}
          y1={drag.start.y}
          x2={drag.end.x}
          y2={drag.end.y}
          stroke="white"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      ))}
    </svg>
  );

  const handleSave = async () => {
    setSaveButtonStyle({ ...buttonStyle, backgroundColor: '#388E3C' });
  
    const canvas = document.createElement('canvas');
    canvas.width = imageRef.current.clientWidth;
    canvas.height = imageRef.current.clientHeight;
    const ctx = canvas.getContext('2d');
  
    // Set the stroke style for lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
  
    // Draw the image on the canvas
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
  
    // Draw all lines from dragInfo on the canvas
    dragInfo.forEach((drag) => {
      if (drag.start && drag.end) {
        ctx.beginPath();
        ctx.moveTo(drag.start.x, drag.start.y);
        ctx.lineTo(drag.end.x, drag.end.y);
        ctx.stroke();
      }
    });
  
    const dataUrl = canvas.toDataURL('image/png');
    const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000))
      .toISOString()
      .replace('Z', ' CDT');
  
    // Determine the action based on the number of lines
    if (dragInfo.length === 1) {
      // Save as a "move" action if only one line is drawn
      const movePointsString = `${dragInfo[0].start.x} ${dragInfo[0].start.y} ${dragInfo[0].end.x} ${dragInfo[0].end.y}`;
      localStorage.setItem('action', 'move');
      localStorage.setItem('move_points', movePointsString);
      console.log('Move action saved:', movePointsString);
  
      const img_name = 'image_with_one_line_' + datetime + '.png';
      localStorage.setItem('img_one', "http://localhost:3001/uploads/" + img_name);
      await uploadImageToServer(dataUrl, img_name);
    } else if (dragInfo.length >= 2) {
      // Save as a "remove" action if two or more lines are drawn
      const removePointsString = dragInfo
        .map(
          (drag) =>
            `${drag.start.x} ${drag.start.y} ${drag.end.x} ${drag.end.y}`
        )
        .join(' ');
  
      localStorage.setItem('action', 'remove');
      localStorage.setItem('remove_points', removePointsString);
      console.log('Remove action saved:', removePointsString);
  
      const img_name2 = 'image_with_two_lines_' + datetime + '.png';
      localStorage.setItem('img_two', "http://localhost:3001/uploads/" + img_name2);
      await uploadImageToServer(dataUrl, img_name2);
    }
  
    localStorage.setItem('annotationDone', true);
    const page = localStorage.getItem('gesture_or_speech');
    navigate(page === 'speech' ? '/text_speech' : '/text_gesture');
  };
  
  // Upload the image to the server
  const uploadImageToServer = async (imageDataUrl, filename) => {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('image', blob, filename);

    try {
      const uploadResponse = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const data = await uploadResponse.json();
      console.log(`${filename} saved on server:`, data.imagePath);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Handle undo action to remove the last drawn line
  const handleUndo = () => {
    setDragInfo((prev) => {
      if (prev.length === 0) return prev; // Nothing to undo
      const updated = prev.slice(0, -1); // Remove the last line
      console.log("Line removed. Remaining lines:", updated);
      return updated;
    });
  };

  return (
    <div style={{ alignItems: 'center', marginTop: '20px', marginLeft: '20px' }}>
      <h1 style={{ marginBottom: '10px', color: 'white', fontSize: '20px' }}>
        Please follow the gesture instructions
      </h1>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'inline-block',
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <img
          ref={imageRef}
          src={fetchedImage}
          alt="Draggable"
          style={{ maxWidth: '100%', maxHeight: '100%', pointerEvents: 'none' }}
        />
        {renderDragLines()}
      </div>

      <div style={{ display: 'flex' }}>
        <button onClick={handleUndo} style={undoButtonStyle}>
          <MdUndo size={24} style={{ marginRight: '5px' }} />
          Undo
        </button>
        <button onClick={handleSave} style={saveButtonStyle}>
          <MdSave size={20} style={{ marginRight: '5px' }} />
          Save
        </button>
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
