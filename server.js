const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Database Connection (Ensure MONGO_URI is in Render Environment)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// 2. M-Pesa Setup (Universal Sandbox Credentials)
const consumerKey = process.env.MPESA_CONSUMER_KEY || "BC6UQSYwkNW2cuzUQrObeVO7ADo7SmC8Ud1OZQAUWbjyHEHn";
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || "WG5mBC5MioPjKCNDy0Ul1AYLjURaS5m3PZX3oJ4rkeh6sZ5bZZH0db8jS1P48mAF";
const shortCode = "174379"; 
const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

// 3. Helper: Generate M-Pesa Access Token
const getAccessToken = async () => {
    try {
        const k = consumerKey ? consumerKey.trim() : "";
        const s = consumerSecret ? consumerSecret.trim() : "";
        const auth = Buffer.from(`${k}:${s}`).toString('base64');
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ TOKEN ERROR:", error.response ? JSON.stringify(error.response.data) : error.message);
        throw error;
    }
};

// 4. API: Products
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number }));
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

// 5. API: M-Pesa STK Push
app.post('/api/mpesa/push', async (req, res) => {
    const { phone, amount } = req.body;
    const formattedPhone = "254" + phone.substring(1); 

    try {
        const token = await getAccessToken();
        const date = new Date();
        const timestamp = date.getFullYear() +
            ("0" + (date.getMonth() + 1)).slice(-2) +
            ("0" + date.getDate()).slice(-2) +
            ("0" + date.getHours()).slice(-2) +
            ("0" + date.getMinutes()).slice(-2) +
            ("0" + date.getSeconds()).slice(-2);

        const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

        const stkData = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: "https://vicks-shop.onrender.com/api/callback", 
            AccountReference: "VicksShop",
            TransactionDesc: "Payment"
        };

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", stkData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(200).json(response.data);
    } catch (err) {
        console.error("❌ PUSH ERROR:", err.response ? JSON.stringify(error.response.data) : err.message);
        res.status(500).json({ error: "Push failed" });
    }
});

// 6. Serving Files
app.use(express.static(path.join(__dirname)));

// Specific route for success page
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Catch-all route for index.html (Required for SPA feel and path-to-regexp fix)
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));