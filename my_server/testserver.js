import axios from 'axios';

export const testServer = async (prompt) => {
  try {
    const response = await axios.post('http://localhost:3001/api/dalle', {
      prompt: prompt
    });

    // axios automatically parses the JSON response, so no need to call .json()
    return response;
  } catch (error) {
    // Axios wraps the error response in error.response
    console.error('Error:', error.response ? error.response.data : error.message);
    // Handle the error according to your application's needs
  }
};

// Example usage
testServer("Provide an sample image")
  .then(data => {
    console.log('Data received:', data);
  })
  .catch(error => {
    console.error('Error while testing the server:', error);
  });
