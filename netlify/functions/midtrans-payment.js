const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Hanya izinkan metode POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { orderId, amount, customerDetails } = JSON.parse(event.body);

    // Konfigurasi Midtrans (WAJIB gunakan Environment Variable di Netlify)
    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!SERVER_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "MIDTRANS_SERVER_KEY is not defined in environment variables" }) };
    }
    const BASE_URL = 'https://app.midtrans.com/snap/v1/transactions';
    
    const authHeader = Buffer.from(SERVER_KEY + ':').toString('base64');

    const payload = {
      "transaction_details": {
        "order_id": orderId,
        "gross_amount": amount
      },
      "credit_card": {
        "secure": true
      },
      "customer_details": customerDetails
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: result.error_messages ? result.error_messages[0] : "Midtrans Error", raw: result })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: result.token })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
