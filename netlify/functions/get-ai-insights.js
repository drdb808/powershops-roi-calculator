// File: netlify/functions/get-ai-insights.js
const { GoogleGenAI } = require("@google/genai");

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { API_KEY } = process.env;

  if (!API_KEY) {
    console.error("API_KEY is not set in Netlify environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error: The API key is not configured." }),
    };
  }

  try {
    const { userPrompt, systemInstruction } = JSON.parse(event.body);

    if (!userPrompt || !systemInstruction) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required prompt information in the request." }),
      };
    }

    // Initialize the official Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Call the Gemini API using the SDK for a more reliable interaction
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
        },
    });

    // The SDK provides a simple '.text' property to get the response.
    const insights = response.text;

    if (!insights) {
        console.error("Could not extract insights from Gemini API response:", response);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Received an unexpected or empty response from the AI service." })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ insights }),
    };

  } catch (error) {
    console.error("Critical error in get-ai-insights function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `An internal server error occurred while generating insights. Details: ${errorMessage}` }),
    };
  }
};
