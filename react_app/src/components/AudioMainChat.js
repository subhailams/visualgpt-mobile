import React, { useState, useRef, useEffect, useContext } from 'react';
import Message from './GestureMessage';
import { ChatContext } from '../context/chatContext';
import Loading from './Loading';
import { MdSend } from 'react-icons/md';
// import { dalle } from '../utils/dalle';
import { OpenAIApi, Configuration } from 'openai';

/*
A chat view component that displays a list of messages and a form for sending new messages.
*/
const DragGestureMainChat = () => {
  const messagesEndRef = useRef();
  const inputRef = useRef();
  const defaultPrompt = 'Enter your message here';
  const [formValue, setFormValue] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const options = ['selection', 'gesture'];
  const [selected, setSelected] = useState(options[0]);
  const [messages, addMessage] = useContext(ChatContext);
  const [isannotationDone, setAnnotationDone] = useState(false);
  const [isresizeDone, setresizeDone] = useState(false);

  const [predictions, setPredictions] = useState([]);
  const [isgenerationDone, setGenerationDone] = useState(false);
  const [amIRecording, setAmIRecording] = useState(false); 
  const [thingThatRecords, setThingThatRecords] = useState(null); 
  const [finalAudioClip, setFinalAudioClip] = useState(null); 
  const [canSubmit, setCanSubmit] = useState(false); // Controls form submission
  const [prompt_speech, setPrompt] = useState("Enter your message here")
  const [file, setFile] = useState(null); // State to hold the selected file
  const [isClicked, setIsClicked] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);

  
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /*
  Scrolls the chat area to the bottom.
   */
  
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100); // Delay scrolling slightly to allow for layout adjustments
  };

  
  
  // Existing functions and effects

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      setFile(event.target.files[0]); // Set the selected file
      console.log('File selected:', file);
      uploadFile(file);
      
    }
  };

  const uploadFile = async (file) => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadEndpoint = 'http://localhost:3001/upload'; // Adjust if necessary
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      console.log('File uploaded:', data.imagePath);
      localStorage.setItem('image.png', data.imagePath); // Save the path for further use
      // alert('File uploaded successfully');

      setLoading(true);
      console.log("Loading initial image....")

      setGenerationDone(true);
      setLoading(false);
      const originalImageUrl = localStorage.getItem('image.png');
      updateMessage(originalImageUrl, true, selected, true);
      // updateMessage('Click image to provide gesture input',true, "filler", false);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };


  const handleFocus = (e) => {
    if (e.target.value === defaultPrompt) {
      setFormValue('');
      setIsFocused(true); // Set focused state to true
    }
  };

  const handleBlur = (e) => {
    if (!e.target.value) {
      setFormValue(defaultPrompt);
      setIsFocused(false); // Reset on blur if empty
    }
  };

  const handleChange = (e) => {
    setFormValue(e.target.value);
    if (!e.target.value) {
      setIsFocused(false);
    }
  };
    /**
   * Adds a new message to the chat.
   *
   * @param {string} newValue - The text of the new message.
   * @param {boolean} [ai=false] - Whether the message was sent by an AI or the user.
   */
  
  const updateMessage = (content, ai = false, selected, isImage = false) => {
    const id = Date.now() + Math.floor(Math.random() * 1000000);
    const newMsg = {
      id: id,
      createdAt: Date.now(),
      content,
      ai: ai,
      selected: `${selected}`,
      isImage,
    };

    addMessage(newMsg);
  };

  function parseDirection(inputValue) {

    const horizontalKeywords = ["left", "right"];
    const verticalKeywords = ["top", "bottom"];

    let horizontalDirection = horizontalKeywords.find(keyword => inputValue.includes(keyword));
    let verticalDirection = verticalKeywords.find(keyword => inputValue.includes(keyword));

    if (horizontalDirection && verticalDirection) {
        return `${verticalDirection} ${horizontalDirection}`; // Combines like "top left"
    } else if (horizontalDirection) {
        return horizontalDirection;
    } else if (verticalDirection) {
        return verticalDirection;
    }

    return null; // No direction found
};

  const handleKeyDown = (e) => {
    // Check if the Enter key is pressed
    if (e.key === 'Enter' && !e.shiftKey) { // `e.shiftKey` check allows multi-line input if Shift+Enter is pressed
      e.preventDefault(); // Prevent the default action to avoid form submission/line break
      sendMessage(e);
    }
  };


  async function urlToDataUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob(); // Convert the response to a Blob
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob); // Read the Blob as Data URL
    });
  }

  /**
   * Sends our prompt to our API and get response to our request from openai.
   *
   * @param {Event} e - The submit event of the form.
   */
  
  const sendMessage = async (e) => {
    e.preventDefault();
  
    const newMsg = formValue;
    const aiModel = selected;
  
    setLoading(true);
    setFormValue('');
    updateMessage(newMsg, false, aiModel);
    console.log(isannotationDone)

    setShowTextArea(false); // Hide the textarea after sending the message

    
    if (!isannotationDone) {
      // const generationDone = JSON.parse(localStorage.getItem('generationDone'));
 
    // try {
    //   setLoading(true);
    //   console.log("Generating....")

    //   setGenerationDone(true);
    //   setLoading(false);
    //   const originalImageUrl = localStorage.getItem('image.png');
    //   updateMessage(originalImageUrl, true, aiModel, true);

    // } catch (err) {
    //   window.alert(`Error: ${err.message} please try again later`);
    // }
    // setLoading(false);

    if (!amIRecording && isgenerationDone){

      const removeKeywords = ["remove"];
      const containsRemoveKeyword = removeKeywords.some(keyword => formValue.toLowerCase().includes(keyword));

      const movementKeywords = ["shift", "move", "relocate", "transfer", "adjust", "reposition", "location"];
      // Converts the form value to lowercase and checks if it includes any movement keywords
      const containsMovementKeyword = movementKeywords.some(keyword => formValue.toLowerCase().includes(keyword));
      
      const resizeKeywords = ["resize", "scale", "enlarge", "shrink", "expand", "reduce", "size", "bigger","big", "small", "smaller"];

      const containsResizeKeywords = resizeKeywords.some(keyword => formValue.toLowerCase().includes(keyword));
      
      if (containsRemoveKeyword){


        const originalImageUrl = localStorage.getItem('image.png');

        // Code to call the instruct api to get image url
          try {
            // Construct the request to the Express server which will forward it to Django
            const instructResponse = await fetch('http://localhost:3001/instruct', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
                prompt: formValue, // The user's input that will be used for processing
                modality: "text_speech_gesture"
              })
            });

            if (!instructResponse.ok) {
              throw new Error(`HTTP error! Status: ${instructResponse.status}`);
            }

            const instructData = await instructResponse.json();
            console.log(instructData)
            // Assuming instructData contains the URL to the processed image
            if (instructData) {
              // Update the chat with the new image
              console.log(instructData.image_url)
              // uploadImageToServer(instructData.image_url, 'image.png')
              localStorage.setItem('image.png', instructData.image_url);
              updateMessage(instructData.image_url, true, aiModel, true); // Update with the image path
              setLoading(false);
            }
          } catch (error) {
            console.error('Error calling instruct API:', error);
            setLoading(false);
            // Handle the error, maybe show a message to the user
          }
      }

      else if (containsMovementKeyword){
          const formValue_check = formValue; // Example, replace with actual form value
          const imageWidth = 800;
          const imageHeight = 415;
          let startPoint = {x: 409, y: 244};
          let endPoint = { x: 0, y: 0 };
          // let direction = null;

   

          const direction = parseDirection(formValue.toLowerCase());


          switch (direction) {
            case "top left":
              endPoint = { x: 70, y: 60 };
              break;
            case "top center":
              endPoint = { x: 400, y: 50 };
              break;
            case "top right":
              endPoint = { x: 680, y: 70 };
              break;
            case "left":
              endPoint = { x: 80, y: 260 };
              break;

            case "right":
              endPoint = { x: 690, y: 220 };

              break;
            case "bottom left":
              endPoint = { x: 100, y: 400 };
              break;
            case "bottom center":
              endPoint = { x: 412, y: 419 };
              break;
            case "bottom right":
              endPoint = { x: 740, y: 400 };
              break;
            default:
              console.error("Invalid direction");
          }

          console.log(`Move to:${startPoint.x} ${startPoint.y} ${endPoint.x} ${endPoint.y}`);

          console.log("Moving....")

          const originalImageUrl1 = localStorage.getItem('image.png');
          
          const maskurl1 = "http://localhost:3001/uploads/mask_modality1.png"
  
          // const selected_points1 = localStorage.getItem('move_points')
          let selected_points1 = `${startPoint.x} ${startPoint.y} ${endPoint.x} ${endPoint.y}`;
          const gesture_points = localStorage.getItem('gesture_points');
          setLoading(true)
          try {
            // Construct the request to the Express server which will forward it to Django
            const dragResponse = await fetch('http://localhost:3001/move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                image_url: originalImageUrl1, // Ensure this is the correct URL or path to the image
                mask_url: maskurl1,
                selected_points: selected_points1, // The user's input that will be used for processing
                prompt: "A photo of an apple",
                modality: "text_speech_gesture",
                gesture_points: gesture_points
              })
            });
  
            if (!dragResponse.ok) {
              throw new Error(`HTTP error! Status: ${dragResponse.status}`);
            }
  
            const inpaintData = await dragResponse.json();
            console.log("drag response: ",inpaintData)
            // Assuming inpaintData contains the URL to the processed image
            if (inpaintData) {
              // Update the chat with the new image
              console.log(inpaintData.image_url)
              // uploadImageToServer(inpaintData.image_url, 'image_new.png')
              localStorage.setItem('image.png', inpaintData.image_url);
              await sleep(100)
              updateMessage(inpaintData.image_url, true, selected, true); // Update with the image path
              setLoading(false);
              setGenerationDone(true);
            }
          } catch (error) {
            console.error('Error calling move API:', error);
            setLoading(false);
            
            // Handle the error, maybe show a message to the user
          }
  
      }

      else if(containsResizeKeywords){
            let resizeFactor = 1.0;
            const enlargeKeywords = ["enlarge", "expand", "increase", "bigger", "big"];
            const reduceKeywords = ["shrink", "reduce", "decrease", "smaller", "small"];
            const isEnlarge = enlargeKeywords.some(keyword => formValue.toLowerCase().includes(keyword));
            const isReduce = reduceKeywords.some(keyword => formValue.toLowerCase().includes(keyword));
              
            if (isEnlarge) { resizeFactor = 1.5; }
            else if (isReduce) { resizeFactor = 0.5; }

            console.log(`Resize factor: ${resizeFactor}`);

            const originalImageUrl = localStorage.getItem('image.png');
            const gesture_points = localStorage.getItem('gesture_points');
            
            const maskurl = "http://localhost:3001/uploads/mask_modality1.png"
            const resize_scale = resizeFactor
            const prompt = "A photo of an apple"
        
            console.log(originalImageUrl)
            console.log(maskurl)
            console.log(resize_scale)
        
            // Code to call the instruct api to get image url
              try {
                // Construct the request to the Express server which will forward it to Django
                const dragResponse = await fetch('http://localhost:3001/resize', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
                    mask_url: maskurl,
                    resize_scale: resize_scale, // The user's input that will be used for processing
                    prompt: prompt,
                    modality: "text_speech_gesture",
                    gesture_points: gesture_points
                  })
                });
        
                if (!dragResponse.ok) {
                  throw new Error(`HTTP error! Status: ${dragResponse.status}`);
                }
        
                const inpaintData = await dragResponse.json();
                console.log("drag response: ",inpaintData)
                // Assuming inpaintData contains the URL to the processed image
                if (inpaintData) {
                  // Update the chat with the new image
                  console.log(inpaintData.image_url)
                  // uploadImageToServer(inpaintData.image_url, 'image_new.png')
                  localStorage.setItem('image.png', inpaintData.image_url);
                  await sleep(100)
                  updateMessage(inpaintData.image_url, true, selected, true); // Update with the image path
                  setLoading(false);
                  // setAnnotationDone(false);
                  setGenerationDone(true);
                }
              } catch (error) {
                console.error('Error calling inpaint API:', error);
                setLoading(false);
                // Handle the error, maybe show a message to the user
              }

      }

      else{

      console.log("Instructing....")

      const originalImageUrl = localStorage.getItem('image.png');

      // Code to call the instruct api to get image url
        try {
            // Construct the request to the Express server which will forward it to Django
            const instructResponse = await fetch('http://localhost:3001/instruct', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              
              body: JSON.stringify({
                image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
                prompt: formValue, // The user's input that will be used for processing
                modality: "text_speech_gesture"
              })
            });

            if (!instructResponse.ok) {
              throw new Error(`HTTP error! Status: ${instructResponse.status}`);
            }

          const instructData = await instructResponse.json();
          console.log(instructData)
          // Assuming instructData contains the URL to the processed image
          if (instructData) {
            // Update the chat with the new image
            console.log(instructData.image_url)
            // uploadImageToServer(instructData.image_url, 'image.png')
            localStorage.setItem('image.png', instructData.image_url);
            updateMessage(instructData.image_url, true, aiModel, true); // Update with the image path
            setLoading(false);
          }
        } catch (error) {
          console.error('Error calling instruct API:', error);
          setLoading(false);
          // Handle the error, maybe show a message to the user
        }
      }
    }
  // else{
  //       try {

  //         setLoading(true);
  //         console.log("Initial Generating....")

  //         setGenerationDone(true);
  //         setLoading(false);
  //         const originalImageUrl = localStorage.getItem('image.png');
  //         updateMessage(originalImageUrl, true, aiModel, true);


  //       } catch (err) {
  //         window.alert(`Error: ${err.message} please try again later`);
  //       }
  //       setLoading(false);
  //     }
  }

    
  if (isannotationDone) {
  
    console.log("Inpainting....")

    const originalImageUrl = localStorage.getItem('image.png');
    
    const maskurl = localStorage.getItem('mask.png');
    const edited_url = localStorage.getItem('image_sketch')

    console.log(originalImageUrl)
    console.log(maskurl)

      // Code to call the instruct api to get image url
      try {
        // Construct the request to the Express server which will forward it to Django
        const inpaintResponse = await fetch('http://localhost:3001/inpaint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
            mask_url: maskurl,
            prompt: formValue, // The user's input that will be used for processing
            modality: "text_speech_gesture"
          })
        });

        if (!inpaintResponse.ok) {
          throw new Error(`HTTP error! Status: ${inpaintResponse.status}`);
        }

        const inpaintData = await inpaintResponse.json();
        console.log("drag response: ",inpaintData)
        // Assuming inpaintData contains the URL to the processed image
        if (inpaintData) {
          // Update the chat with the new image
          console.log(inpaintData.image_url)
          // uploadImageToServer(inpaintData.image_url, 'image_new.png')
          localStorage.setItem('image.png', inpaintData.image_url);
          await sleep(100)
          updateMessage(inpaintData.image_url, true, aiModel, true); // Update with the image path
          setLoading(false);
        }
      } catch (error) {
        console.error('Error calling inpaint API:', error);
        setLoading(false);
        // Handle the error, maybe show a message to the user
      }
    
  }

};
  
const uploadImageToServer = async (imageDataUrl, filename) => {
  // Convert data URL to blob for file upload
  const response = await fetch(imageDataUrl, {mode: 'no-cors'});
  const blob = await response.blob();
  const formData = new FormData();
  formData.append('image', blob, filename); // Use 'mask.png' or 'image.png' based on the argument

  const uploadEndpoint = 'http://localhost:3001/upload'; // Adjust if necessary
  try {
      const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          mode: 'cors',
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

  /**
   * Scrolls the chat area to the bottom when the messages array is updated.
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  /**
   * Focuses the TextArea input to when the component is first rendered.
   */
  useEffect(() => {

    localStorage.setItem('gesture_or_speech', "speech");
    // inputRef.current.focus();
  }, []);

  const checkAndSendAnnotatedImage = async () => {
    const action = localStorage.getItem('action');
    console.log("Action",action)
    const resizeDone = JSON.parse(localStorage.getItem('resizeDone'));
    console.log("Resize",isresizeDone)

    if(action == 'move'){
      await sleep(300);

      const image_with_one_line = localStorage.getItem('img_one');
      const response = await fetch(image_with_one_line);
      if(response.ok){
        updateMessage(image_with_one_line, false, "User", true);
        updateMessage('Moving the object based on above gesture',true, "filler", false);

      }

        console.log("Moving....")

        const originalImageUrl1 = localStorage.getItem('image.png');
        
        const maskurl1 = "http://localhost:3001/uploads/mask_modality3.png"

        const selected_points1 = localStorage.getItem('move_points')
        const prompt = "A photo of an orange"
        const gesture_points = localStorage.getItem('gesture_points');
        console.log(originalImageUrl1)
        console.log(maskurl1)
        console.log(selected_points1)

        setLoading(true)
        try {
          // Construct the request to the Express server which will forward it to Django
          const dragResponse = await fetch('http://localhost:3001/move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_url: originalImageUrl1, // Ensure this is the correct URL or path to the image
              mask_url: maskurl1,
              selected_points: selected_points1, // The user's input that will be used for processing
              prompt: prompt,
              modality: "text_speech_gesture",
              gesture_points: gesture_points
            })
          });

          if (!dragResponse.ok) {
            throw new Error(`HTTP error! Status: ${dragResponse.status}`);
          }

          const inpaintData = await dragResponse.json();
          console.log("drag response: ",inpaintData)
          // Assuming inpaintData contains the URL to the processed image
          if (inpaintData) {
            // Update the chat with the new image
            console.log(inpaintData.image_url)
            // uploadImageToServer(inpaintData.image_url, 'image_new.png')
            localStorage.setItem('image.png', inpaintData.image_url);
            await sleep(100)
            updateMessage(inpaintData.image_url, true, selected, true); // Update with the image path
            setLoading(false);
            setAnnotationDone(false);
            setGenerationDone(true);
          }
        } catch (error) {
          console.error('Error calling move API:', error);
          setLoading(false);
          
          // Handle the error, maybe show a message to the user
        }
        
        
    }
    else if(action == 'remove'){
      await sleep(300);

      const image_with_two_lines = localStorage.getItem('img_two');
      const response = await fetch(image_with_two_lines);

      if(response.ok){
        updateMessage(image_with_two_lines, false, "User", true);
        updateMessage('Removing the object based on above gesture',true, "filler", false);
      }
      console.log("Removing....")
      setLoading(true);
      const formValue1 = "Remove the orange";

      const originalImageUrl = localStorage.getItem('image.png');
      const gesture_points = localStorage.getItem('gesture_points');

      // Code to call the instruct api to get image url
        try {
          // Construct the request to the Express server which will forward it to Django
          const instructResponse = await fetch('http://localhost:3001/remove', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
              prompt: formValue1, // The user's input that will be used for processing
              modality: "text_speech_gesture",
              gesture_points: gesture_points

            })
          });

          if (!instructResponse.ok) {
            throw new Error(`HTTP error! Status: ${instructResponse.status}`);
          }

          const instructData = await instructResponse.json();
          console.log(instructData)
          // Assuming instructData contains the URL to the processed image
          if (instructData) {
            // Update the chat with the new image
            console.log(instructData.image_url)
            // uploadImageToServer(instructData.image_url, 'image.png')
            localStorage.setItem('image.png', instructData.image_url);
            updateMessage(instructData.image_url, true, selected, true); // Update with the image path
            setLoading(false);
            setGenerationDone(true);
            setAnnotationDone(false);
          }
        } catch (error) {
          console.error('Error calling instruct API:', error);
          setLoading(false);
          setAnnotationDone(false);
          // Handle the error, maybe show a message to the user
        }
    }

    else if(action == 'resize'){
      await sleep(300);
      const resize_img = localStorage.getItem('resize_image')
      const response = await fetch(resize_img);
       setLoading(true);
       updateMessage(resize_img, false, "User", true);
       updateMessage('Resizing the object based on above gesture',true, "filler", false);
       console.log("Resizing....")
 
       const originalImageUrl = localStorage.getItem('image.png');
       
       const maskurl = "http://localhost:3001/uploads/mask_modality3.png"
       const resize_scale = JSON.parse(localStorage.getItem('resize_scale'))
       const prompt = "A photo of an orange"
       const gesture_points = localStorage.getItem('resize_points');

       console.log(originalImageUrl)
       console.log(maskurl)
       console.log(resize_scale)
   
       // Code to call the instruct api to get image url
         try {
           // Construct the request to the Express server which will forward it to Django
           const dragResponse = await fetch('http://localhost:3001/resize', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json'
             },
             body: JSON.stringify({
               image_url: originalImageUrl, // Ensure this is the correct URL or path to the image
               mask_url: maskurl,
               resize_scale: resize_scale + 0.5, // The user's input that will be used for processing
               prompt: prompt,
               modality: "text_speech_gesture",
               gesture_points: gesture_points,
               edited_url: resize_img,

              })
           });
   
           if (!dragResponse.ok) {
             throw new Error(`HTTP error! Status: ${dragResponse.status}`);
           }
   
           const inpaintData = await dragResponse.json();
           console.log("resize response: ",inpaintData)
           // Assuming inpaintData contains the URL to the processed image
           if (inpaintData) {
             // Update the chat with the new image
             console.log(inpaintData.image_url)
             // uploadImageToServer(inpaintData.image_url, 'image_new.png')
             localStorage.setItem('image.png', inpaintData.image_url);
             await sleep(100)
             updateMessage(inpaintData.image_url, true, selected, true); // Update with the image path
             setLoading(false);
             setAnnotationDone(false);
             setGenerationDone(true);
           }
         } catch (error) {
           console.error('Error calling inpaint API:', error);
           setLoading(false);
           // Handle the error, maybe show a message to the user
         }

  }

  else if(action == 'selection'){
    console.log("Selection")

    try {
      // Fetch the annotated image from the server
      const image_sketch = localStorage.getItem('image_sketch')

      const response = await fetch(image_sketch);
      // Check if the response is OK (status code 200)
      if (response.ok) {
        // If the image exists, update the message with the annotated image URL
        updateMessage(image_sketch, false, "User", true); // Assuming `true` flags an image message
        updateMessage('What would you like to edit in this image?',true, "filler", false);
      }
    } catch (error) {
      // If an error occurs during the fetch request, log the error
      console.error('Error fetching annotated image:', error);
    }
    setAnnotationDone(true);
  }
  };


const handleClickOnButton = () => {
  setIsFocused(true)
  setIsClicked(!isClicked);
  if (amIRecording) {
    // Stop the recording
    thingThatRecords.stop();
    setAmIRecording(false);
    setShowTextArea(true); // Show the textarea after recording stops

    console.log("Recording")
  } else {
    // Start the recording
    navigator.mediaDevices.getUserMedia({ audio: true }).then(gotStream => {
      let myRecorder = new MediaRecorder(gotStream);
      setThingThatRecords(myRecorder);
      myRecorder.start();
      const allTheAudiolist = [];

      myRecorder.ondataavailable = e => allTheAudiolist.push(e.data);
      
      myRecorder.onstop = () => {
        const audioBlob = new Blob(allTheAudiolist, { type: 'audio/m4a' }); // Adjust the type if necessary
        setFinalAudioClip(audioBlob);

        // Now that recording is finished, we proceed with the upload
        // The audio file is converted to a data URL before being uploaded
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const audioDataUrl = reader.result;
          console.log( reader.result)
          // Replace 'recorded-audio.mp3' with the desired filename
          uploadAudioToServer(audioDataUrl, 'recorded-audio.m4a');
                      
        };
      };

      setAmIRecording(true);
    });
  }
};


const uploadAudioToServer = async (audioDataUrl, filename) => {
  // Convert data URL to blob for file upload
  const response = await fetch(audioDataUrl);
  const blob = await response.blob();
  const formData = new FormData();
  formData.append('audio', blob, filename); // Use a relevant name for the audio file

  const uploadEndpoint = 'http://localhost:3001/upload-audio'; // Adjust if necessary
  try {
    const uploadResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
      modality: "text_speech_gesture"
    });

    if (!uploadResponse.ok) throw new Error('Upload failed: ' + uploadResponse.statusText);

    const data = await uploadResponse.json();
    console.log(`${filename} saved on server:`, data.audioPath);
    localStorage.setItem(filename, data.audioPath); // Save path as the audio file path
    localStorage.setItem("recordingDone", true)
    await sleep(50)
    const response = await fetch('http://localhost:3001/speech-to-text', { // Adjust the port to match your Express server
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_url: "http://localhost:3001/uploads/recorded-audio.m4a", // Send the audio URL to the server
              modality: "text_speech_gesture"
            }),
          });
    if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
    
    const prompt_s = await response.json();
    // console.log(prompt_s)
    setPrompt(prompt_s['prompt'])
    setFormValue(prompt_s['prompt'])
    
    // console.log("Prompt: ", prompt_speech)

  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// useEffect to call checkAndSendAnnotatedImage when annotation is done
useEffect(() => {
  setFormValue(formValue);
  // Get the annotationDone value from local storage
  localStorage.setItem('gesture_or_speech', 'speech')
  const annotationDone = JSON.parse(localStorage.getItem('annotationDone'));
  console.log(annotationDone, " Annotation");
  // Check if annotationDone is true
  if (annotationDone) {
    console.log("Annotation")
      
      checkAndSendAnnotatedImage();
      setAnnotationDone(false);
      localStorage.setItem('annotationDone', false);
      
  }
  else{
    setGenerationDone(true)
  }
  
  



}, []);


const handleEditClick = (content) => {
  localStorage.setItem('image.png', content);
  updateMessage(content, true, selected, true);  // Assuming these are the correct parameters for your updateMessage function
};



  return (
    <div className='chatview'>
      <main className='chatview__chatarea'>
        {messages.map((message, index) => (
          <Message key={index} message={{ ...message }} onEditClick={handleEditClick}/>
        ))}

        {loading && <Loading />}

        <span ref={messagesEndRef}></span>
      </main>
      {/* <form className='form' onSubmit={uploadFile}  style={{alignItems: 'center' }}> */}
      <div style={{alignItems: 'center' }}>
      <div className='flex items-center p-4 space-x-1 w-full'>
        <input type="file" onChange={handleFileChange} accept="image/*" />
        {/* <button onClick={uploadFile} className='btn-upload' style={{ ...buttonStyle}}>
          Upload Image
        </button> */}
        </div>
        </div>
        {/* </form> */}
     
      <div className="audio-form-container" style={{ display: 'flex', width: '100%', alignItems: 'start' }}>
      <button onClick={handleClickOnButton} className="mic-button" style={{ flex: 1, display: 'flex', alignItems: 'start', padding: '10px' , marginLeft: '10px'}}>
      <i className="fas fa-microphone" style={{ fontSize: '45px', color: isClicked ? '#3b82f6' : 'grey' }}></i> 
    </button>
    {showTextArea && (
          <form className='form' onSubmit={sendMessage} style={{ flex: 40, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <textarea
              ref={inputRef}
              className={`chatview__textarea-message ${formValue === defaultPrompt && !isFocused ? 'text-gray-500' : 'text-black'} ...otherClasses`}
              value={formValue}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
            />
            <button
              type='submit'
              className='chatview__btn-send'
              disabled={!formValue}
              style={{ marginLeft: '10px' }}
            >
              <MdSend size={30} />
            </button>
          </form>
        )}
</div>

    </div>
  );
};

const buttonStyle = {
  // marginTop: '2px',
  padding: '5px 10px',
  backgroundColor: '#4CAF50',
  color: 'white',
  // border: 'none',
  borderRadius: '5px',
  // cursor: 'pointer',
  // fontSize: '12px'
  
};
export default DragGestureMainChat;