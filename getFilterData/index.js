const azureStorage = require('azure-storage');
const openai = require('openai');

const blobService = azureStorage.createBlobService();

const CONTAINER_NAME = 'aihackathoncontainer';

const { Configuration, OpenAIApi } = openai;
const configuration = new Configuration({
    organization: "org-i16GdI3biVetsydNnhzCYRLs",
    apiKey: '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',
});
const openAI = new OpenAIApi(configuration);

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const jsonFileName = req.body.jsonFileName;
    if (!jsonFileName || jsonFileName === '') {
        context.log('Error: Filename empty or undefined');
        return;
    }

    // Retrieve the JSON file from a storage blob
    const blobContent = await getBlobContent(CONTAINER_NAME, jsonFileName);

    // Fire off the request to OpenAI, iterate through the json objects
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
        // TODO: Create Cosmos DB records for every iteration if it does not exist
        // TODO: Update the DB records according to the responses
    }

    const responseMessage = "Function executed successfully.";

    context.res = {
        body: responseMessage
    };
}

async function getBlobContent(containerName, blobName) {
    return new Promise((resolve, reject) => {
      blobService.getBlobToText(containerName, blobName, function(err, blobContent) {
          if (err) {
              reject(err);
          } else {
              resolve(blobContent);
          }
      });
    });
}
