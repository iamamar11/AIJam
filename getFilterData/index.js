const { readBlobFile } = require("../utils/blob");
const { createCompletion } = require("../utils/openAI");

module.exports = async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  if (!req.body) {
    context.res = { status: 404, body: "Missing jsonFileName." };
    return;
  }

  try {
    const fileContent = await readBlobFile(req.body.jsonFileName);
    const res = await createCompletion(fileContent);
    context.res = {
      status: 200,
      body: res,
    };
  } catch (e) {
    context.res = {
      status: 404,
      body: "Error while reading file",
    };
  }
};
