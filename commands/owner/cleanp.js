const fs = require('fs');
const path = require('path');

const channelInfo = {
  contextInfo: {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363420656466131@newsletter',
      newsletterName: 'Lucky Tech Hub Bot',
      serverMessageId: -1
    }
  }
};

module.exports = {
  name: 'cleanprekeys',
  aliases: ['clearpk', 'optimizekeys'],
  category: 'owner',
  description: 'Safely remove old unused pre-key session files',
  usage: '.cleanp',

  async execute(sock, msg, args, extra) {
    try {
      const chatId = msg.key.remoteJid;

      if (!msg.key.fromMe) {
        return await sock.sendMessage(chatId, {
          text: '❌ Owner only command.',
          ...channelInfo
        }, { quoted: msg });
      }

      const sessionDir = path.join(__dirname, '../../session');

      if (!fs.existsSync(sessionDir)) {
        return await sock.sendMessage(chatId, {
          text: '❌ Session directory not found!',
          ...channelInfo
        }, { quoted: msg });
      }

      const files = fs.readdirSync(sessionDir);
      const now = Date.now();

// 🔥 Delete pre-keys older than 6 hours
const HOURS_OLD = 6;
const maxAge = HOURS_OLD * 60 * 60 * 1000;

      let deleted = 0;
      let kept = 0;

      for (const file of files) {
        if (!file.startsWith('pre-key-')) continue;

        const filePath = path.join(sessionDir, file);
        const stats = fs.statSync(filePath);

        if ((now - stats.mtimeMs) > maxAge) {
          try {
            fs.unlinkSync(filePath);
            deleted++;
          } catch {
            kept++;
          }
        } else {
          kept++;
        }
      }

      await sock.sendMessage(chatId, {
        text:
`╭══✦〔 *ᴘʀᴇ-ᴋᴇʏ ᴏᴘᴛɪᴍɪᴢᴇᴅ* 〕✦═╮
│
┊⭘ 🗑 ᴅᴇʟᴇᴛᴇᴅ ᴏʟᴅ ᴘʀᴇ-ᴋᴇʏꜱ: *${deleted}*
┊⭘ 🔐 ᴋᴇᴘᴛ ʀᴇᴄᴇɴᴛ ᴘʀᴇ-ᴋᴇʏꜱ: *${kept}*
┊⭘ ⏳ ʀᴇᴍᴏᴠᴇᴅ ꜰɪʟᴇꜱ ᴏʟᴅᴇʀ ᴛʜᴀɴ: *${HOURS_OLD}ʜ*
│
╰═✦═✦═✦═✦═✦═✦═✦═✦═✦═╯

✅ Session optimized safely without breaking login.`,
        ...channelInfo
      }, { quoted: msg });

    } catch (error) {
      console.error('Error cleaning pre-keys:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Failed to clean pre-keys safely.',
        ...channelInfo
      }, { quoted: msg });
    }
  }
};