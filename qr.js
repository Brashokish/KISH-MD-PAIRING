const express = require('express');
const fs = require('fs');
const pino = require("pino");
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
                printQRInTerminal: true, // Enable QR code display in terminal
                browser: ["Chrome (Linux)", "", ""],
            });

            XeonBotInc.ev.on('creds.update', saveCreds);

            XeonBotInc.ev.on("connection.update", async (update) => {
                const { connection, qr, lastDisconnect } = update;

                if (qr) {
                    // Send the QR code as a response if needed
                    if (!res.headersSent) {
                        res.send({ qr });
                    }
                }

                if (connection === "open") {
                    console.log("WhatsApp connection established.");
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
