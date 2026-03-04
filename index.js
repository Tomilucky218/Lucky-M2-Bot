/**
 * WhatsApp MD Bot - Main Entry Point
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

const { initializeTempSystem } = require('./utils/tempManager');
const { getAnti } = require('./data/antidel');
const autoStatus = require("./commands/general/autostatus"); 
const { startCleanup } = require('./utils/cleanup');
initializeTempSystem();
startCleanup();
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const forbiddenPatternsConsole = [
  'closing session',
  'closing open session',
  'sessionentry',
  'prekey bundle',
  'pendingprekey',
  '_chains',
  'registrationid',
  'currentratchet',
  'chainkey',
  'ratchet',
  'signal protocol',
  'ephemeralkeypair',
  'indexinfo',
  'basekey'
];

console.log = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleLog.apply(console, args);
  }
};

console.error = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleError.apply(console, args);
  }
};

console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) {
    originalConsoleWarn.apply(console, args);
  }
};

// Now safe to load libraries
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const handler = require('./handler');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

// Remove Puppeteer cache (if some dependency downloaded Chromium into ~/.cache/puppeteer)
function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');

    if (fs.existsSync(cacheDir)) {
      console.log('🧹 Removing Puppeteer cache at:', cacheDir);
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ Puppeteer cache removed');
    }
  } catch (err) {
    console.error('⚠️ Failed to cleanup Puppeteer cache:', err.message || err);
  }
}
// Optimized in-memory store with hard limits (Map-based for better memory management)
const store = {
  messages: new Map(), // Use Map instead of plain object
  maxPerChat: 20, // Limit to 20 messages per chat

  bind: (ev) => {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;

        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) {
          store.messages.set(jid, new Map());
        }

        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);

        // Aggressive cleanup per chat - keep only recent messages
        if (chatMsgs.size > store.maxPerChat) {
          // Remove oldest message (first entry in Map)
          const oldestKey = chatMsgs.keys().next().value;
          chatMsgs.delete(oldestKey);
        }
      }
    });
  },

  loadMessage: async (jid, id) => {
    return store.messages.get(jid)?.get(id) || null;
  }
};

// Optimized message deduplication (Set-based, no timestamps needed)
const processedMessages = new Set();

// Aggressive cleanup - clear every 5 minutes
setInterval(() => {
  processedMessages.clear();
}, 5 * 60 * 1000); // Every 5 minutes

// Custom Pino logger with suppression for Baileys noise
const createSuppressedLogger = (level = 'silent') => {
  const forbiddenPatterns = [
    'closing session',
    'closing open session',
    'sessionentry',
    'prekey bundle',
    'pendingprekey',
    '_chains',
    'registrationid',
    'currentratchet',
    'chainkey',
    'ratchet',
    'signal protocol',
    'ephemeralkeypair',
    'indexinfo',
    'basekey',
    'sessionentry',
    'ratchetkey'
  ];

  let logger;
  try {
    logger = pino({
      level,
      // Fallback transport without pino-pretty (in case not installed)
      transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname'
        }
      },
      customLevels: {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5
      },
      // Redact sensitive fields
      redact: ['registrationId', 'ephemeralKeyPair', 'rootKey', 'chainKey', 'baseKey']
    });
  } catch (err) {
    // Fallback to basic pino without transport
    logger = pino({ level });
  }

  // Wrap log methods to filter
  const originalInfo = logger.info.bind(logger);
  logger.info = (...args) => {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ').toLowerCase();
    if (!forbiddenPatterns.some(pattern => msg.includes(pattern))) {
      originalInfo(...args);
    }
  };
  logger.debug = () => { }; // Fully disable debug
  logger.trace = () => { }; // Fully disable trace
  return logger;
};

// Main connection function
async function startBot() {
  const sessionFolder = `./${config.sessionName}`;
  const sessionFile = path.join(sessionFolder, 'creds.json');

  // Check if sessionID is provided and process LuckyM2! format session
  if (config.sessionID && config.sessionID.startsWith('LuckyM2-')) {
    try {
      const [header, b64data] = config.sessionID.split('-');

      if (header !== 'LuckyM2' || !b64data) {
        throw new Error("❌ Invalid session format. Expected 'LuckyM2-.....'");
      }

      const cleanB64 = b64data.replace('...', '');
      const compressedData = Buffer.from(cleanB64, 'base64');
      const decompressedData = zlib.gunzipSync(compressedData);

      // Ensure session folder exists
      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
      }

      // Write decompressed session data to creds.json
      fs.writeFileSync(sessionFile, decompressedData, 'utf8');
      console.log('📡 Session : 🔑 Retrieved from LuckyM2 Session');

    } catch (e) {
      console.error('📡 Session : ❌ Error processing LuckyM2 session:', e.message);
      // Continue with normal QR flow if session processing fails
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  // Use suppressed logger for socket
  const suppressedLogger = createSuppressedLogger('silent');

  const sock = makeWASocket({
    version, // explicit WA Web version negotiated with the server
    logger: suppressedLogger,
    printQRInTerminal: false,
    // Use a common desktop browser signature
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    // Memory optimization: prevent loading old messages into RAM
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined // Don't load messages from store
  });

  // Bind store to socket
  store.bind(sock.ev);

  // Watchdog for inactive socket (Baileys bug fix)
  let lastActivity = Date.now();
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Update on every message
  sock.ev.on('messages.upsert', () => {
    lastActivity = Date.now();
  });

  // Check every 5 min
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT && sock.ws.readyState === 1) { // WebSocket open but inactive
      console.log('⚠️ No activity detected. Forcing reconnect...');
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
      setTimeout(() => startBot(), 5000); // Slightly longer delay
    }
  }, 5 * 60 * 1000); // Every 5 min check

  // Clear on close/open
  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'open') {
      lastActivity = Date.now(); // Reset on open
    } else if (connection === 'close') {
      clearInterval(watchdogInterval);
    }
  });

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n\n📱 Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

      // Suppress verbose error output for common stream errors (515, etc.)
      if (statusCode === 515 || statusCode === 503 || statusCode === 408) {
        console.log(`⚠️ Connection closed (${statusCode}). Reconnecting...`);
      } else {
        console.log('Connection closed due to:', errorMessage, '\nReconnecting:', shouldReconnect);
      }

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n✅ Bot connected successfully!');
      console.log(`📱 Bot Number: ${sock.user.id.split(':')[0]}`);
      console.log(`🤖 Bot Name: ${config.botName}`);
      console.log(`⚡ Prefix: ${config.prefix}`);
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
      console.log(`👑 Owner: ${ownerNames}\n`);
      console.log('Bot is ready to receive messages!\n');

      // Set bot status
      if (config.autoBio) {
        await sock.updateProfileStatus(`${config.botName} | Active 24/7`);
      }

      // Initialize anti-call feature
      handler.initializeAntiCall(sock);

      // Cleanup old chats (keep only active ones, e.g., last touched <1 day)
      const now = Date.now();
      for (const [jid, chatMsgs] of store.messages.entries()) {
        const timestamps = Array.from(chatMsgs.values()).map(m => m.messageTimestamp * 1000 || 0);
        if (timestamps.length > 0 && now - Math.max(...timestamps) > 24 * 60 * 60 * 1000) { // 1 day old chat
          store.messages.delete(jid);
        }
      }
      console.log(`🧹 Store cleaned. Active chats: ${store.messages.size}`);
    }
  });

  // Credentials update handler
  sock.ev.on('creds.update', saveCreds);

  // System JID filter - checks if JID is from broadcast/status/newsletter
 const isSystemJid = (jid) => {
  if (!jid) return true;

  // Allow WhatsApp status
  if (jid === 'status@broadcast') return false;

  // Block other system jids
  return (
    jid.includes('@broadcast') ||
    jid.includes('@newsletter') ||
    jid.includes('@newsletter.')
  );
};

  // Messages handler - Process only new messages
  const viewedStatusKeys = new Set(); // avoid notifying same status multiple times

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;

  for (const msg of messages) {
    if (!msg.message || !msg.key?.id) continue;

    const from = msg.key.remoteJid;
    if (!from) continue;




    // Skip only system broadcasts that are not status
    if (isSystemJid(from) && from !== 'status@broadcast') continue;

    const msgId = msg.key.id;
    if (processedMessages.has(msgId)) continue;
    processedMessages.add(msgId);

    // Store last 20 messages per chat
    if (!store.messages.has(from)) store.messages.set(from, new Map());
    const chatMsgs = store.messages.get(from);
    chatMsgs.set(msg.key.id, msg);
    if (chatMsgs.size > store.maxPerChat) {
      const sortedIds = Array.from(chatMsgs.entries())
        .sort((a, b) => (a[1].messageTimestamp || 0) - (b[1].messageTimestamp || 0))
        .map(([id]) => id);
      for (let i = 0; i < sortedIds.length - store.maxPerChat; i++) chatMsgs.delete(sortedIds[i]);
    }

    // Process commands immediately
    handler.handleMessage(sock, msg).catch(err => {
      if (!err.message?.includes('rate-overlimit') && !err.message?.includes('not-authorized'))
        console.error('Error handling message:', err.message);
    });

    // Background operations
    setImmediate(async () => {
      try {
        // ===== AUTO-READ GROUP MESSAGES =====
        if (config.autoRead && from.endsWith('@g.us')) {
          try { await sock.readMessages([msg.key]); } catch {}
        }

        // ===== ANTILINK CHECK =====
        if (from.endsWith('@g.us')) {
          try {
            const groupMetadata = await handler.getGroupMetadata(sock, from);
            if (groupMetadata) await handler.handleAntilink(sock, msg, groupMetadata);
          } catch {}
        }

    
        
       
// ================= AUTO REPLY (PRODUCTION LEVEL) ==============


                            
                                                  
                                                                                              
                                
                                        
// ===== AUTOSTATUS LOGIC FIX FOR @lid =====
const configStatus = JSON.parse(fs.readFileSync(path.join(__dirname, './data/autoStatus.json')));
if (!configStatus.enabled) return;

if (from === 'status@broadcast' && !viewedStatusKeys.has(msg.key.id)) {
    const participant = msg.key.participant || 'unknown';
    viewedStatusKeys.add(msg.key.id);

    console.log(`📱 Viewing status from: ${participant}`);

    try {
        // Build proper key for readMessages
        let keyToRead = {
            id: msg.key.id,
            remoteJid: from,           // default
            participant: participant    // ensures it works for @lid
        };

        // For @lid statuses, replace remoteJid with participant
        if (participant.endsWith('@lid')) {
            keyToRead.remoteJid = participant; // <-- critical fix
            keyToRead.participant = undefined; // WA expects no participant here
        }

        // Mark status as viewed
        await sock.readMessages([keyToRead]);

        // Optional reaction
        if (configStatus.reactOn) {
            await sock.sendMessage(
                participant,
                {
                    react: { text: "❤️", key: msg.key }
                }
            );
            console.log("✅ Viewed & Reacted to status");
        } else {
            console.log("✅ Viewed status without reaction");
        }

        // Notify owner if enabled
        if (configStatus.notifyOwner) {
            const ownerNumber = config.ownerNumber[0];
            const ownerJid = ownerNumber + '@s.whatsapp.net';

            let statusType = 'text';
            if (msg.message.imageMessage) statusType = 'image 🖼️';
            else if (msg.message.videoMessage) statusType = 'video 🎥';
            else if (msg.message.stickerMessage) statusType = 'sticker 🟩';

            await sock.sendMessage(ownerJid, {
                text: `🔔 New status uploaded by: @${participant.split('@')[0]}\nType: ${statusType}`,
                mentions: [participant]
            });
        }

    } catch (e) {
        console.error("AutoStatus view/react failed:", e);
    }
}

      } catch (err) {
        console.error('AutoStatus Upsert Error:', err);
      }
    });
  }
});




// ===================== ANTIDELETE TO OWNER (WITH TIME) =====================
sock.ev.on('messages.update', async (updates) => {
  try {
    const enabled = await getAnti();
    if (!enabled) return;

    for (const update of updates) {

      if (update.update?.message === null) {

        const key = update.key;
        const from = key.remoteJid;
        if (!from || isSystemJid(from)) continue;

        const chatMsgs = store.messages.get(from);
        if (!chatMsgs) continue;

        const originalMsg = chatMsgs.get(key.id);
        if (!originalMsg || !originalMsg.message) continue;

        let messageContent = originalMsg.message;

        // 🔓 UNWRAP EPHEMERAL
        if (messageContent?.ephemeralMessage) {
          messageContent = messageContent.ephemeralMessage.message;
        }

        // 🔓 UNWRAP VIEW ONCE
        if (messageContent?.viewOnceMessage) {
          messageContent = messageContent.viewOnceMessage.message;
        }

        const sender = key.participant || key.remoteJid;
        const senderNumber = sender.split("@")[0];

        // ===== OWNER =====
        const ownerNumber = Array.isArray(config.ownerNumber)
          ? config.ownerNumber[0]
          : config.ownerNumber;

        const ownerJid = ownerNumber + "@s.whatsapp.net";

        // ===== CHAT NAME =====
        let chatName = from;
        if (from.endsWith("@g.us")) {
          try {
            const meta = await sock.groupMetadata(from);
            chatName = meta.subject;
          } catch {}
        }

        // ===== AFRICA/KAMPALA TIME =====
        const kampalaTime = new Date().toLocaleString("en-UG", {
          timeZone: "Africa/Kampala",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

        const header =
`🚨 *ANTI-DELETE DETECTED*

👤 User: ${senderNumber}
💬 Chat: ${chatName}
🕒 Deleted At: ${kampalaTime}

Restored message below 👇`;

        // ===== SEND HEADER =====
        await sock.sendMessage(ownerJid, { text: header });

        // ===== RESTORE EXACT MESSAGE =====
        await sock.relayMessage(
          ownerJid,
          messageContent,
          { messageId: originalMsg.key.id }
        );
      }
    }

  } catch (err) {
    console.error("AntiDelete Error:", err);
  }
});



  // Message receipt updates (silently handled, no logging)
  sock.ev.on('message-receipt.update', () => {
    // Silently handle receipt updates
  });

  // Message updates (silently handled, no logging)
  sock.ev.on('messages.update', () => {
    // Silently handle message updates
  });

  // Group participant updates (join/leave)
  sock.ev.on('group-participants.update', async (update) => {
    await handler.handleGroupUpdate(sock, update);
  });

  // Handle errors - suppress common stream errors
  sock.ev.on('error', (error) => {
    const statusCode = error?.output?.statusCode;
    // Suppress verbose output for common stream errors
    if (statusCode === 515 || statusCode === 503 || statusCode === 408) {
      // These are usually temporary connection issues, handled by reconnection
      return;
    }
    console.error('Socket error:', error.message || error);
  });

  return sock;
}
// Start the bot
console.log('🚀 Starting WhatsApp MD Bot...\n');
console.log(`📦 Bot Name: ${config.botName}`);
console.log(`⚡ Prefix: ${config.prefix}`);
const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
console.log(`👑 Owner: ${ownerNames}\n`);

// Proactively delete Puppeteer cache so it doesn't fill disk on panels
cleanupPuppeteerCache();

startBot().catch(err => {
  console.error('Error starting bot:', err);
  process.exit(1);
});
// Handle process termination
process.on('uncaughtException', (err) => {
  // Handle ENOSPC errors gracefully without crashing
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.error('⚠️ ENOSPC Error: No space left on device. Attempting cleanup...');
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    console.warn('⚠️ Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return; // Don't crash, just log and continue
  }
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  // Handle ENOSPC errors gracefully
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.warn('⚠️ ENOSPC Error in promise: No space left on device. Attempting cleanup...');
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    console.warn('⚠️ Cleanup completed. Bot will continue but may experience issues until space is freed.');
    return; // Don't crash, just log and continue
  }

  // Don't spam console with rate limit errors
  if (err.message && err.message.includes('rate-overlimit')) {
    console.warn('⚠️ Rate limit reached. Please slow down your requests.');
    return;
  }
  console.error('Unhandled Rejection:', err);
});
// Export store for use in commands
module.exports = { store };