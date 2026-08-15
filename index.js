const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Fetch environment variables with hardcoded fallback
const TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || "https://bputheavypc22-pixel.github.io/25Register-FormV2/"; 
const SCRIPT_URL = process.env.SCRIPT_URL;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;
const TOPIC_ID = process.env.TOPIC_ID ? parseInt(process.env.TOPIC_ID) : null;

// Initialize Telegram Bot with polling enabled
const bot = new TelegramBot(TOKEN, { polling: true });

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Welcome to 25Realty Inquiry Portal!\n\nClick the button below to fill out the registration form:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Open Registration Form", web_app: { url: WEB_APP_URL } }]
      ]
    }
  });
});

// Handle form submission webhook from HTML front-end
app.post('/submit-form', async (req, res) => {
  try {
    const data = req.body;

    // 1. Send confirmation message directly to the client in Telegram
    if (data.chat_id) {
      const clientMessage = `
✅ *Registration Received!*

Thank you, *${data.fullName}*, for registering with 25Realty.

*Summary of Details:*
• *Phone:* ${data.phone}
• *Telegram User:* @${data.telegramUser || 'N/A'}
• *Category:* ${data.category}
• *Property:* ${data.propertyType} (${data.listingType})
• *Location:* ${data.location}
• *Price Range:* $${data.minPrice} - $${data.maxPrice}
• *Bedrooms:* ${data.bedrooms || 'N/A'}
• *Bathrooms:* ${data.bathrooms || 'N/A'}
• *Parking:* ${data.parking || 'N/A'}
• *Direction:* ${data.direction || 'N/A'}
• *Notes:* ${data.notes || 'None'}

Our team will contact you shortly!
      `;

      await bot.sendMessage(data.chat_id, clientMessage, { parse_mode: 'Markdown' });
    }

    // 2. Post alert message into the designated Telegram Group Topic
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

      await bot.sendMessage(GROUP_CHAT_ID, groupMessage, options);
    }

    // 3. Log data into Google Sheets via Apps Script Web App
    if (SCRIPT_URL) {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    res.status(200).json({ success: true, message: "Form processed successfully!" });
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
