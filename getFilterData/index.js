const { BlobServiceClient } = require("@azure/storage-blob");
const dotenv = require("dotenv");
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
    for(let i = 0; i < blobObj.length; i++) {
        try {
            const completion = await openai.createCompletion({
                prompt: `The following AI tool helps the IT support team classify an email into labels that are: urgent, non urgent, spam. Questions and concerns are good examples of urgent emails.\n\n` + 
                //Context Example
                `User: johnsmith@aol.com\n` +
                `Subject: Require immediate assistance\n` + 
                `Body: Need help. Contact asap\n` +
                `Label: Urgent\n` + 
                
                //Context Example
                `User: janedoe@ads.com\n` + 
                `Subject: Increase your Website Traffic by 100%\n` + 
                `Body: Dear Sir/Madam, we are a fast traffic company that wants to provide you this excellent service. Buy it now.\n` + 
                `Label: Non Urgent\n` + 
                
                //Context Example
                `User: w1nner@amaz0n.com\n` + 
                `Subject: You've won\n` + 
                `Body: Amazon is sending you a refunding of $88.91. Please click this link immediately. Offer only valid for next 20 minutes.\n` + 
                `Label: Spam\n` + 
                
                //Actual use case
                `User: ${blobObj[i]['email']}\n` + 
                `Subject: ${blobObj[i]['subject']}\n` + 
                `Body: testingtesting\n` +
                `Label:`,
                stop: ["\n", "User:", "Subject:", "Body:", "Label:"],
                max_tokens: 800,
                temperature: 0.7,
                frequency_penalty: 0,
                presence_penalty: 0,
                top_p: 0.95,
            }, {
              headers: {
                'api-key': process.env.OPEN_AI_API_KEY,
                'Content-Type': 'application/json',
              },
              params: { "api-version": "2022-12-01" }
            });
            console.log(`processing ${i} : | response: ${JSON.stringify(completion)}`);
          } catch (e) {
            context.log(e);
            return "";
          }
    }
    
    // TODO: Create Cosmos DB records for every iteration if it does not exist
    // TODO: Update the DB records according to the responses

    const responseMessage = "Function executed successfully.";

    context.res = {
        body: responseMessage
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