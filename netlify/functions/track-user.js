// File: netlify/functions/track-user.js

exports.handler = async function(event) {
  // This function only accepts POST requests from the frontend.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Get the Google Apps Script URL from environment variables.
  const { GOOGLE_APPS_SCRIPT_URL } = process.env;

  try {
    const userData = JSON.parse(event.body);
    // Log the data for debugging and as a backup.
    console.log("New ROI Calculator Lead:", userData);

    if (!GOOGLE_APPS_SCRIPT_URL) {
      console.error("Function Configuration Error: GOOGLE_APPS_SCRIPT_URL is not set.");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data logged but could not be sent to Google Sheets." }),
      };
    }

    // --- NEW STRATEGY: Send data as URL query parameters in a GET request ---
    // This avoids the POST-to-GET redirect issue with Google Apps Script.
    const queryParams = new URLSearchParams({
        // Sanitize data by using || '' to ensure we don't send 'undefined'
        firstName: userData['first-name'] || '',
        lastName: userData['last-name'] || '',
        email: userData['business-email'] || '',
        company: userData['company'] || '',
        phone: userData['telephone'] || ''
    });

    const requestUrl = `${GOOGLE_APPS_SCRIPT_URL}?${queryParams.toString()}`;

    // Make a simple GET request.
    const response = await fetch(requestUrl);

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error from Google Apps Script: ${response.status} ${response.statusText}`, errorBody);
    }
    
    // Always return a success response to the frontend client to ensure the UI transitions smoothly.
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data received successfully." }),
    };

  } catch (error) {
    console.error("Error processing submission:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "There was an error processing your submission." }),
    };
  }
};
