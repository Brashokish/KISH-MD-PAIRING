let cluster = require('cluster')
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
const path = require('path');

// Import the pair.js and qr.js routers
let code = require('./pair');
let qr = require('./qr'); // Make sure to create qr.js as shown previously

// Set the maximum number of listeners
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);
app.use('/qr', qr); // Use the QR router
app.use('/pair', async (req, res, next) => {
    res.sendFile(path.join(__dirname, 'pair.html')); // Ensure pair.html is in the same directory
});
app.use('/', async (req, res, next) => {
    res.sendFile(path.join(__dirname, 'main.html')); // Ensure main.html is in the same directory
});

// Start the server
app.listen(PORT, () => {
    console.log(`
Don't Forget To Give Star

Kish Pairing Server running on http://localhost:${PORT}`);
});

module.exports = app;
