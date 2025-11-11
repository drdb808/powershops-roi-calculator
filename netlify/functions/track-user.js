// File: netlify/functions/track-user.js

exports.handler = async function(event) {
  // This function must be triggered by a POST request from the frontend form.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { GOOGLE_APPS_SCRIPT_URL } = process.env;

  try {
    const userData = JSON.parse(event.body);
    console.log("New ROI Calculator Lead:", userData);

    if (!GOOGLE_APPS_SCRIPT_URL) {
      console.error("Function Configuration Error: GOOGLE_APPS_SCRIPT_URL is not set in Netlify.");
      // This is a server-side configuration issue. We still tell the user it was successful
      // because the lead is captured in these logs.
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data logged but could not be sent to Sheets due to missing config." }),
      };
    }

    // --- STRATEGY: Send data as URL query parameters in a GET request ---
    // This avoids the POST-to-GET redirect issue with Google Apps Script.
    const queryParams = new URLSearchParams({
        firstName: userData['first-name'] || '',
        lastName: userData['last-name'] || '',
        email: userData['business-email'] || '',
        company: userData['company'] || '',
        phone: userData['telephone'] || ''
    });

    const requestUrl = `${GOOGLE_APPS_SCRIPT_URL}?${queryParams.toString()}`;

    // --- DIAGNOSTIC LOGGING ---
    console.log("Constructed Google Apps Script URL:", requestUrl);

    // Make the GET request to the Google Apps Script.
    const response = await fetch(requestUrl);
    const responseBody = await response.text();

    // --- DIAGNOSTIC LOGGING ---
    console.log(`Google Apps Script Response Status: ${response.status}`);
    console.log("Google Apps Script Response Body:", responseBody);

    if (!response.ok) {
        // Log the error for debugging but don't block the user.
        console.error(`Error from Google Apps Script: ${response.status} ${response.statusText}`, responseBody);
    }
    
    // Always return a success response to the frontend client. This ensures a smooth user experience
    // even if the Google Sheets integration has a problem. The lead is still captured in Netlify logs.
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data received and processed." }),
    };

  } catch (error) {
    console.error("Critical Error in track-user function:", error);
    // Return a generic server error.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An internal error occurred." }),
    };
  }
};
