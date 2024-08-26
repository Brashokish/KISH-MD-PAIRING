const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');

const code = require('../pair'); // Adjust path if needed

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route for /code
app.use('/code', code);

// Serve HTML files
app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, '../pair.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../main.html'));
});

// Export the serverless function
module.exports = (req, res) => {
    return app(req, res);
};
