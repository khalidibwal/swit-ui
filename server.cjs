const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Konfigurasi API Midtrans Production (PENTING: Gunakan Key Production Anda via .env)
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'MASUKKAN_SERVER_KEY_DISINI';
const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || 'MASUKKAN_CLIENT_KEY_DISINI';
const BASE_URL = 'https://app.midtrans.com/snap/v1/transactions';

// 2. Buat Base64 Authorization Header (ServerKey:)
const authHeader = Buffer.from(SERVER_KEY + ':').toString('base64');

app.post('/api/payment', async (req, res) => {
    try {
        const { orderId, amount, customerDetails } = req.body;
        
        console.log(`[LOG] Memproses Pembayaran: ${orderId} - Rp${amount}`);

        // 3. Parameter Transaksi
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

        // 4. Minta Snap Token menggunakan fetch manual ke API Midtrans
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
            console.error("[ERROR] Midtrans Response:", result);
            // Memberikan detail error ke frontend agar tahu penyebab 401
            return res.status(response.status).json({ 
                error: result.error_messages ? result.error_messages[0] : "Midtrans API Error",
                status: response.status,
                raw: result 
            });
        }

        console.log(`[LOG] Snap Token Berhasil: ${result.token}`);
        res.json({ token: result.token });
        
    } catch (error) {
        console.error("[ERROR] Server Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(` SERVER MIDTRANS PRODUCTION AKTIF      `);
    console.log(` PORT: ${PORT}                          `);
    console.log(` SERVER KEY (MASKED): ${SERVER_KEY.substring(0, 10)}...${SERVER_KEY.slice(-5)}`);
    console.log(`========================================`);
});
