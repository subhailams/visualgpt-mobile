import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';

const DragCanvas = () => {
  const navigate = useNavigate();
  const [dragInfo, setDragInfo] = useState({
    drag1: { start: null, end: null },
    drag2: { start: null, end: null },
    action: 'move' // 'move' or 'remove'
  });
  const [fetchedImage, setFetchedImage] = useState('');
  const imageRef = useRef();

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

  const actualWidth = 600;
  const actualHeight = 400;
  
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

    // When the user starts dragging
    if (down) {
      const startX = initial[0] - imageRect.left;
      const startY = initial[1] - imageRect.top;
      const startCoords = adjustCoordinates({ x: startX, y: startY });

      // Start tracking drag1 if it hasn't started yet
      if (!dragInfo.drag1.start && !dragInfo.drag1.end) {
        setDragInfo(prev => ({ ...prev, drag1: { start: startCoords, end: null }, action: 'move' }));
      } 
      // Once drag1 is finished, start tracking drag2
      else if (dragInfo.drag1.end && !dragInfo.drag2.start) {
        setDragInfo(prev => ({ ...prev, drag2: { start: startCoords, end: null }, action: 'remove' }));
      }
    }

    // When the user stops dragging
    if (last) {
      const endX = xy[0] - imageRect.left;
      const endY = xy[1] - imageRect.top;
      const endCoords = adjustCoordinates({ x: endX, y: endY });

      // Finish tracking drag1 if it's in progress
      if (dragInfo.drag1.start && !dragInfo.drag1.end) {
        setDragInfo(prev => ({ ...prev, drag1: { ...prev.drag1, start: prev.drag1.start, end: endCoords } }));
      } 
      // Finish tracking drag2 if it's in progress
      else if (dragInfo.drag2.start && !dragInfo.drag2.end) {
        setDragInfo(prev => ({ ...prev, drag2: { ...prev.drag2, start: prev.drag2.start, end: endCoords }, action: 'remove' }));
      }
    }
  });
  

  useEffect(() => {
    if (dragInfo.action === 'move' && dragInfo.drag1.end) {
      console.log(`Move action: Drag started at (${dragInfo.drag1.start.x}, ${dragInfo.drag1.start.y}) and ended at (${dragInfo.drag1.end.x}, ${dragInfo.drag1.end.y})`);
      const movePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y}`;
      localStorage.setItem('move_selected_points', movePointsString);
  
      // Only reset drag2 to avoid unnecessary re-render
      if (dragInfo.drag2.start !== null || dragInfo.drag2.end !== null) {
        setDragInfo(current => ({ ...current, drag2: { start: null, end: null } }));
      }
    } else if (dragInfo.action === 'remove' && dragInfo.drag2.end) {
      console.log(`Remove action: First drag started at (${dragInfo.drag1.start.x}, ${dragInfo.drag1.start.y}) and ended at (${dragInfo.drag1.end.x}, ${dragInfo.drag1.end.y})`);
      console.log(`Remove action: Second drag started at (${dragInfo.drag2.start.x}, ${dragInfo.drag2.start.y}) and ended at (${dragInfo.drag2.end.x}, ${dragInfo.drag2.end.y})`);
      const removePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y} ${dragInfo.drag2.start.x} ${dragInfo.drag2.start.y} ${dragInfo.drag2.end.x} ${dragInfo.drag2.end.y}`;
      localStorage.setItem('remove_selected_points', removePointsString);
  
    }
  }, [dragInfo]);
  
  const renderDragLine = () => {
    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
        {dragInfo.drag1.start && dragInfo.drag1.end && (
          // Line for the first drag action (move)
          <line
            x1={dragInfo.drag1.start.x}
            y1={dragInfo.drag1.start.y}
            x2={dragInfo.drag1.end.x}
            y2={dragInfo.drag1.end.y}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
        {dragInfo.drag2.start && dragInfo.drag2.end && (
          // Line for the second drag action (remove)
          <line
            x1={dragInfo.drag2.start.x}
            y1={dragInfo.drag2.start.y}
            x2={dragInfo.drag2.end.x}
            y2={dragInfo.drag2.end.y}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
      </svg>
    );
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
  

  const handleSave = async () => {
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
    await uploadImageToServer(dataUrl, 'image_with_lines.png');
  
    // Logic to determine what action to save based on the drag information
    if (dragInfo.drag1.end &&  !dragInfo.drag2.end) {
      // Save as a move action if only the first drag is completed
      const movePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y}`;
      localStorage.setItem('action', 'move');
      localStorage.setItem('move_points', movePointsString);
      console.log('Move action saved:', movePointsString);
    } else if (dragInfo.drag2.start && dragInfo.drag2.end) {
      // Save as a remove action if both drags are completed
      const removePointsString = `${dragInfo.drag1.start.x} ${dragInfo.drag1.start.y} ${dragInfo.drag1.end.x} ${dragInfo.drag1.end.y} ${dragInfo.drag2.start.x} ${dragInfo.drag2.start.y} ${dragInfo.drag2.end.x} ${dragInfo.drag2.end.y}`;
      localStorage.setItem('action', 'remove');
      localStorage.setItem('remove_points', removePointsString);
      console.log('Remove action saved:', removePointsString);
    } else {
      console.log('No valid action to save.');
    }
  };
  
  
  

  const goBackToChat = () => {
    localStorage.setItem('annotationDone', true);
    // localStorage.setItem('generationDone', false);

    navigate('/text_gesture');
  };

  const onImageLoad = () => {
    console.log('Image loaded with dimensions:', imageRef.current?.clientWidth, imageRef.current?.clientHeight);
  };

  return (
    <div style={{ alignItems: 'center',maxWidth: '100%',maxHeight: '100%', marginTop: '20px', marginLeft: '20px'}}>
      <h1 style={{ marginBottom: '1px' }}>Drag the object to move or Cross the object to remove</h1>
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
         {renderDragLine()}
      </div>
      
      <div style={{ display: 'flex' }}>
      <button onClick={handleSave} style={buttonStyle}>
      Save Gesture
    </button>
        <button onClick={goBackToChat} style={{ ...buttonStyle, marginLeft: '10px' }}>
          Go Back to Chat
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '10px 20px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px'
};

export default DragCanvas;
