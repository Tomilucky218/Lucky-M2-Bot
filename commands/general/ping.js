/**
 * Advanced Ping Command - Full Bot Diagnostics
 */
const config = require('../../config');
const os = require('os');

module.exports = {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check bot latency and system performance',
  usage: '.ping',

  async execute(sock, msg, args, extra) {
    try {
      // Start the timer
const start = Date.now();

// Perform a harmless async operation to WhatsApp
// This will actually await a round-trip without sending a message
await sock.fetchStatus(extra.from);

// Stop the timer
const end = Date.now();

// Calculate latency in ms
const messageLatency = end - start;



      // WebSocket latency (Baileys)
      const wsLatency = sock?.user
  ? 'Connected ✅'
  : 'Disconnected ❌';

      // System uptime
      const systemUptime = formatTime(process.uptime());
      const serverUptime = formatTime(os.uptime());

      // RAM usage
      const totalMem = os.totalmem() / 1024 / 1024 / 1024;
      const freeMem = os.freemem() / 1024 / 1024 / 1024;
      const usedMem = totalMem - freeMem;


      // CPU load
      const cpuLoad = os.loadavg()[0].toFixed(2);

      const response = `

> ⚡ *ᴍᴇꜱꜱᴀɢᴇ ʟᴀᴛᴇɴᴄʏ:* ${messageLatency} ms
> 🌐 *ᴄᴏɴɴᴇᴄᴛɪᴏɴ:* ${wsLatency}
> 🧠 *ʀᴀᴍ ᴜꜱᴀɢᴇ:* ${usedMem.toFixed(2)}GB / ${totalMem.toFixed(2)}GB
> 📊 *ᴄᴘᴜ ʟᴏᴀᴅ:* ${cpuLoad}
> 🧬 *ᴠᴇʀꜱɪᴏɴ:* ${config.version}
> ⏱️ *ʙᴏᴛ ᴜᴘᴛɪᴍᴇ:* ${systemUptime}
> 🖥️ *ꜱᴇʀᴠᴇʀ ᴜᴘᴛɪᴍᴇ:* ${serverUptime}

`;

      await sock.sendMessage(extra.from, {
  text: response.trim(),
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363420656466131@newsletter',
      newsletterName: '𝙇𝙐𝘾𝙆𝙔 𝙈2 𝘽𝙊𝙏 ✔',
      serverMessageId: -1
    }
  }
}, { quoted: msg });

    } catch (error) {
      console.error('Ping Error:', error);
      await extra.reply(`❌ *Ping Failed!*\n${error.message}`);
    }
  }
};


/**
 * Format seconds into readable time
 */
function formatTime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);

  return [
    d > 0 ? d + "d" : null,
    h > 0 ? h + "h" : null,
    m > 0 ? m + "m" : null,
    s > 0 ? s + "s" : null
  ].filter(Boolean).join(" ") || "0s";
}