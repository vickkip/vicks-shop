const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 2. Data Schemas
const Product = mongoose.model('Product', new mongoose.Schema({
    name: String,
    price: Number,
    description: String
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    productName: String,
    customerPhone: String,
    amount: Number,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
}));

// 3. API Routes
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Route to handle the "Buy" request
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        console.log("🔔 New Order Received:", req.body);
        res.status(200).json({ message: "Order saved successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save order" });
    }
});

// 4. Serve Frontend
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server active on port ${PORT}`));