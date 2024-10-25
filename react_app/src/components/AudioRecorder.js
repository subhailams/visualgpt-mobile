import React, { useState } from 'react';

function AudioRecorder() {
  let [amIRecording, setAmIRecording] = useState(false); 
  let [thingThatRecords, setThingThatRecords] = useState(null); 
  let [finalAudioClip, setFinalAudioClip] = useState(null); 


  const handleClickOnButton = () => {
    if (amIRecording) {
      // Stop the recording
      thingThatRecords.stop();
      setAmIRecording(false);
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
      });
  
      if (!uploadResponse.ok) throw new Error('Upload failed: ' + uploadResponse.statusText);
  
      const data = await uploadResponse.json();
      console.log(`${filename} saved on server:`, data.audioPath);
      localStorage.setItem(filename, data.audioPath); // Save path as the audio file path
      localStorage.setItem("recordingDone", true)
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  
  // const makeDownloadLink = (audioBlob) => {
  //   let urlForDownload = URL.createObjectURL(audioBlob);
  //   let downloadAnchor = document.createElement("a"); 
  //   downloadAnchor.href = urlForDownload;
  //   downloadAnchor.download = 'speech.m4a'; 
  //   downloadAnchor.style.display = 'none'; 
  //   downloadAnchor.click();
    
  // };

  return (
    <div className="SuperCoolApp">

    </div>
  );
}

export default AudioRecorder;
