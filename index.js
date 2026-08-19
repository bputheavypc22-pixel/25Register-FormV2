const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Fetch Environment Variables
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

// Helper function to escape special Markdown characters safely
function cleanText(str) {
  if (!str) return 'N/A';
  return String(str).replace(/[*_`\[\]]/g, '');
}

// Initialize Telegram Bot
const bot = new TelegramBot(TOKEN, { polling: true });

app.get('/', (req, res) => {
  res.send('25Realty Backend Server is active and running!');
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

  // Clean form values to prevent Markdown syntax errors
  const name = cleanText(data.fullName);
  const phone = cleanText(data.phone);
  const handle = cleanText(data.telegramUser);
  const category = cleanText(data.category);
  const listingType = cleanText(data.listingType);
  const propertyType = cleanText(data.propertyType);
  const location = cleanText(data.location);
  const minPrice = cleanText(data.minPrice);
  const maxPrice = cleanText(data.maxPrice);
  const bedrooms = cleanText(data.bedrooms);
  const bathrooms = cleanText(data.bathrooms);
  const parking = cleanText(data.parking);
  const direction = cleanText(data.direction);
  const notes = cleanText(data.notes);

  // 1. Direct Message to Client User
  if (data.chat_id) {
    const clientMessage = 
`✅ Registration Received!

Thank you, ${name}, for registering with 25Realty.

Summary of Details:
• Phone: ${phone}
• Telegram Handle: @${handle}
• Category: ${category}
• Property: ${propertyType} (${listingType})
• Location: ${location}
• Price Range: $${minPrice} - $${maxPrice}
• Bedrooms: ${bedrooms}
• Bathrooms: ${bathrooms}
• Parking: ${parking}
• Direction: ${direction}
• Notes: ${notes}

Our team will contact you shortly!`;

    await bot.sendMessage(data.chat_id, clientMessage)
      .catch(err => console.error("Client DM Error:", err.message));
  }

  // 2. Alert Notification to Group / Topic
  if (GROUP_CHAT_ID) {
    const groupMessage = 
`🚨 NEW CLIENT INQUIRY ALERT 🚨

👤 Client Name: ${name}
📞 Phone: ${phone}
💬 Telegram Handle: @${handle}
🏷️ Category: ${category}
🏠 Type: ${propertyType} (${listingType})
📍 Location: ${location}
💰 Budget: $${minPrice} - $${maxPrice}
🛏️ Bedrooms: ${bedrooms}
🚿 Bathrooms: ${bathrooms}
🚗 Parking: ${parking}
🧩 Direction: ${direction}
📝 Notes: ${notes}`;

    const options = {};
    if (TOPIC_ID) {
      options.message_thread_id = TOPIC_ID;
    }

    await bot.sendMessage(GROUP_CHAT_ID, groupMessage, options)
      .catch(err => console.error("Group Alert Error:", err.message));
  } else {
    console.error("GROUP_CHAT_ID not set in process.env");
  }

  // 3. Google Sheets Endpoint
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
  }

  return res.status(200).json({ success: true, message: "Processed successfully" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
