const express = require('express');
const bodyParser = require('body-parser');
const { useMultiFileAuthState, makeWASocket, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve HTML files
app.use('/pair', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.use('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

// Pairing function
async function XeonPair(num, res) {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
        console.log("Starting XeonPair function...");

        const XeonBotInc = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: ["Chrome (Linux)", "", ""]
        });

        if (!XeonBotInc.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await XeonBotInc.requestPairingCode(num);
            if (!res.headersSent) {
                await res.send({ code });
            }
        }

        XeonBotInc.ev.on('creds.update', saveCreds);
        XeonBotInc.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === "open") {
                console.log("Connection established.");
                await delay(10000);
                // Handle successful connection here
            } else if (connection === 'close') {
                console.log("Connection closed:", lastDisconnect.error);
            }
        });

    } catch (error) {
        console.error("Error in XeonPair:", error);
        if (!res.headersSent) {
            res.status(500).send({ error: "Internal Server Error" });
        }
    }
}

// Endpoint to initiate pairing
app.post('/start-pairing', async (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    await XeonPair(phoneNumber, res);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Utility function for delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
