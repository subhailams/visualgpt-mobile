import React from 'react';
import { useNavigate } from 'react-router-dom';

const Image = ({ url }) => {
  const navigate = useNavigate();

  const openAnnotationTool = () => {
    navigate(`/canvas`); // Encode the url
  };

  return (
    <div className='message__wrapper' onClick={openAnnotationTool}>
      <img
        className='message__img'
        src={url}
        alt='dalle generated'
        loading='lazy'
      />
    </div>
  );
};

export default Image;
