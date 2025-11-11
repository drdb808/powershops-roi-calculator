// File: netlify/functions/track-user.js

exports.handler = async function(event) {
  // This function only accepts POST requests.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const userData = JSON.parse(event.body);

    // --- This is where you "track" the user details ---

    // For now, we'll simply log the data. You can view these logs
    // in your Netlify site dashboard under the "Functions" tab.
    console.log("New ROI Calculator Lead:", userData);

    // In a real-world scenario, you could send this data to another service:
    // - Add a row to a Google Sheet
    // - Create a contact in a CRM like HubSpot
    // - Save the user to a database

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