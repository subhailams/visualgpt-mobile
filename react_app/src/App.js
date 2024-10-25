import React from 'react';
import { ChatContextProvider } from './context/chatContext';
import SideBar from './components/SideBar';
import MainChat from './components/MainChat';
import GestureMainChat from './components/GestureMainChat'; // ASK : why is it not used ? 
import DragGestureMainChat from './components/DragGestureMainChat';
import AudioMainChat from './components/AudioMainChat';
// import LandingPage from './components/LandingPage';


import AnnotationCanvas from './components/AnnotationCanvas'; // Import AnnotationPage
import DragCanvas from './components/DragCanvas'; // Import AnnotationPage
import ResizeCanvas from './components/ResizeCanvas'; // Import AnnotationPage
import MainCanvas from './components/MainCanvas'; // Import AnnotationPage
// import DragCanvas_mobile from './components/DragCanvas_mobile';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import Routes and Route

const App = () => {
  localStorage.setItem('annotationDone', false);


  return ( 
    <ChatContextProvider>
      <Router>
        <div className='flex transition duration-500 ease-in-out'>
          <SideBar />
          <Routes>
            <Route path="/" element={<MainChat />} />
            <Route path="/text" element={<MainChat />} />
            <Route path="/text_gesture" element={<DragGestureMainChat />} />
            <Route path="/text_speech" element={<AudioMainChat />} />

            {/* <Route path="/annotate/:imageUrl" element={<MainCanvas />} /> Use route parameter :imageUrl */}
            {/* <Route path="/annotate/:imageUrl" element={<ResizeCanvas />} /> Use route parameter :imageUrl */}

            {/* <Route path="/annotate/:imageUrl" element={<AnnotationCanvas />} /> Use route parameter :imageUrl
            <Route path="/drag/:imageUrl" element={<MainCanvas />} /> Use route parameter :imageUrl */}
            <Route path="/canvas" element={<MainCanvas />}>
              <Route index element={<AnnotationCanvas />} />
              <Route path="annotate" element={<AnnotationCanvas />} />
              <Route path="drag" element={<DragCanvas/>} />
            </Route>
         </Routes>
        </div>
      </Router>
    </ChatContextProvider>
  );
};

export default App;
