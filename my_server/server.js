import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { OpenAIApi, Configuration } from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import Replicate from "replicate";
import addBackgroundToPNG from './lib/add-background-to-png.js';
import bodyParser from "body-parser";
import axios from 'axios';
import { createObjectCsvWriter } from 'csv-writer';

import path from 'path';
dotenv.config();


const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN, // defaults to process.env.REPLICATE_API_TOKEN
});

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


const API_HOST = process.env.REPLICATE_API_HOST

app.use(cors());
app.use(express.json());

// Enable CORS
app.use(cors());


let csvWriter;
let initializedDate = '';

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
}

async function fetchAndSaveImage(imageUrl, imagesfolder) {
  try {
      const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'stream'
      });

      const fileName = path.basename(new URL(imageUrl).pathname);
      const savePath = path.join(imagesfolder, fileName);
      await pipeline(response.data, fs.createWriteStream(savePath));
      console.log('Image downloaded and saved to:', savePath);
  } catch (err) {
      console.error('Failed to download image:', err);
  }
}

const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' CDT');

// Extract the date and time
const date = datetime.substring(0, 10); // YYYY-MM-DD
const time = datetime.substring(11, 19); // HH:MM:SS

const directoryPath = `logs/${date}_${time}/`;
const logFileName = `log.csv`;
const fullPath = `${directoryPath}${logFileName}`;
const imagesPath = `${directoryPath}${"images"}`;

function initializeCsvWriter() {
    const datetime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().replace('Z', ' CDT');

    // Extract the date and time
    const date = datetime.substring(0, 10); // YYYY-MM-DD
    const time = datetime.substring(11, 19); // HH:MM:SS

    if (date !== initializedDate) {
        initializedDate = date;

        ensureDirectoryExistence(fullPath);
        ensureDirectoryExistence(imagesPath);
        
        csvWriter = createObjectCsvWriter({
          path: fullPath,
          append: false,
          header: [
              {id: 'date', title: 'Date'},
              {id: 'time', title: 'Time'},
              {id:'modality', title: 'Modality'},
              {id:'task', title: 'Task'},
              {id: 'text', title: 'Text'},
              {id: 'speech', title: 'Speech'},
              {id: 'inpaint', title: 'Inpaint'},
              {id: 'gesture', title: 'Gesture'},
              {id: 'text_input', title: 'Text Input'},
              {id:'inpaint_text_input', title: 'Inpaint Text Input'},
              {id: 'speech_input', title: 'Speech Input'},
              {id: 'input_images', title: 'Input Images'},
              {id: 'edited_images', title: 'Edited Images'},
              {id: 'ai_images', title: 'AI Images'},
              {id: 'brush_size', title: 'Brush Size'},
              {id: 'gesture_points', title: 'Gesture Points'},

          ],
          fieldDelimiter: ',',
          alwaysQuote: true,
      });
      

        console.log(`Initialized new log file: ${fullPath}`);
    }
}
initializeCsvWriter();

function logRequests(req, res, next) {
  if (req.method === 'GET' || req.originalUrl.startsWith('/upload')) {
    return next();
}

    const start = process.hrtime();
     // Ensure CSV writer is initialized or up-to-date

    let oldWrite = res.write;
    let oldEnd = res.end;
    let chunks = [];

    res.write = function (chunk) {
        chunks.push(chunk);
        return oldWrite.apply(res, arguments);
    };

    res.end = function (chunk) {
        if (chunk) chunks.push(chunk);
        oldEnd.apply(res, arguments);

        const responseBody = Buffer.concat(chunks).toString('utf8');
        let imageURL = '';

        try {
            const parsedBody = JSON.parse(responseBody);
            imageURL = parsedBody.image_url || 'No image URL';
        } catch (error) {
            console.error('Error parsing JSON:', error);
            imageURL = 'Error parsing JSON';
        }

        const duration = process.hrtime(start);
        const responseTime = duration[0] * 1e3 + duration[1] / 1e6;
        // let fileName = "";
        // let image_fileName = "";
        // let edited_fileName = "";
        
        // if (req.body.image_url) {
        //   image_fileName = imagesPath + path.basename(new URL(req.body.image_url).pathname);
        //   fetchAndSaveImage(req.body.image_url, imagesPath)
        // }

        // if (req.body.edited_url) {
        //   edited_fileName = imagesPath + path.basename(new URL(req.body.edited_url).pathname);

        //   fetchAndSaveImage(req.body.edited_url, imagesPath)
        // } 
        let timestamp = new Date(new Date().getTime() - (5 * 60 * 60 * 1000));
        const gestureActions = ['/move', '/resize', '/remove'];
        const gesture = gestureActions.some(action => req.originalUrl.includes(action)) ? 'Yes' : 'No';

        // Extract the date and time
        let date = timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
        let time = timestamp.toISOString().substring(11, 19); // HH:MM:SS
        console.log(req.originalUrl)
        let record = {
          date: date,
          time: time, // Append 'CDT' to the time
          modality: req.body.modality,
          task: req.originalUrl,
          text: req.originalUrl === '/instruct' ? 'Yes' : 'No',
          speech: req.body.modality === '/text_speech_gesture' ? 'Yes' : 'No',
          inpaint: req.originalUrl === '/inpaint' ? 'Yes' : 'No',
          gesture: gesture,
          text_input: req.originalUrl === '/instruct' ? req.body.prompt : null,
          speech_input: req.body.modality === '/text_speech_gesture' ? req.body.prompt : null,
          inpaint_text_input: req.originalUrl === '/inpaint' ? req.body.prompt : null,
          input_images: req.body.image_url, 
          edited_images: req.body.edited_url,
          ai_images: imageURL,
          brush_size: req.originalUrl === '/inpaint' ? req.body.brush_size : null,
          gesture_points: req.body.gesture_points ? req.body.gesture_points : null
      };
        csvWriter.writeRecords([record]).then(() => {
          console.log('Logged one request with image URL and request body');
      });
      
    };

    next();
}

app.use(logRequests);


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.use('/uploads', express.static('uploads'));


app.get('/fetch-image',cors(), async (req, res) => {
  try {
    const imageUrl = req.query.url;
    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Example usage within an Express route or similar context

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    // Use the original filename for the uploaded file
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// POST endpoint for uploading images
app.post('/upload', cors(), upload.single('image'), (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      res.status(400).send('No file uploaded');
      return;
    }

    // Extract the file path from the request
    const filePath = req.file.path;

    // Construct the URL of the uploaded image
    const imageUrl = `${req.protocol}://${req.get('host')}/${filePath}`;

    // Respond with the URL of the uploaded image
    res.status(200).json({ imagePath: imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  // File is available in req.file.path
  console.log('Uploaded file:', req.file.path);

  // Respond with the path of the uploaded file
  res.json({ audioPath: req.file.path });
});



app.post('/text-only-predictions',cors(), async (req, res) => {
  // Remove null and undefined values

  console.log("___________________")
  console.log(req)
  console.log("___________________")
  try {
    const response = await fetch(
      `${API_HOST}/v1/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
        input:  {
          prompt: req.body.prompt,

        },
      }),
    });

    if (response.status !== 201) {
      const error = await response.json();
      return res.status(500).json({ detail: error.detail });
    }

    const prediction = await response.json();
    res.status(201).json(prediction);
  } catch (error) {
    console.error('Error in /text-only-predictions:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




app.post('/predictions',cors(), async (req, res) => {
      // Remove null and undefined values
      req.body = Object.entries(req.body).reduce(
        (a, [k, v]) => (v == null ? a : ((a[k] = v), a)),
        {}
      );
    
      console.log("___________________")
      console.log(req)
      console.log("___________________")
      try {
        const response = await fetch(`${API_HOST}/v1/predictions`, {
          method: "POST",
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "be04660a5b93ef2aff61e3668dedb4cbeb14941e62a3fd5998364a32d613e35e",
            input: req.body,
          }),
        });
    
        if (response.status !== 201) {
          const error = await response.json();
          return res.status(500).json({ detail: error.detail });
        }
    
        const prediction = await response.json();
        res.status(201).json(prediction);
      } catch (error) {
        console.error('Error in /predictions:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });







app.get('/predictions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`${API_HOST}/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ message: error.detail });
    }
    const prediction = await response.json();
    res.json(prediction); // Return the current prediction status
  } catch (error) {
    console.error('Error polling prediction status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/speech-to-text', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { audio_url, modality } = req.body;  // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint for speech-to-text
  const djangoEndpoint = 'http://localhost:8000/api/speech';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          audio_url: audio_url,  // Adjust these fields based on the expected Django request format
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app for speech:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django speech app' });
  }
});


app.post('/drag', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url,mask_url, selected_points,modality } = req.body; // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8001/api/drag';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          mask_url : mask_url,
          selected_points: selected_points,
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});

app.post('/move', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url,mask_url, selected_points, prompt, modality} = req.body; // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8001/api/move';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          mask_url : mask_url,
          selected_points: selected_points,
          prompt: prompt
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});


app.post('/resize', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url,mask_url, resize_scale, prompt, modality } = req.body; // Adjust based on what you're forwarding
  
  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8001/api/resize';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          mask_url : mask_url,
          resize_scale: resize_scale,
          prompt: prompt
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});

    


app.post('/inpaint', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url,mask_url, prompt, modality } = req.body; // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8000/api/inpaint';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          mask_url : mask_url,
          prompt: prompt,
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});
    

app.post('/instruct', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url, prompt, modality } = req.body; // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8000/api/instruct';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          prompt: prompt,
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});


app.post('/remove', cors(), async (req, res) => {
  // Extract data from the incoming request
  const { image_url, prompt, modality } = req.body; // Adjust based on what you're forwarding

  // Define the URL of your Django endpoint
  const djangoEndpoint = 'http://localhost:8000/api/instruct';

  try {
      // Forward the request to the Django endpoint
      const response = await axios.post(djangoEndpoint, {
          image_url: image_url, // Adjust these fields based on the expected Django request format
          prompt: prompt,
      });

      // Send the response back to the original client
      res.json(response.data);
  } catch (error) {
      console.error('Error calling Django app:', error.message);
      // Handle errors, such as by forwarding the error from the Django app or customizing the message
      res.status(500).json({ success: false, message: 'Failed to call Django app' });
  }
});

// app.post('/api/dalle', async (req, res) => {
//   res.send("Endpoint is working");
// });
app.post('/api/dalle',cors(), async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const responseData = {
      imageUrl: "https://replicate.delivery/pbxt/HtGQBfA5TrqFYZBf0UL18NTqHrzt8UiSIsAkUuMHtjvFDO6p/overture-creations-5sI6fQgYIuo.png", // Replace with your dummy image URL
      // Add any other relevant fields you need for the dummy response
    };

    // const dalleResponse = await openai.createImage({
    //   prompt: `${prompt}`,
    //   n: 1,
    //   size: '512x512',
    // });

    // const responseData = {
    //   imageUrl: dalleResponse.data.data[0].url,
    //   // Add any other relevant fields you need from the response
    // };

    console.log(responseData)

    // Send the simplified response back to the client
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
