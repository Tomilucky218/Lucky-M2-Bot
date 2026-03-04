const axios = require('axios');

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'pair',
    aliases: ['pcode'],
    category: 'general',
    description: 'Generate a WhatsApp pairing code for one or more numbers',
    usage: '.pair <number1,number2,...>',

    async execute(sock, msg, args, extra) {
        try {
            // Make sure args is always a string
            const q = Array.isArray(args) ? args.join(' ') : String(args || '');
            if (!q) {
                return await sock.sendMessage(extra.from, {
                    text: "❌ Please provide a valid WhatsApp number.\nExample: .pair 2567899XXXXX"
                }, { quoted: msg });
            }

            const numbers = q.split(',')
                .map(v => v.replace(/[^0-9]/g, ''))
                .filter(v => v.length > 5 && v.length < 20);

            if (numbers.length === 0) {
                return await sock.sendMessage(extra.from, {
                    text: "❌ Invalid number! Please use the correct format."
                }, { quoted: msg });
            }

            for (const number of numbers) {
                const whatsappID = number + '@s.whatsapp.net';

                // Safety: check whatsappID is string
                if (typeof whatsappID !== 'string') continue;

                const result = await sock.onWhatsApp(whatsappID);

                if (!result?.[0]?.exists) {
                    await sock.sendMessage(extra.from, {
                        text: `⚠️ That number (${number}) is not registered on WhatsApp.`
                    }, { quoted: msg });
                    continue;
                }

                await sock.sendMessage(extra.from, {
                    text: `⏳ Generating pairing code for ${number}, please wait...`
                }, { quoted: msg });

                await sleep(1000);

                try {
                    const response = await axios.get(`https://lucky-tech-hub-bot-pair-code-1.onrender.com/pair?number=${number}`);
                    const code = response?.data?.code;

                    if (!code) throw new Error('Invalid response from server');
                    if (code === "Service Unavailable") throw new Error('Service Unavailable');

                    await sleep(1000);
                    await sock.sendMessage(extra.from, {
                        text:`${code}`
                    }, { quoted: msg });
                } catch (apiError) {
                    console.error('API Error:', apiError);
                    const errorMessage = apiError.message === 'Service Unavailable'
                        ? "⚠️ Service is currently unavailable. Please try again later."
                        : "❌ Failed to generate pairing code. Please try again later.";

                    await sock.sendMessage(extra.from, { text: errorMessage }, { quoted: msg });
                }
            }
        } catch (error) {
            console.error("Pair command error:", error);
            await sock.sendMessage(extra.from, {
                text: "⚠️ An unexpected error occurred. Please try again later."
            }, { quoted: msg });
        }
    }
};