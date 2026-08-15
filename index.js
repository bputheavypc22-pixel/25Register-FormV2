require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const sheetUrl = process.env.GOOGLE_SHEET_URL; 
const groupId = process.env.TELEGRAM_GROUP_ID;  
const topicClientId = process.env.TOPIC_CLIENT_ID;

// ⚠️ REPLACE THIS WITH YOUR ACTUAL GITHUB PAGES URL
const WEB_APP_URL = 'https://bputheavypc22-pixel.github.io/25Register-FormV2/';

if (!token) {
  console.error('Error: BOT_TOKEN is missing!');
  process.exit(1);
}

const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

// Start Command with Web App Button
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Welcome to **Twenty5 Realty**!\n\nClick below to submit a new client inquiry:',
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

  // 1. Contact Us Button
  if (msg.text === '📞 Contact Us') {
    return bot.sendMessage(
      chatId, 
      '📞 **Twenty5 Realty Support**\n\n' +
      '📱 Phone: +855 12 345 678\n' +
      '🌐 Website: twenty5realty.com', 
      { parse_mode: 'Markdown' }
    );
  }

  // 2. Catch Web App Data Event
  if (msg.web_app_data && msg.web_app_data.data) {
    try {
      const finalData = JSON.parse(msg.web_app_data.data);
      finalData.telegram = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

      // A. Send confirmation to user
      await bot.sendMessage(
        chatId,
        `✅ **Inquiry Recorded Successfully!**\n\n` +
        `👤 **Name:** ${finalData.name}\n` +
        `📱 **Tel 1:** ${finalData.tel1}\n` +
        `🎯 **Target:** ${finalData.target}\n` +
        `🏠 **Type:** ${finalData.propertyType}\n` +
        `💰 **Price Rank:** ${finalData.priceRank}\n` +
        `📍 **Area:** ${finalData.area}\n` +
        `📝 **Remark:** ${finalData.remark}`,
        { parse_mode: 'Markdown' }
      );

      // B. Send Plain Text Alert to Telegram Group Topic
      if (groupId && topicClientId) {
        const clientTopicMsg = 
          `🚨 NEW CLIENT INQUIRY!\n\n` +
          `👤 Name: ${finalData.name}\n` +
          `📱 Tel: ${finalData.tel1}\n` +
          `✈️ Telegram: ${finalData.telegram}\n` +
          `🎯 Target: ${finalData.target}\n` +
          `🏠 Property Type: ${finalData.propertyType}\n` +
          `💰 Price Rank: ${finalData.priceRank}\n` +
          `📍 Area: ${finalData.area}\n` +
          `📝 Remark: ${finalData.remark}`;

        await bot.sendMessage(groupId, clientTopicMsg, { 
          message_thread_id: Number(topicClientId)
        });
        console.log('✅ Posted Mini App Lead to Group Topic');
      }

      // C. Append to Google Sheet
      if (sheetUrl) {
        await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalData)
        });
        console.log('✅ Posted Mini App Lead to Google Sheet');
      }

    } catch (err) {
      console.error('❌ Error processing Mini App data:', err.message);
    }
  }
});

// Express Web Server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Twenty5 Realty Mini App Bot is active!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on port ' + PORT);
});
