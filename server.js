const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// 2. M-Pesa Configuration (Environment Variables)
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = "174379"; 
const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

// 3. Helper: Generate Access Token
const getAccessToken = async () => {
    try {
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ M-Pesa Token Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

// 4. API: Products
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number, description: String }));
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: "Could not load products" });
    }
});

// 5. API: M-Pesa STK Push
app.post('/api/mpesa/push', async (req, res) => {
    const { phone, amount } = req.body;
    const formattedPhone = "254" + phone.substring(1); 

    try {
        const token = await getAccessToken();
        
        // Generate Timestamp
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
            TransactionDesc: "Payment for Goods"
        };

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", stkData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        res.status(200).json(response.data);
    } catch (err) {
        console.error("❌ M-Pesa Push Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: "STK Push failed" });
    }
});

// 6. Serve Frontend (Fixed PathError Fix)
app.use(express.static(path.join(__dirname)));

// We use (.*) instead of * to prevent the "Missing parameter name" error
app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));