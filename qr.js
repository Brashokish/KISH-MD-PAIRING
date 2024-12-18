const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

// Route to generate QR code
router.get('/generate', async (req, res) => {
    const code = req.query.code; // Get the pairing code from the query parameter

    // Check if the code parameter is provided
    if (!code) {
        return res.status(400).send({ error: 'Pairing code is required' });
    }

    try {
        // Generate QR code as a data URL
        const qrImage = await QRCode.toDataURL(code);
        // Send the QR code image as an HTML image tag
        res.send(`<img src="${qrImage}" alt="QR Code" />`);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Failed to generate QR code' });
    }
});

// Export the router
module.exports = router;
