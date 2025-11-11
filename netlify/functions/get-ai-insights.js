// File: netlify/functions/get-ai-insights.js

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { API_KEY } = process.env;
  const MODEL_NAME = "gemini-2.5-flash"; // Using the same model as the frontend

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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const requestBody = {
      contents: [{
        parts: [{ "text": userPrompt }]
      }],
      systemInstruction: {
        parts: [{ "text": systemInstruction }]
      }
    };

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        console.error("Error from Gemini API:", errorBody);
        const errorMessage = errorBody?.error?.message || `API request failed with status ${apiResponse.status}`;
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage })
        };
    }
    
    const responseData = await apiResponse.json();
    
    // Extract the text from the API response
    // The response structure is { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
    const insights = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!insights) {
        console.error("Could not extract insights from Gemini API response:", responseData);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Received an unexpected response from the AI service." })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ insights }),
    };

  } catch (error) {
    console.error("Critical error in get-ai-insights function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal server error occurred while generating insights." }),
    };
  }
};
