require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const sheetUrl = process.env.GOOGLE_SHEET_URL; 
const groupId = process.env.TELEGRAM_GROUP_ID;  
const topicClientId = process.env.TOPIC_CLIENT_ID || '2';

// ⚠️ REPLACE WITH YOUR ACTUAL GITHUB PAGES URL
const WEB_APP_URL = 'https://YOUR-GITHUB-USERNAME.github.io/25Register-FormV2/';

if (!token) {
  console.error('Error: BOT_TOKEN is missing!');
  process.exit(1);
}

const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

// Start Command with Web App Button
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Welcome to **Twenty5 Realty**!\n\nPlease tap the button below to submit a new client inquiry:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '📋 Open Registration Form', web_app: { url: WEB_APP_URL } }],
          [{ text: '📞 Contact Us' }]
        ],
        resize_keyboard: true
      }
    }
  );
});

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Contact Us Button
  if (msg.text === '📞 Contact Us') {
    return bot.sendMessage(
      chatId, 
      '📞 **Twenty5 Realty Support**\n\n' +
      '📱 Call: 012 800 885 | 081 82 92 94\n' +
      '✈️ Telegram: t.me/twenty5realty\n' +
      '✉️ Email: twenty5realty@gmail.com\n' +
      '🌐 Website: 25realtykh.com\n' +
      '📘 Facebook: https://www.facebook.com/share/1MZnRgxuYE/', 
      { parse_mode: 'Markdown' }
    );
  }

  // Handle Web App Data Event
  if (msg.web_app_data && msg.web_app_data.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      const tgUsername = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

      // 1. Send Direct Confirmation to Client Chat
      await bot.sendMessage(
        chatId,
        `✅ **Inquiry Recorded Successfully!**\n\n` +
        `👤 **Name:** ${data.fullName}\n` +
        `📱 **Phone:** ${data.phone}\n` +
        `🎯 **Purpose:** ${data.purpose}\n` +
        `🏠 **Type:** ${data.propertyType}\n` +
        `💰 **Budget:** ${data.budget}\n` +
        `📍 **Location:** ${data.location}\n` +
        `🛏️ **Bedrooms:** ${data.bedrooms}\n` +
        `🚿 **Bathrooms:** ${data.bathrooms}\n` +
        `🚗 **Parking:** ${data.parking}\n` +
        `🧭 **Direction:** ${data.direction}\n` +
        `📝 **Notes:** ${data.notes}\n\n` +
        `📞 **Need help?** Call 012 800 885 | 081 82 92 94`,
        { parse_mode: 'Markdown' }
      );

      // 2. Send Full Detailed Alert to Telegram Group Topic
      if (groupId && topicClientId) {
        const clientTopicMsg = 
          `🚨 NEW CLIENT INQUIRY!\n\n` +
          `👤 Name: ${data.fullName}\n` +
          `📱 Phone: ${data.phone}\n` +
          `☎️ Preferred Contact: ${data.preferredContact}\n` +
          `✈️ Telegram User: ${tgUsername}\n\n` +
          `🏠 Property Type: ${data.propertyType}\n` +
          `🎯 Purpose: ${data.purpose}\n` +
          `💰 Budget: ${data.budget}\n` +
          `📍 Location: ${data.location}\n\n` +
          `🛏️ Bedrooms: ${data.bedrooms}\n` +
          `🚿 Bathrooms: ${data.bathrooms}\n` +
          `🚗 Parking Space: ${data.parking}\n` +
          `🧭 Direction: ${data.direction}\n\n` +
          `📝 Notes: ${data.notes}\n` +
          `⏰ Submitted At: ${data.submittedAt}`;

        await bot.sendMessage(groupId, clientTopicMsg, { 
          message_thread_id: Number(topicClientId)
        });
        console.log('✅ Posted complete inquiry to Telegram Group Topic');
      }

      // 3. Post Full Payload into Google Sheet
      if (sheetUrl) {
        const sheetPayload = {
          submittedAt: data.submittedAt,
          fullName: data.fullName,
          phone: data.phone,
          preferredContact: data.preferredContact,
          telegramUser: tgUsername,
          propertyType: data.propertyType,
          purpose: data.purpose,
          budget: data.budget,
          location: data.location,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          parking: data.parking,
          direction: data.direction,
          notes: data.notes
        };

        await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheetPayload)
        });
        console.log('✅ Posted complete inquiry to Google Sheet');
      }

    } catch (err) {
      console.error('❌ Error processing Mini App data:', err.message);
    }
  }
});

// Express Server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Twenty5 Realty Bot is active!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on port ' + PORT);
});