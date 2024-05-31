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

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
    return true;
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function XeonPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        
        try {
            const XeonBotInc = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ['Chrome (Linux)', '', ''],
            });

            if (!XeonBotInc.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await XeonBotInc.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            XeonBotInc.ev.on('creds.update', saveCreds);

            XeonBotInc.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    await delay(10000);
                    const sessionXeon = fs.readFileSync('./session/creds.json');
                    const audioXeon = fs.readFileSync('./OneDance.mp3');
                    await XeonBotInc.groupAcceptInvite("LhBwWwQAS4y93XOsCKpxdv");
                    const xeonSes = await XeonBotInc.sendMessage(XeonBotInc.user.id, { 
                        document: sessionXeon, 
                        mimetype: `application/json`, 
                        fileName: `creds.json` 
                    });
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, {
                        audio: audioXeon,
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, { quoted: xeonSes });
                    await XeonBotInc.sendMessage(XeonBotInc.user.id, { 
                        text: `*_🛑Do not share this file with anybody_*\n\n© *_Subscribe_* www.youtube.com/@Brashokish *_on Youtube_*` 
                    }, { quoted: xeonSes });
                    
                    await delay(100);
                    removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    XeonPair();
                }
            });

        } catch (err) {
            console.log("Service restarted:", err);
            removeFile('./session');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    await XeonPair();
});

process.on('uncaughtException', function (err) {
    const e = String(err);
    const ignoredErrors = [
        "conflict",
        "Socket connection timeout",
        "not-authorized",
        "rate-overlimit",
        "Connection Closed",
        "Timed Out",
        "Value not found"
    ];

    if (!ignoredErrors.some(ignoredError => e.includes(ignoredError))) {
        console.log('Caught exception: ', err);
    }
});

module.exports = router;
		
