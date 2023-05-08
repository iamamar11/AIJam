const dotenv = require("dotenv");
const { BlobServiceClient } = require("@azure/storage-blob");
const { Configuration, OpenAIApi } = require("openai");

dotenv.config()

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (!req.body) {
        context.res = {
            status: 404,
            body: 'Missing jsonFileName.'
        };
        return;
    }

    let blobContent = null;
    try{ 
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.CONTAINER_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.CONTAINER_NAME);
        const blobClient = containerClient.getBlockBlobClient(req.body.jsonFileName);
        const downloadResponse = await blobClient.download();
        blobContent = await streamToString(downloadResponse.readableStreamBody);
    } catch(e) {
        context.res = {
            status: 404,
            body: 'Error while reading file'
        };
        return;
    }

    const blobObj = JSON.parse(blobContent);
    if (blobObj.length < 1) {
        context.res = {
            status: 200,
            body: 'No data to read from the JSON file'
        };
        return;
    }

    const configuration = new Configuration({
        basePath: `https://${process.env.OPEN_AI_RESOURCE}.openai.azure.com/openai/deployments/${process.env.OPEN_AI_DEPLOYMENT}`,
        apiKey: process.env.OPEN_AI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);
    
    const basePrompt = `Classify the following emails into 1 of the following categories: urgent, non urgent, spam.\n`;
    let emailPrompt = '';
    let completionResponse = null;
    let response = [];

    for (let i = 0; i < blobObj.length; i++) {
        emailPrompt += `Email ${i + 1}\n` + 
        `- Subject: ${blobObj[i]['subject']}\n` + 
        `- Body: ${blobObj[i]['body'].toString().replace(/(\r\n|\n|\r)/gm, '')}\n` ;
    }

    try {
        const completion = await openai.createCompletion({
            prompt: basePrompt + emailPrompt,
            model: 'text-davinci-003',
            max_tokens: 100,
        }, {
          headers: {
            'api-key': process.env.OPEN_AI_API_KEY,
            'Content-Type': 'application/json',
          },
          params: { "api-version": "2022-12-01" }
        });
        // console.log('completion complete! -->', completion.data.choices[0].text);
        completionResponse = completion.data.choices[0].text;
      } catch (e) {
        context.log(e);
        return "";
      }

    // TODO: Create Cosmos DB records for every iteration if it does not exist
    // TODO: Update the DB records according to the responses
    if (completionResponse) {
        let responseArr = completionResponse.split('\n').filter(el => el !== '');
        if (responseArr.length > 0) {
            for (let i = 0; i < blobObj.length; i++) {
                response.push({
                    'Subject': blobObj[i]['subject'],
                    'Body': blobObj[i]['body'],
                    'Label': responseArr[i].split(': ')[1].trim()
                });
            }
        }
    }

    context.res = {
        body: response
    };
}

// Helper function to convert a ReadableStream to a string
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on("data", (data) => {
        chunks.push(data.toString());
      });
      readableStream.on("end", () => {
        resolve(chunks.join(""));
      });
      readableStream.on("error", reject);
    });
  }