/**
 * Menu Command - Display all available commands
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',
  
  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};
      
      // Group commands by category
      commands.forEach((cmd, name) => {
        if (cmd.name === name) { // Only count main command names, not aliases
          if (!categories[cmd.category]) {
            categories[cmd.category] = [];
          }
          categories[cmd.category].push(cmd);
        }
      });
      
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
      const displayOwner = ownerNames[0] || config.ownerName || 'Bot Owner';
      
      let menuText = `*╭━═✦〔 ${config.botName} 〕✦═━╮*\n`;
      menuText += `*│👋 ʜᴇʟʟᴏ* @${extra.sender.split('@')[0]}!\n`;
      menuText += `*│⚡ ᴘʀᴇꜰɪx:* [${config.prefix}]\n`;
      menuText += `*│🧬 ᴠᴇʀꜱɪᴏɴ:* ${config.version}\n`;
      menuText += `*│📦 ᴛᴏᴛᴀʟ ᴄᴏᴍᴍᴀɴᴅꜱ:* ${commands.size}\n`;
      menuText += `*│👤 ᴏᴡɴᴇʀ:* ${displayOwner}\n`;
      menuText += `*│👑 ᴅᴇᴠ     : ʟᴜᴄᴋʏ ➋➊➑*\n`;
      menuText += `*│🌐 ᴄᴏᴜɴᴛʀʏ:* ᴜɢᴀɴᴅᴀ 🇺🇬\n`;
      menuText += `*╰═✪═════════════✪═╯*
      \n\n`;
      
      // General Commands
      if (categories.general) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🧭 *ɢᴇɴᴇʀᴀʟ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.general.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // AI Commands
      if (categories.ai) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🤖 *ᴀɪ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.ai.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Group Commands
      if (categories.group) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🔵 *ɢʀᴏᴜᴘ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.group.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Admin Commands
      if (categories.admin) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🛡️ *ᴀᴅᴍɪɴ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.admin.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Owner Commands
      if (categories.owner) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 👑 *ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.owner.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Media Commands
      if (categories.media) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🎞️ *ᴍᴇᴅɪᴀ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.media.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Fun Commands
      if (categories.fun) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🎭 *ꜰᴜɴ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.fun.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
      // Utility Commands
      if (categories.utility) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🔧 *ᴜᴛɪʟɪᴛʏ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.utility.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }

       // Anime Commands
       if (categories.anime) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 👾 *ᴀɴɪᴍᴇ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.anime.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }

       // Textmaker Commands
       if (categories.utility) {
        menuText += `╭═✪═════════════✪═━\n`;
        menuText += `│ 🖋️ *ᴛᴇxᴛᴍᴀᴋᴇʀ ᴄᴏᴍᴍᴀɴᴅ*\n`;
        menuText += `├═✪═════════════✪═╮\n`;
        categories.textmaker.forEach(cmd => {
          menuText += `│ ➠ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╰═❀═════════════❀═╯\n\n`;
      }
      
   
      menuText += `💡 ᴛʏᴘᴇ *${config.prefix}ʜᴇʟᴘ* <ᴄᴏᴍᴍᴀɴᴅ> ꜰᴏʀ ᴍᴏʀᴇ ɪɴꜰᴏ\n`;
      
      // Send menu with image
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
      
      if (fs.existsSync(imagePath)) {
        // Send image with newsletter forwarding context
        const imageBuffer = fs.readFileSync(imagePath);
        await sock.sendMessage(extra.from, {
          image: imageBuffer,
          caption: menuText,
          mentions: [extra.sender],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.newsletterJid || '120363420656466131@newsletter',
              newsletterName: config.botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } else {
        await sock.sendMessage(extra.from, {
          text: menuText,
          mentions: [extra.sender]
        }, { quoted: msg });
      }
      
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
