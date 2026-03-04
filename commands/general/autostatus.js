const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../data/autoStatus.json");
const channelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363420656466131@newsletter",
      newsletterName: "Lucky M2 Bot",
      serverMessageId: -1
    }
  }
};

// Create config file if missing
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(
    configPath,
    JSON.stringify({ enabled: false, reactOn: false, notifyOwner: false }, null, 2)
  );
}

// ================= COMMAND =================
module.exports = {
  name: "autostatus",
  aliases: [],
  category: "general",
  description: "Enable/disable auto status viewing, reactions, and owner notifications",
  usage: ".autostatus on/off | .autostatus react on/off | .autostatus notify on/off",

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    try {
      if (!msg.key.fromMe) {
        return sock.sendMessage(chatId, {
          text: "❌ This command can only be used by the owner!",
          ...channelInfo
        });
      }

      let config = JSON.parse(fs.readFileSync(configPath));

      if (!args || args.length === 0) {
        const status = config.enabled ? "ON ✅" : "OFF ❌";
        const reactStatus = config.reactOn ? "ON ✅" : "OFF ❌";
        const notifyStatus = config.notifyOwner ? "ON ✅" : "OFF ❌";

        return sock.sendMessage(chatId, {
          text:
`╭═✦〔🔄 *ᴀ.ꜱ ꜱᴇᴛᴛɪɴɢꜱ* 〕✦═╮
│
│👀 View: ${status}
│❤️ React: ${reactStatus}
│🔔 Notify: ${notifyStatus}
│
│ *ᴄᴏᴍᴍᴀɴᴅꜱ*
│ .autostatus on
│ .autostatus off
│ .autostatus react on
│ .autostatus react off
│ .autostatus notify on
│ .autostatus notify off
╰═❀═════════════❀═╯`,
          ...channelInfo
        }, { quoted: msg});
      }

      const command = args[0].toLowerCase();

      if (command === "on") config.enabled = true;
      else if (command === "off") config.enabled = false;
      else if (command === "react") {
        if (!args[1]) return sock.sendMessage(chatId, { text: "❌ Use: .autostatus react on/off", ...channelInfo });
        const reactArg = args[1].toLowerCase();
        if (reactArg === "on") config.reactOn = true;
        else if (reactArg === "off") config.reactOn = false;
        else return sock.sendMessage(chatId, { text: "❌ Invalid option! Use on/off", ...channelInfo });
      } else if (command === "notify") {
        if (!args[1]) return sock.sendMessage(chatId, { text: "❌ Use: .autostatus notify on/off", ...channelInfo });
        const notifyArg = args[1].toLowerCase();
        if (notifyArg === "on") config.notifyOwner = true;
        else if (notifyArg === "off") config.notifyOwner = false;
        else return sock.sendMessage(chatId, { text: "❌ Invalid option! Use on/off", ...channelInfo });
      } else {
        return sock.sendMessage(chatId, { text: "❌ Invalid command!", ...channelInfo });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      await sock.sendMessage(chatId, {
        text: "✅ Auto Status settings updated successfully!",
        ...channelInfo
      });

    } catch (error) {
      console.error("AutoStatus Command Error:", error);
      await sock.sendMessage(chatId, {
        text: "❌ Error updating auto status.\n" + error.message,
        ...channelInfo
      });
    }
  }
};

// ================= HELPER EXPORT =================
module.exports.handleStatusUpdate = async function (sock, update) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    if (!config.enabled) return;

    const msg = update.messages?.[0];
    if (!msg) return;

    // Only handle statuses
    if (msg.key?.remoteJid === "status@broadcast") {
      const participant = msg.key.participant || "unknown";

      console.log(`📱 Viewing status from: ${participant}`);

      // ✅ Correct auto-view
      try {
        await sock.sendReadReceipt(msg.key.remoteJid, participant, [msg.key.id]);
      } catch (e) {
        console.error("Auto-view status failed:", e.message);
      }

      // ✅ Auto-react
      if (configStatus.reactOn) {
  try {
    // Ensure the key points to the actual status message
    const statusKey = {
      remoteJid: msg.key.remoteJid,
      id: msg.key.id,
      participant: msg.key.participant || msg.key.remoteJid
    };

    await sock.sendMessage("status@broadcast", {
      react: { text: "💚", key: statusKey }
    });

    console.log(`💫 Reacted to status from ${statusKey.participant}`);
  } catch (e) {
    console.error("Auto-react status failed:", e.message);
  }
}

      // ✅ Notify owner
      if (config.notifyOwner) {
        const ownerJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // Determine status type
        let statusType = "text";
        if (msg.message.imageMessage) statusType = "image 🖼️";
        else if (msg.message.videoMessage) statusType = "video 🎥";
        else if (msg.message.stickerMessage) statusType = "sticker 🟩";

        await sock.sendMessage(ownerJid, {
          text: `🔔 New status uploaded by: @${participant.split("@")[0]}\nType: ${statusType}`,
          mentions: [participant]
        });
      }
    }

  } catch (err) {
    console.error("Auto Status Error:", err);
  }
};