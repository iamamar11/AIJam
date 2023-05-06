const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const configuration = new Configuration({
  basePath: process.env.OPENAI_ENDPOINT,
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function createCompletion(inputText) {
  try {
    const prompt = createPrompt(inputText);
    const completion = await openai.createCompletion(
      {
        prompt,
        max_tokens: 800,
        temperature: 0.7,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 0.95,
        stop: null,
      },
      {
        headers: { "api-key": process.env.OPENAI_API_KEY },
        params: { "api-version": process.env.OPENAI_VERSION },
      }
    );
    return completion.data.choices[0].text;
  } catch (err) {
    console.log("Error while calling the api");
  }
}

module.exports = { createCompletion };

function createPrompt(inputData) {
  return `
  ${JSON.stringify(inputData)}  
  The above JSON object has multiple email objects. each email has date, subject and body attributes.
  Analyse the content of each email and add a Label field into each object which classify email in 3 categories Urgent, Non-urgent, Spam.
  return the update JSON parsed containing the classification of the email.
  `;
}
