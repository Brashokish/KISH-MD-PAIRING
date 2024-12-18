const express = require('express');
const fs = require('fs');
const pino = require("pino");
const { toBuffer } = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay
} = require("@whiskeysockets/baileys");

const router = express.Router();
const sessionFolder = './img';

// Cleanup session folder if it exists
if (fs.existsSync(sessionFolder)) {
    try {
        fs.rmdirSync(sessionFolder, { recursive: true });
        console.log('Deleted the "session" folder.');
    } catch (err) {
        console.error('Error deleting the "session" folder:', err);
    }
}

router.get('/', async (req, res) => {
    let qrSent = false; // Track if the QR has been sent to prevent multiple responses

    async function startBot() {
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

        try {
            const conn = makeWASocket({
                auth: state,
                logger: pino({ level: 'fatal' }),
                printQRInTerminal: false,
                browser: ["𝐁𝐫𝐚𝐬𝐡𝐨 𝐊𝐢𝐬𝐡", "Safari", "3.0"],
            });

            conn.ev.on('connection.update', async (update) => {
                const { connection, qr, lastDisconnect } = update;

                if (qr && !qrSent) {
                    // Generate QR code buffer and send as binary response
                    const qrBuffer = await toBuffer(qr);
                    qrSent = true; // Prevent multiple responses
                    res.writeHead(200, { 'Content-Type': 'image/png' });
                    res.end(qrBuffer);
                }

                if (connection === 'open') {
                    console.log("WhatsApp connection established.");

                    // Send session file as a document
                    const sessionFilePath = `${sessionFolder}/creds.json`;
                    if (fs.existsSync(sessionFilePath)) {
                        const sessionFile = fs.readFileSync(sessionFilePath);
                        await conn.sendMessage(conn.user.id, {
                            document: sessionFile,
                            mimetype: 'application/json',
                            fileName: 'creds.json'
                        });
                    }

                    // Send welcome message with image
                    const welcomeMessage = `Hi, you are successfully connected!\n\nHere is your session file.\n\nHave fun and have a great day ahead!`;
                    await conn.sendMessage(conn.user.id, {
                        image: { url: 'https://telegra.ph/file/9ae2ef1de51e0683cb506.jpg' },
                        caption: welcomeMessage
                    });

                    // Wait before exiting
                    await delay(5000);
                    process.exit(0);
                }

                if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    startBot();
                }
            });

            conn.ev.on('creds.update', saveCreds);

        } catch (error) {
            console.error("Error starting bot:", error);
            if (!res.headersSent) {
                res.status(500).send({ error: "Failed to initialize bot" });
            }
        }
    }

    startBot();
});

const app = express();
const PORT = 3000;

app.use('/', router);

app.listen(PORT, () => console.log(`App running on port ${PORT}`));
