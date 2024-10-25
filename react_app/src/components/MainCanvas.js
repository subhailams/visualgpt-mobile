import React, { useState, useEffect } from "react";

import AnnotationCanvas from './AnnotationCanvas';
import DragCanvas from './DragCanvas_mobile';
import ResizeCanvas from './ResizeCanvas_mobile';
import { useNavigate } from "react-router-dom";

const sharedButtonStyle = {
  marginTop: '40px',
  marginLeft: '60px',
  padding: '10px 20px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  margin: '10px',
};

const MainCanvas = () => {
  const [canvasType, setCanvasType] = useState('Annotation');
  const [activeButton, setActiveButton] = useState('Annotation');
  const navigate = useNavigate();

  let dragStart = null;
  const dragThreshold = 10; // Threshold distance to differentiate between click and drag
  let initialTouchDistance = null; // For pinch zoom detection on mobile

  const switchCanvasType = (type) => {
    setCanvasType(type);
    setActiveButton(type);
    localStorage.setItem('canvasType', type);
    if (type === "Annotation") {
      navigate('annotate');
    } else if (type === "Drag") {
      navigate('drag');
    }
  };

  const getButtonStyle = (type) => ({
    ...sharedButtonStyle,
    backgroundColor: activeButton === type ? '#388E3C' : '#808080',
  });

  useEffect(() => {
    // Mouse-based Drag handling for switching to DragCanvas
    const handleMouseDown = (event) => {
      dragStart = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = (event) => {
      if (!dragStart) return; // If dragStart is null, exit

      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Switch to DragCanvas only if the distance exceeds the threshold and we're not in Annotation mode
      if (distance >= dragThreshold && canvasType !== 'Annotation') {
        setCanvasType('Drag');
      }
      dragStart = null; // Reset drag start position
    };

    // Handle pinch-to-zoom gesture to switch to ResizeCanvas for mobile devices
    const handleTouchStart = (event) => {
      if (event.touches.length === 2) {
        // Two-finger touch for detecting pinch zoom start
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
        event.preventDefault();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        // Switch to ResizeCanvas if the distance changes significantly
        if (Math.abs(currentDistance - initialTouchDistance) > dragThreshold) {
          setCanvasType('Resize');
          initialTouchDistance = currentDistance; // Update distance for next comparison
        }
      }
    };

    const handleTouchEnd = () => {
      initialTouchDistance = null; // Reset pinch zoom detection
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasType]); // Adding canvasType as a dependency

  return (
    <div>
      <button onClick={() => switchCanvasType('Annotation')} style={getButtonStyle('Annotation')}>Painting</button>
      <button onClick={() => switchCanvasType('Drag')} style={getButtonStyle('Drag')}>Gesture</button>
      {canvasType === 'Annotation' && <AnnotationCanvas />}
      {canvasType === 'Drag' && <DragCanvas />}
      {canvasType === 'Resize' && <ResizeCanvas />}
    </div>
  );
};

export default MainCanvas;
