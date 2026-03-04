const { getAnti, setAnti } = require('../../data/antidel');
const config = require('../../config'); // import your bot config

module.exports = {
  name: 'antidelete',
  aliases: ['antidel', 'del'],
  category: 'owner',
  description: 'Toggle anti-delete feature',
  usage: '.antidelete <on/off/status>',

  async execute(sock, msg, args, extra) {
    const { reply } = extra;

    try {
      // ======== Owner Check ========
      // Extract sender number safely
const senderNumber = msg.key.fromMe
  ? sock.user.id.split(":")[0] // bot itself
  : msg.key.participant?.split("@")[0] || msg.key.remoteJid?.split("@")[0] || "";

// Normalize sender
const normalizedSender = String(senderNumber).replace(/\D/g, '');

// Normalize all owner numbers
const normalizedOwners = (config.ownerNumber || []).map(num => String(num).replace(/\D/g, ''));

// Check if sender is one of the owners
const isOwner = normalizedOwners.includes(normalizedSender);

if (!isOwner) {
  return reply('❌ This command is only for the bot owner');
}

      // ======== Fetch Current Anti-Delete Status ========
      const currentStatus = await getAnti();

      // ======== If No Argument or Status ========
      if (!args[0] || args[0].toLowerCase() === 'status') {
        return reply(`〔⚙️ 𝗔𝗡𝗧𝗜-𝗗𝗘𝗟𝗘𝗧𝗘  ✓〕

🔹 *Current Status:* ${currentStatus ? '✅ 𝗢𝗡' : '❌ 𝗢𝗙𝗙'}
> *Description:* Automatically keeps deleted messages visible

🛠️ *Usage Commands:*
💠 *.antidelete on*     → Enable
💠 *.antidelete off*    → Disable
💠 *.antidelete*        → Check Status

> 🔰 *Powered by LUCKY M2 BOT*
`);
      }

      // ======== Handle Arguments ========
      const action = args[0].toLowerCase().trim();

      if (action === 'on') {
        await setAnti(true);
        return reply('✅ Anti-delete has been enabled');
      }

      if (action === 'off') {
        await setAnti(false);
        return reply('❌ Anti-delete has been disabled');
      }

      // ======== Invalid Command ========
      return reply(`〔 ❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗖𝗢𝗠𝗠𝗔𝗡𝗗〕

⚠️ You entered an invalid command!

🛠️ *Usage Commands:*
💠 *.antidelete on*     → Enable
💠 *.antidelete off*    → Disable
💠 *.antidelete status* → Check Status

> 🔰 *Powered by LUCKY M2 BOT*
` );

    } catch (err) {
      console.error('[AntiDelete Command Error]', err);
      return reply(`❌ Error executing command:\n${err.message}`);
    }
  }
};