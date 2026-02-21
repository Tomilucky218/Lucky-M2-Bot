const axios = require("axios");

module.exports = {
  name: "bible",
  aliases: [],
  category: "media",
  description: "Fetch Bible verses by reference.",
  usage: ".bible <Book Chapter:Verse>",
  react: "📖",
  ownerOnly: false,

  async execute(sock, msg, args, extra) {
    const { reply } = extra;

    try {
      if (!args || args.length === 0) {
        return reply(
          `⚠️ *Please provide a Bible reference.*\n\n📝 *Example:*\n.bible John 1:1`
        );
      }

      const referenceInput = args.join(" ");
      const apiUrl = `https://bible-api.com/${encodeURIComponent(referenceInput)}`;
      const response = await axios.get(apiUrl);

      if (response.status === 200 && response.data.text) {
        const { reference, text, translation_name } = response.data;

        // Extract book, chapter, verse from reference string
        // Example reference: "John 1:1"
        let book = reference.split(" ")[0] || "Unknown";
        let chapter = reference.split(" ")[1]?.split(":")[0] || "Unknown";
        let verse = reference.split(":")[1] || "Unknown";

        const message = 
`📜 *𝘽𝙄𝘽𝙇𝙀 𝙑𝙀𝙍𝙎𝙀 𝙁𝙊𝙐𝙉𝘿!*

📖 *Reference:* ${reference}
📚 *Book:* ${book}
🔢 *Chapter:* ${chapter}
🔤 *Verse:* ${verse}

📖 *Text:* ${text}

🗂️ *Translation:* ${translation_name}

> © Powered By Lucky Tech Hub`;

        await reply(message);
      } else {
        await reply("❌ *Verse not found.* Please check the reference and try again.");
      }
    } catch (error) {
      console.error("Bible command error:", error);
      await reply("⚠️ *An error occurred while fetching the Bible verse.* Please try again.");
    }
  }
};