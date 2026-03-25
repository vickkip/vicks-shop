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

// 2. M-Pesa Setup
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

// 4. Product Schema
const Product = mongoose.model('Product', new mongoose.Schema({ name: String, price: Number }));

// --- API ROUTES ---

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json({ message: "Product added!" });
    } catch (err) { res.status(500).json({ error: "Failed to add" }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) { res.status(500).json({ error: "Failed to delete" }); }
});

app.post('/api/mpesa/push', async (req, res) => {
    const { phone, amount } = req.body;
    const formattedPhone = "254" + phone.substring(1); 
    try {
        const token = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

        const stkData = {
            BusinessShortCode: shortCode, Password: password, Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline", Amount: amount,
            PartyA: formattedPhone, PartyB: shortCode, PhoneNumber: formattedPhone,
            CallBackURL: "https://vicks-shop.onrender.com/api/callback",
            AccountReference: "EldoretComp", TransactionDesc: "Tech Purchase"
        };

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", stkData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Push failed" });
    }
});

// 5. Serving Static Files
app.use(express.static(path.join(__dirname)));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));
app.get('(.*)', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Eldoret Computer Tech Server Live` ));