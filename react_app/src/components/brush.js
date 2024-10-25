import React, { useState, useEffect } from 'react';

function SimpleSketch() {
  const [brushSize, setBrushSize] = useState(5);
  let isDrawing = false; 


  useEffect(() => {
    const adjustCanvasSize = () => {
      const canvas = document.querySelector('canvas');
      // test1
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    adjustCanvasSize(); 

   
    window.addEventListener('resize', adjustCanvasSize);


 
    return () => window.removeEventListener('resize', adjustCanvasSize);
  }, []);

 
  function handleMouseDown(e) {


    const canvas = document.querySelector('canvas');
    if (canvas.getContext) {
      const ctx = canvas.getContext('2d');

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      isDrawing = true;
      ctx.beginPath();

      ctx.moveTo(e.clientX, e.clientY);
    }
  }

  function handleMouseMove(e) {
    if (!isDrawing) return;
    const canvas = document.querySelector('canvas');


    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  }


  function handleMouseUp() {
    isDrawing = false;
  }





  function handleBrushSizeChange(e) {
    setBrushSize(e.target.value);
  }

  return (
    <div>
      <label htmlFor="brush-size-slider">Brush Size: </label>
      <input
        id="brush-size-slider"
        type="range"
        min="1"
        max="50"
        value={brushSize}
        onChange={handleBrushSizeChange}
      />
      <canvas
        onMouseDown={handleMouseDown}

        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseUp} 

        style={{ display: 'block', margin: '0', padding: '0', background: '#ddd' }} 
      />
    </div>
  );
}

export default SimpleSketch;