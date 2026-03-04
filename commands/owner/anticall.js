

const { loadData, saveData } = require('../../utils/anticallManager');



module.exports = {
  name: 'anticall',
  category: 'owner',
  ownerOnly: true,
  description: 'Enable or disable anti-call system',
  usage: '.anticall on/off/status',

  async execute(sock, msg, args, extra) {
    const data = loadData();

    if (!args[0]) {
  return sock.sendMessage(msg.key.remoteJid, {
    text:
      `╭═✦〔⚙️ *ᴀ.ᴄ ꜱᴇᴛᴛɪɴɢꜱ* 〕✦═╮\n│\n` +
      `│📵 Anti-Call: ${data.enabled ? 'ON ✅' : 'OFF ❌'}\n│\n` +
      `│ *ᴄᴏᴍᴍᴀɴᴅꜱ*\n` +
      `│ .anticall on\n` +
      `│ .anticall off\n` +
      `│ .anticall status\n` +
      `╰═❀═════════════❀═╯`,
    contextInfo: {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363420656466131@newsletter",
        newsletterName: "Lucky M2 Bot",
        serverMessageId: -1
      }
    }
  }, { quoted: msg });
}

    const option = args[0].toLowerCase();

    if (option === 'status') {
      return extra.reply(
        `⚙️ Anti-Call Status: ${data.enabled ? '✅ ON' : '❌ OFF'}`
      );
    }

    if (!['on', 'off'].includes(option)) {
      return extra.reply('Usage: .anticall on/off/status');
    }

    data.enabled = option === 'on';
    saveData(data);

    return extra.reply(
      data.enabled
        ? '✅ Anti-call enabled. Caller will be warned 3 times before blocking.'
        : '❌ Anti-call disabled.'
    );
  }
};