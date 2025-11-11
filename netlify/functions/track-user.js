// File: netlify/functions/track-user.js

exports.handler = async function(event) {
  // This function now primarily handles POST requests from the frontend form.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { GOOGLE_APPS_SCRIPT_URL } = process.env;

  try {
    const userData = JSON.parse(event.body);
    console.log("New ROI Calculator Lead:", userData);

    if (!GOOGLE_APPS_SCRIPT_URL) {
      console.error("Function Configuration Error: GOOGLE_APPS_SCRIPT_URL is not set.");
      // Still return success to the user, as the lead is logged.
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data logged but could not be sent to Google Sheets." }),
      };
    }

    // --- ROBUST STRATEGY: Send data as URL query parameters in a GET request ---
    // This is a reliable workaround for the POST-to-GET redirect issue with Google Apps Script.
    const queryParams = new URLSearchParams({
        firstName: userData['first-name'] || '',
        lastName: userData['last-name'] || '',
        email: userData['business-email'] || '',
        company: userData['company'] || '',
        phone: userData['telephone'] || ''
    });

    const requestUrl = `${GOOGLE_APPS_SCRIPT_URL}?${queryParams.toString()}`;

    // Make the GET request to the Google Apps Script.
    const response = await fetch(requestUrl);

    if (!response.ok) {
        const errorBody = await response.text();
        // Log the error for debugging but don't block the user.
        console.error(`Error from Google Apps Script: ${response.status} ${response.statusText}`, errorBody);
    }
    
    // Always return a success response to the frontend client. This ensures a smooth user experience
    // even if the Google Sheets integration has a problem. The lead is still captured in the Netlify logs.
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data received successfully." }),
    };

  } catch (error) {
    console.error("Error processing submission:", error);
    // Return a generic server error but don't expose details to the client.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "There was an error processing your submission." }),
    };
  }
};
