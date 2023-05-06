const { BlobServiceClient } = require("@azure/storage-blob");
const dotenv = require("dotenv");
dotenv.config();

async function readBlobFile(fileName) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.CONTAINER_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(
    process.env.CONTAINER_NAME
  );
  const blobClient = containerClient.getBlockBlobClient(fileName);
  const downloadResponse = await blobClient.download();
  return await streamToString(downloadResponse.readableStreamBody);
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

module.exports = { readBlobFile };
