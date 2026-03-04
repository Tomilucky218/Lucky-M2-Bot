const axios = require("axios");

module.exports = [

  // ================= EPL STANDINGS =================
  {
    pattern: "eplstandings",
    alias: ["epltable", "standings"],
    react: "🏆",
    desc: "Get English Premier League standings.",
    category: "general",
    use: ".eplstandings",
    filename: __filename,

    async run(conn, mek, m, { from, reply }) {
      try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        const apiUrl = "https://apis-keith.vercel.app/epl/standings";
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.result?.standings) {
          return reply("❌ Unable to fetch EPL standings. Please try again later.");
        }

        const { competition, standings } = response.data.result;

        let standingsList = `🏆 *${competition} - Standings* 🏆\n\n`;

        standings.forEach(team => {
          standingsList += `*${team.position}.* ${team.team}\n`;
          standingsList += `📊 Played: ${team.played} | Won: ${team.won} | Draw: ${team.draw} | Lost: ${team.lost}\n`;
          standingsList += `⚽ GF: ${team.goalsFor} | GA: ${team.goalsAgainst} | GD: ${team.goalDifference}\n`;
          standingsList += `📈 Points: ${team.points}\n\n`;
        });

        await reply(standingsList);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

      } catch (error) {
        console.error("Error fetching EPL standings:", error);
        reply("❌ Unable to fetch EPL standings. Please try again later.");
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
      }
    }
  },


  // ================= FINISHED MATCHES =================
  {
    pattern: "finishedeplmatches",
    alias: ["eplfinished", "eplresults"],
    react: "⚽",
    desc: "Get finished English Premier League matches.",
    category: "general",
    use: ".finishedeplmatches",
    filename: __filename,

    async run(conn, mek, m, { from, reply }) {
      try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        const apiUrl = "https://apis-keith.vercel.app/epl/matches";
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.result?.matches) {
          return reply("❌ Unable to fetch finished matches. Please try again later.");
        }

        const { competition, matches } = response.data.result;
        const finishedMatches = matches.filter(match => match.status === "FINISHED");

        let matchList = `⚽ *${competition} - Finished Matches* ⚽\n\n`;

        finishedMatches.forEach((match, index) => {
          matchList += `*Match ${index + 1}:*\n`;
          matchList += `🏠 Home: ${match.homeTeam}\n`;
          matchList += `🛫 Away: ${match.awayTeam}\n`;
          matchList += `📅 Matchday: ${match.matchday}\n`;
          matchList += `📊 Score: ${match.score}\n`;
          matchList += `🏆 Winner: ${match.winner}\n\n`;
        });

        await reply(matchList);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

      } catch (error) {
        console.error("Error fetching finished matches:", error);
        reply("❌ Unable to fetch finished matches. Please try again later.");
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
      }
    }
  },


  // ================= UPCOMING MATCHES =================
  {
    pattern: "upcomingeplmatches",
    alias: ["eplmatches", "epl"],
    react: "⚽",
    desc: "Get upcoming English Premier League matches.",
    category: "general",
    use: ".upcomingeplmatches",
    filename: __filename,

    async run(conn, mek, m, { from, reply }) {
      try {
        await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

        const apiUrl = "https://apis-keith.vercel.app/epl/upcomingmatches";
        const response = await axios.get(apiUrl);

        if (!response.data?.status || !response.data?.result?.upcomingMatches) {
          return reply("❌ Unable to fetch upcoming matches. Please try again later.");
        }

        const { competition, upcomingMatches } = response.data.result;

        let matchList = `⚽ *${competition} - Upcoming Matches* ⚽\n\n`;

        upcomingMatches.forEach((match, index) => {
          matchList += `*Match ${index + 1}:*\n`;
          matchList += `🏠 Home: ${match.homeTeam}\n`;
          matchList += `🛫 Away: ${match.awayTeam}\n`;
          matchList += `📅 Date: ${match.date}\n`;
          matchList += `📋 Matchday: ${match.matchday}\n\n`;
        });

        await reply(matchList);
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

      } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        reply("❌ Unable to fetch upcoming matches. Please try again later.");
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
      }
    }
  }

];