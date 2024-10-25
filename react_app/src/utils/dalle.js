import { Configuration, OpenAIApi } from 'openai';


export const dalle = async (prompt, key) => {
  // const configuration = new Configuration({
  //   apiKey: key,
  // });

  // const openai = new OpenAIApi(configuration);
  // const response = await openai.createImage({
  //   prompt: `${prompt}`,
  //   n: 1,
  //   size: '512x512',
  // });

  // return response;

  
  // const dummyResponse = {
  //   data: {
  //     data: [
  //       {
  //         id: "dummy_id",
  //         object: "image",
  //         created: 1234567890,
  //         prompt: prompt,
  //         url: "https://fastly.picsum.photos/id/0/5000/3333.jpg?hmac=_j6ghY5fCfSD6tvtcV74zXivkJSPIfR9B8w34XeQmvU"
  //       }
  //     ]
  //   }
  // };

  // await new Promise(resolve => setTimeout(resolve, 500));

  // return dummyResponse;


};
