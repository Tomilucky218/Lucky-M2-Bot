/**
 * ViewOnce Command - Silent Owner Forward
 */
const config = require('../../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'vv2',
  aliases: ['ok2'],
  category: 'general',
  description: 'Reveal view-once messages silently to owner',
  usage: '.vv2 (reply to view-once message)',
  
  async execute(sock, msg, args) {
    try {

      // ✅ SUPPORT ARRAY OR STRING OWNER
      const owners = Array.isArray(config.ownerNumber)
        ? config.ownerNumber
        : [config.ownerNumber];

      const ownerJids = owners.map(num =>
        num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      );

      const ctx =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo ||
        msg.message?.buttonsResponseMessage?.contextInfo ||
        msg.message?.listResponseMessage?.contextInfo;

      // ❌ Remove stanzaId check (it breaks detection sometimes)
      if (!ctx?.quotedMessage) return;

      const quotedMsg = ctx.quotedMessage;

      const hasViewOnce =
        !!quotedMsg.viewOnceMessageV2 ||
        !!quotedMsg.viewOnceMessageV2Extension ||
        !!quotedMsg.viewOnceMessage ||
        !!quotedMsg.viewOnce ||
        !!quotedMsg?.imageMessage?.viewOnce ||
        !!quotedMsg?.videoMessage?.viewOnce ||
        !!quotedMsg?.audioMessage?.viewOnce;

      if (!hasViewOnce) return;

      let actualMsg = null;
      let mtype = null;

      if (quotedMsg.viewOnceMessageV2Extension?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2Extension.message;
        mtype = Object.keys(actualMsg)[0];

      } else if (quotedMsg.viewOnceMessageV2?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2.message;
        mtype = Object.keys(actualMsg)[0];

      } else if (quotedMsg.viewOnceMessage?.message) {
        actualMsg = quotedMsg.viewOnceMessage.message;
        mtype = Object.keys(actualMsg)[0];

      } else if (quotedMsg.imageMessage?.viewOnce) {
        actualMsg = { imageMessage: quotedMsg.imageMessage };
        mtype = 'imageMessage';

      } else if (quotedMsg.videoMessage?.viewOnce) {
        actualMsg = { videoMessage: quotedMsg.videoMessage };
        mtype = 'videoMessage';

      } else if (quotedMsg.audioMessage?.viewOnce) {
        actualMsg = { audioMessage: quotedMsg.audioMessage };
        mtype = 'audioMessage';
      }

      if (!actualMsg || !mtype) return;

      const downloadType =
        mtype === 'imageMessage'
          ? 'image'
          : mtype === 'videoMessage'
          ? 'video'
          : 'audio';

      const mediaStream = await downloadContentFromMessage(
        actualMsg[mtype],
        downloadType
      );

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.newsletterJid || '120363420656466131@newsletter',
          newsletterName: config.botName || 'Lucky M2 Bot',
          serverMessageId: -1
        }
      };

      const originalCaption = actualMsg[mtype]?.caption || '';

      const cyberCaption = `╭━〔 CYBER2 REVEAL 〕━╮
│🔓 View-Once Unlocked!
│👁️ Secret Media Decrypted
│🤖 Powered by Lucky M2 Bot
╰═❀═════════════❀═╯

> Transmission intercepted successfully 🚀`;

      const caption = originalCaption
        ? `${originalCaption}\n\n${cyberCaption}`
        : cyberCaption;

      // 🔥 SEND TO ALL OWNERS SILENTLY
      for (const ownerJid of ownerJids) {

        if (/video/.test(mtype)) {
          await sock.sendMessage(ownerJid, {
            video: buffer,
            caption,
            mimetype: 'video/mp4',
            contextInfo
          });

        } else if (/image/.test(mtype)) {
          await sock.sendMessage(ownerJid, {
            image: buffer,
            caption,
            mimetype: 'image/jpeg',
            contextInfo
          });

        } else if (/audio/.test(mtype)) {
          await sock.sendMessage(ownerJid, {
            audio: buffer,
            ptt: true,
            mimetype: 'audio/ogg; codecs=opus',
            contextInfo
          });
        }
      }

    } catch (error) {
      console.error('Silent VV2 Error:', error);
      // Still silent to users
    }
  }
};