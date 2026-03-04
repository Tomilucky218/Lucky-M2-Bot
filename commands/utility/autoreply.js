// ================= chatbot.js =================
const { OpenAIApi, Configuration } = require('openai');
const path = require('path');
const fs = require('fs');

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your env
});
const openai = new OpenAIApi(configuration);

// Optional emojis
const emojis = ['💖','😊','😂','😍','🥰','✨','💘','💛','💜','💞'];

module.exports = {
  name: 'chatbot',
  description: 'AI-powered WhatsApp chatbot with toggle and typing simulation',
  usage: '.chatbot on/off',
  category: 'utility',

  // Command to toggle chatbot on/off
  async execute(sock, msg, args, extra) {
    if (typeof this._chatbotState === 'undefined') this._chatbotState = false;

    const arg = args[0]?.toLowerCase();
    if (!arg || !['on','off'].includes(arg)) {
      return extra.reply(
        `❌ Usage: .chatbot on/off\nCurrent status: ${this._chatbotState ? 'ON' : 'OFF'}`
      );
    }

    this._chatbotState = arg === 'on';
    return extra.reply(`✅ Chatbot is now ${this._chatbotState ? 'ON' : 'OFF'}`);
  },

  // Initialize message listener
  async init(sock) {
    if (typeof this._chatbotState === 'undefined') this._chatbotState = false;

    sock.on('message', async (msg) => {
      try {
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        // Only respond if chatbot is ON
        if (!this._chatbotState) return;

        // Ignore owner/bot messages and groups
        if (msg.key.fromMe || isGroup) return;

        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '';
        if (!body) return;

        // Typing simulation
        await sock.sendPresenceUpdate?.('composing', from);

        // Call OpenAI GPT
        const response = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo', // or gpt-4 if available
          messages: [{ role: 'user', content: body }],
          max_tokens: 150,
        });

        let reply = response.data.choices[0].message.content.trim();

        // Optionally add emoji for personality
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        reply = `${reply} ${emoji}`;

        // Simulate typing delay
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

        // Send reply
        await sock.sendMessage(from, { text: reply }, { quoted: msg });

      } catch (err) {
        console.error('AI Chatbot error:', err);
      }
    });
  }
};