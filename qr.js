const express = require('express');
const fs = require('fs');
const pino = require("pino");
const QRCode = require("qrcode");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    async function XeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            const XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                printQRInTerminal: false, // Disable terminal QR code printing
                browser: ["Chrome (Linux)", "", ""],
            });

            XeonBotInc.ev.on('creds.update', async () => {
                const credsFilePath = './cred.js';
                const credsData = JSON.stringify(state, null, 2);
                fs.writeFileSync(credsFilePath, `module.exports = ${credsData};`);
            });

            XeonBotInc.ev.on("connection.update", async (update) => {
                const { connection, qr, lastDisconnect } = update;

                if (qr) {
                    QRCode.toDataURL(qr, (err, url) => {
                        if (err) {
                            console.error("Failed to generate QR code:", err);
                            if (!res.headersSent) {
                                res.status(500).send({ error: "Failed to generate QR code" });
                            }
                            return;
                        }
                        if (!res.headersSent) {
                            res.send(`
                                <html>
                                <head>
                                    <title>QR Code</title>
                                    <style>
                                        body {
                                            display: flex;
                                            justify-content: center;
                                            align-items: center;
                                            height: 100vh;
                                            margin: 0;
                                            background: #f9f9f9;
                                            font-family: Arial, sans-serif;
                                        }
                                        img {
                                            width: 250px;
                                            height: 250px;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <img src="${url}" alt="QR Code" />
                                    <p>Scan this QR code to pair with WhatsApp.</p>
                                </body>
                                </html>
                            `);
                        }
                    });
                }

                if (connection === "open") {
                    console.log("WhatsApp connection established.");
                    if (!res.headersSent) {
                        res.download('./cred.js', 'cred.js', (err) => {
                            if (err) {
                                console.error("Failed to send credentials file:", err);
                            }
                            removeFile('./cred.js');
                        });
                    }
                    await delay(10000);
                    removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    XeonPair();
                }
            });
        } catch (err) {
            console.log("Service restarted due to error:", err);
            removeFile('./session');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    return XeonPair();
});

process.on('uncaughtException', (err) => {
    const e = String(err);
    if (
        e.includes("conflict") ||
        e.includes("Socket connection timeout") ||
        e.includes("not-authorized") ||
        e.includes("rate-overlimit") ||
        e.includes("Connection Closed") ||
        e.includes("Timed Out") ||
        e.includes("Value not found")
    ) return;
    console.log("Caught exception:", err);
});

module.exports = router;
