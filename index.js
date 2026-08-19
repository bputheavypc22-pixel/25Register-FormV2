const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Environment variable mapping with flexible fallbacks matching your Render config
const TOKEN = process.env.BOT_TOKEN;

const WEB_APP_URL = 
  process.env.WEB_APP_URL || 
  process.env['WEB-APP-URL'] || 
  "https://bputheavypc22-pixel.github.io/25Register-FormV2/";

const SCRIPT_URL = 
  process.env.SCRIPT_URL || 
  process.env.GOOGLE_SHEET_URL;

const GROUP_CHAT_ID = 
  process.env.GROUP_CHAT_ID || 
  process.env.TELEGRAM_GROUP_ID;

const TOPIC_ID = 
  process.env.TOPIC_ID || 
  process.env.TOPIC_CLIENT_ID ? 
  parseInt(process.env.TOPIC_ID || process.env.TOPIC_CLIENT_ID) : null;

// Initialize Telegram Bot
const bot = new TelegramBot(TOKEN, { polling: true });

app.get('/', (req, res) => {
  res.send('25Realty Backend Server is running active.');
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to 25Realty Inquiry Portal!\n\nClick the button below to open the form:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Open Registration Form", web_app: { url: WEB_APP_URL } }]
      ]
    }
  });
});

app.post('/submit-form', async (req, res) => {
  console.log("Form payload received:", req.body);
  const data = req.body;

  // 1. Direct Message to User
  if (data.chat_id) {
    const clientMessage = `
✅ *Registration Received!*

Thank you, *${data.fullName}*, for registering with 25Realty.

*Summary:*
• *Phone:* ${data.phone}
• *Telegram User:* @${data.telegramUser || 'N/A'}
• *Category:* ${data.category}
• *Property:* ${data.propertyType} (${data.listingType})
• *Location:* ${data.location}
• *Price Range:* $${data.minPrice} - $${data.maxPrice}
• *Bedrooms:* ${data.bedrooms || 'N/A'}
• *Bathrooms:* ${data.bathrooms || 'N/A'}
• *Notes:* ${data.notes || 'None'}
    `;

    await bot.sendMessage(data.chat_id, clientMessage, { parse_mode: 'Markdown' })
      .catch(err => console.error("Client DM Error:", err.message));
  }

  // 2. Message to Telegram Group Topic
  if (GROUP_CHAT_ID) {
    const groupMessage = `
🚨 *NEW CLIENT INQUIRY ALERT* 🚨

👤 *Client Name:* ${data.fullName}
📞 *Phone:* ${data.phone}
💬 *Telegram Handle:* @${data.telegramUser || 'N/A'}
🏷️ *Category:* ${data.category}
🏠 *Type:* ${data.propertyType} (${data.listingType})
📍 *Location:* ${data.location}
💰 *Budget:* $${data.minPrice} - $${data.maxPrice}
🛏️ *Bedrooms:* ${data.bedrooms || 'N/A'}
🚿 *Bathrooms:* ${data.bathrooms || 'N/A'}
🚗 *Parking:* ${data.parking || 'N/A'}
🧩 *Direction:* ${data.direction || 'N/A'}
📝 *Notes:* ${data.notes || 'None'}
    `;

    const options = { parse_mode: 'Markdown' };
    if (TOPIC_ID) {
      options.message_thread_id = TOPIC_ID;
    }

    await bot.sendMessage(GROUP_CHAT_ID, groupMessage, options)
      .catch(err => console.error("Group Alert Error:", err.message));
  } else {
    console.error("GROUP_CHAT_ID was not found in process.env");
  }

  // 3. Google Sheets Integration
  if (SCRIPT_URL) {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      console.log("Successfully posted to Google Sheets.");
    } catch (err) {
      console.error("Google Sheets Error:", err.message);
    }
  } else {
    console.error("SCRIPT_URL was not found in process.env");
  }

  return res.status(200).json({ success: true, message: "Processed" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
