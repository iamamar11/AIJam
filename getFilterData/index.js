const { BlobServiceClient } = require("@azure/storage-blob");
const openai = require('openai');
require('dotenv').config();

const STORAGE_NAME = 'aihackathon2023';
const CONTAINER_NAME = 'aihackathoncontainer';

const { Configuration, OpenAIApi } = openai;
const configuration = new Configuration({
    organization: process.env.OPEN_AI_ORGANIZATION,
    apiKey: process.env.OPEN_AI_API_KEY,
});
const openAI = new OpenAIApi(configuration);

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const jsonFileName = req.body.jsonFileName;
    if (!jsonFileName || jsonFileName === '') {
        context.log('Error: Filename empty or undefined');
        return;
    }
    const blobServiceClient = new BlobServiceClient(STORAGE_NAME);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    // Retrieve the JSON file from a storage blob
    let blobContent = null;
    try{ 
        blobContent = await getBlobContent(containerClient, jsonFileName);
    } catch(e) {
        context.log(`Error: ${e}`);
        return;
    }

    // Fire off the request to OpenAI, iterate through the json objects
    let newJSONData = [];
    for (let i = 0; i < blobContent.length; i++) {
        const response = await openAI.createCompletion({
            model: 'text-davinci-003',
            prompt: `The following AI tool helps the IT support team classify an email into labels that are: urgent, non urgent, spam. Questions and concerns are good examples of urgent emails.\n\n` + 
            //Context Example
            `User: John Smith\n` +
            `Subject: Require immediate assistance\n` + 
            `Body: Need help. Contact asap\n` +
            `Label: Urgent\n` + 
            
            //Context Example
            `User: Jane Doe\n` + 
            `Subject: Increase your Website Traffic by 100%\n` + 
            `Body: Dear Sir/Madam, we are a fast traffic company that wants to provide you this excellent service. Buy it now.\n` + 
            `Label: Non Urgent\n` + 
            
            //Context Example
            `User: Jeff Bezos\n` + 
            `Subject: You've won\n` + 
            `Body: Amazon is sending you a refunding of $88.91. Please click this link immediately. Offer only valid for next 20 minutes.\n` + 
            `Label: Spam\n` + 
            
            //Actual use case
            `User: ${blobContent[i].email}\n` + 
            `Subject: ${blobContent[i].subject}\n` + 
            `Body: ${blobContent[i].body}\n`
            `Label:`,
            stop: ["\n", "User:", "Subject:", "Body:", "Label:"],
            max_tokens: 7,
            temperature: 0
        });
        console.log(`processing ${i} : ${blobContent[i].email} | response: ${JSON.stringify(response)}`);
        // TODO: Update the blob file with an additional classification column
        newJSONData.push({
            User: blobContent[i].email,
            Subject: blobContent[i].subject,
            Body: blobContent[i].body,
            Label: ''
        });
    }
    
    // TODO: Create Cosmos DB records for every iteration if it does not exist
    // TODO: Update the DB records according to the responses

    const responseMessage = "Function executed successfully.";

    context.res = {
        body: responseMessage
    };
}

async function getBlobContent(containerClient, blobName) {
    const blobClient = await containerClient.getBlobClient(blobName);

    const downloadResponse = await blobClient.download();

    const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
    console.log('Downloaded blob content:', downloaded.toString());
    return downloaded.toString();
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}
