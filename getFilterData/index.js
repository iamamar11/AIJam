const { BlobServiceClient } = require("@azure/storage-blob");
const openai = require('openai');
const dotenv = require('dotenv')

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
        await streamToString(downloadResponse.readableStreamBody);
    } catch(e) {
        context.res = {
            status: 404,
            body: 'Error while reading file'
        };
        return;
    }

    // Fire off the request to OpenAI, iterate through the json objects
   // let newJSONData = [];
    // for (let i = 0; i < blobContent.length; i++) {
    //     const response = await openAI.createCompletion({
    //         model: 'text-davinci-003',
    //         prompt: `The following AI tool helps the IT support team classify an email into labels that are: urgent, non urgent, spam. Questions and concerns are good examples of urgent emails.\n\n` + 
    //         //Context Example
    //         `User: John Smith\n` +
    //         `Subject: Require immediate assistance\n` + 
    //         `Body: Need help. Contact asap\n` +
    //         `Label: Urgent\n` + 
            
    //         //Context Example
    //         `User: Jane Doe\n` + 
    //         `Subject: Increase your Website Traffic by 100%\n` + 
    //         `Body: Dear Sir/Madam, we are a fast traffic company that wants to provide you this excellent service. Buy it now.\n` + 
    //         `Label: Non Urgent\n` + 
            
    //         //Context Example
    //         `User: Jeff Bezos\n` + 
    //         `Subject: You've won\n` + 
    //         `Body: Amazon is sending you a refunding of $88.91. Please click this link immediately. Offer only valid for next 20 minutes.\n` + 
    //         `Label: Spam\n` + 
            
    //         //Actual use case
    //         `User: ${blobContent[i].email}\n` + 
    //         `Subject: ${blobContent[i].subject}\n` + 
    //         `Body: ${blobContent[i].body}\n`
    //         `Label:`,
    //         stop: ["\n", "User:", "Subject:", "Body:", "Label:"],
    //         max_tokens: 7,
    //         temperature: 0
    //     });
    //     console.log(`processing ${i} : ${blobContent[i].email} | response: ${JSON.stringify(response)}`);
    //     // TODO: Update the blob file with an additional classification column
    //     newJSONData.push({
    //         User: blobContent[i].email,
    //         Subject: blobContent[i].subject,
    //         Body: blobContent[i].body,
    //         Label: ''
    //     });
    // }
    
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