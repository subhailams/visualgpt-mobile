import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import * as markerjs2 from 'markerjs2';

const AnnotationPage = () => {
  const { imageUrl } = useParams(); // Assuming imageUrl is used or needed
  const imgRef = useRef(null);
  const [fetchedImage, setFetchedImage] = useState(null);
  const markerAreaRef = useRef(null); // Correctly defining markerAreaRef
  const navigate = useNavigate();

  const goBackToChat = () => {
    navigate(-1); // Navigate back to the previous route
  };


  
  useEffect(() => {
    const originalImageUrl = localStorage.getItem('original-image');
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


const initializeMarkerJS = () => {
  if (imgRef.current) {
    markerAreaRef.current = new markerjs2.MarkerArea(imgRef.current);
    markerAreaRef.current.addEventListener('render', (event) => {
      if (imgRef.current) {
        imgRef.current.src = event.dataUrl;
      }
    });
    markerAreaRef.current.show();
  }
};


const saveAnnotatedImage = () => {
    if (markerAreaRef.current) {
      markerAreaRef.current.render().then((dataUrl) => {
        try {
          localStorage.setItem('annotated-image', dataUrl);
          alert('Annotated image saved to local storage');
          localStorage.removeItem('original-image'); // Optionally remove the original image
        } catch (e) {
          console.error('Storage failed: ', e);
          alert('Failed to save annotated image to local storage');
        }
      });
    } else {
      console.error('Marker area is not initialized');
    }
  };

  return (
    <div className="AnnotationPage">
      {fetchedImage && (
        <>
          <img
            ref={imgRef}
            src={fetchedImage}
            alt="Annotate"
            style={{ width: '80%', maxWidth: '80%', cursor: 'pointer' }}
            onClick={initializeMarkerJS}
          />
          <button
  onClick={saveAnnotatedImage}
  style={{
    marginTop: '10px',
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px'
  }}>
  Save Annotated Image

</button>
          <button onClick={goBackToChat} style={{
    marginTop: '10px',
    marginLeft: '10px',
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px'
  }}>
            Go Back to Chat
          </button>
        </>
      )}
    </div>
  );
};

export default AnnotationPage;
