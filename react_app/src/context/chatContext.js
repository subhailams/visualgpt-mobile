import { createContext } from 'react';
import React, { useRef, useState, useEffect } from "react";

import useMessageCollection from '../hooks/useMessageCollection';

/**
 * ChatContext is a context object that is used to share collection of messages
 * between components
 */
const ChatContext = createContext({});

/**
 * ChatContextProvider is a functional component that serves as a provider for the ChatContext.
 * It provides the ChatContext to the components within its subtree.
 *
 * @param {Object} props - The properties passed to the component.
 * @returns {JSX.Element} A ChatContext.Provider element.
 */


const ChatContextProvider = (props) => {
  const [messages, setMessages, clearMessages] = useMessageCollection([]);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState(null);
  
  const fetchPredictions = async (prompt, userUploadedImage, maskImage) => {
    let prevPredictionOutput = null;
    if (predictions.length > 0) {
      const prevPrediction = predictions[predictions.length - 1];
      prevPredictionOutput = prevPrediction?.output ? prevPrediction.output[prevPrediction.output.length - 1] : null;
    }

    const body = {
      prompt: prompt,
      init_image: userUploadedImage || (maskImage ? prevPredictionOutput : null),
      mask: maskImage,
    };

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      let prediction = await response.json();

      if (response.status !== 201) {
        setError(prediction.detail);
        return;
      }

      setPredictions([...predictions, prediction]);

      while (prediction.status !== "succeeded" && prediction.status !== "failed") {
        await new Promise(resolve => setTimeout(resolve, 1000)); // sleep for 1 second
        const pollResponse = await fetch("/api/predictions/" + prediction.id);
        prediction = await pollResponse.json();
        if (pollResponse.status !== 200) {
          setError(prediction.detail);
          break;
        }
        setPredictions(currentPredictions => [...currentPredictions, prediction]);
      }
    } catch (error) {
      console.error('Error in fetchPredictions:', error);
      setError('An error occurred while submitting the prediction.');
    }
  };


  const contextValue = [
    messages,
    setMessages,
    clearMessages,
    predictions,
    setPredictions,
    error,
    setError,
    fetchPredictions
  ]

  return (
    <ChatContext.Provider value={contextValue}>
      {props.children}
    </ChatContext.Provider>
  );
};

export { ChatContext, ChatContextProvider };
