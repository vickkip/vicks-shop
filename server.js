const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const SECRET_KEY = "vicks_super_secret_key"; 
const myMongoLink = "mongodb://vick_admin:admin123@ac-wulhqg4-shard-00-00.awsuwdm.mongodb.net:27017,ac-wulhqg4-shard-00-01.awsuwdm.mongodb.net:27017,ac-wulhqg4-shard-00-02.awsuwdm.mongodb.net:27017/?replicaSet=atlas-bb6qdv-shard-0&ssl=true&authSource=admin";

mongoose.connect(myMongoLink)
  .then(() => console.log('✅ Secure MongoDB Connected'))
  .catch((err) => console.log('❌ Connection Error:', err));

// --- SCHEMAS ---
const productSchema = new mongoose.Schema({
    name: String, 
    description: String, 
    price: Number, 
    image: String // Added for photos
});
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ username: req.body.username, password: hashedPassword });
        await newUser.save();
        res.json({ message: "User registered!" });
    } catch (e) { res.status(400).json({ message: "Username taken" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) {
        return res.status(400).json({ message: "Invalid Credentials" });
    }
    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// --- PRODUCT ROUTES ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send("Login required");
    jwt.verify(token, SECRET_KEY, (err) => {
        if (err) return res.status(401).send("Expired");
        next();
    });
};

app.get('/api/products', async (req, res) => {
    res.json(await Product.find());
});

app.post('/api/products', verifyToken, async (req, res) => {
    const newProd = new Product(req.body);
    await newProd.save();
    res.json({ message: "Saved!" });
});

app.delete('/api/products/:id', verifyToken, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted!" });
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));