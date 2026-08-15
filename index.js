require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const sheetUrl = process.env.GOOGLE_SHEET_URL; 
const groupId = process.env.TELEGRAM_GROUP_ID;  
const topicClientId = process.env.TOPIC_CLIENT_ID;

if (!token) {
  console.error('Error: BOT_TOKEN is missing!');
  process.exit(1);
}

const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

// Store active user sessions during form submission
const userSessions = {};

// Persistent Main Menu Keyboard
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📝 Submit Client Inquiry' }],
      [{ text: '📞 Contact Us' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// Start Command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Welcome to **Twenty5 Realty**!\nPlease select an option below to get started:',
    { parse_mode: 'Markdown', ...mainMenuKeyboard }
  );
});

// Handle Text Messages & Form Steps
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Print Group Chat ID to console if any message is sent in the group
  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    console.log(`📌 REAL GROUP ID DETECTED: ${msg.chat.id}`);
  }

  if (!text) return;

  // 1. Contact Us Button
  if (text === '📞 Contact Us') {
    return bot.sendMessage(
      chatId, 
      '📞 **Twenty5 Realty Support**\n\n' +
      '📱 Phone: +855 12 345 678\n' +
      '🌐 Website: twenty5realty.com', 
      { parse_mode: 'Markdown' }
    );
  }

  // 2. Start Form Button
  if (text === '📝 Submit Client Inquiry') {
    userSessions[chatId] = { step: 'NAME' };
    return bot.sendMessage(chatId, '👤 Please enter client **Full Name**:');
  }

  // Handle Step-by-Step Questions
  const session = userSessions[chatId];
  if (session) {
    
    // Step: Name -> Ask Tel 1
    if (session.step === 'NAME') {
      session.name = text;
      session.step = 'TEL1';
      return bot.sendMessage(chatId, '📱 Enter **Phone Number (Tel 1)**:');
    }

    // Step: Tel 1 -> Ask Target Goal
    if (session.step === 'TEL1') {
      session.tel1 = text;
      session.step = 'TARGET';
      return bot.sendMessage(chatId, '🎯 Select **Target Goal**:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Buy', callback_data: 'target_Buy' }, { text: 'Rent', callback_data: 'target_Rent' }]
          ]
        }
      });
    }

    // Step: Price Rank -> Ask Preferred Area
    if (session.step === 'PRICE_RANK') {
      session.priceRank = text;
      session.step = 'AREA';
      return bot.sendMessage(chatId, '📍 Enter preferred **Location / Area** (or type - to skip):');
    }

    // Step: Area -> Ask Remarks
    if (session.step === 'AREA') {
      session.area = text === '-' ? '' : text;
      session.step = 'REMARK';
      return bot.sendMessage(chatId, '📝 Any additional **Remarks / Specific Requirements**? (or type - to skip):');
    }

    // Step: Remark -> Complete and Dispatch Data
    if (session.step === 'REMARK') {
      session.remark = text === '-' ? '' : text;
      session.telegram = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

      const finalData = { ...session };
      delete userSessions[chatId]; // Reset session

      // A. Send confirmation to Client
      await bot.sendMessage(
        chatId,
        `✅ **Inquiry Recorded Successfully!**\n\n` +
        `👤 **Name:** ${finalData.name}\n` +
        `📱 **Tel 1:** ${finalData.tel1}\n` +
        `🎯 **Target:** ${finalData.target}\n` +
        `🏠 **Type:** ${finalData.propertyType}\n` +
        `💰 **Price Rank:** ${finalData.priceRank}\n` +
        `📍 **Area:** ${finalData.area || 'N/A'}\n` +
        `📝 **Remark:** ${finalData.remark || 'None'}`,
        { parse_mode: 'Markdown', ...mainMenuKeyboard }
      );

      // B. Send Alert directly into TOPIC_CLIENT_ID in your Group (Plain Text Format)
      if (groupId && topicClientId) {
        const clientTopicMsg = 
          `🚨 NEW CLIENT INQUIRY!\n\n` +
          `👤 Name: ${finalData.name}\n` +
          `📱 Tel: ${finalData.tel1}\n` +
          `✈️ Telegram: ${finalData.telegram}\n` +
          `🎯 Target: ${finalData.target}\n` +
          `🏠 Property Type: ${finalData.propertyType}\n` +
          `💰 Price Rank: ${finalData.priceRank}\n` +
          `📍 Area: ${finalData.area || 'N/A'}\n` +
          `📝 Remark: ${finalData.remark || 'None'}`;

        try {
          await bot.sendMessage(groupId, clientTopicMsg, { 
            message_thread_id: Number(topicClientId)
          });
          console.log('✅ Successfully posted to Telegram Group Topic!');
        } catch (err) {
          console.error('❌ TELEGRAM GROUP ERROR:', err.response ? err.response.body : err.message);
        }
      } else {
        console.log('⚠️ Skipped group send: groupId or topicClientId missing in Render settings.');
      }

      // C. Post Row into Google Sheets
      if (sheetUrl) {
        try {
          await fetch(sheetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
          });
          console.log('✅ Successfully posted to Google Sheet!');
        } catch (err) {
          console.error('❌ Google Sheet Sync Error:', err.message);
        }
      }
    }
  }
});

// Inline Keyboard Callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const session = userSessions[chatId];
  const data = query.data;

  // Target Selected (Buy or Rent)
  if (session && session.step === 'TARGET' && data.startsWith('target_')) {
    session.target = data.replace('target_', '');
    session.step = 'PROPERTY_TYPE';

    return bot.sendMessage(chatId, '🏠 Select **Property Type**:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Condo', callback_data: 'pt_Condo' }, { text: 'Villa', callback_data: 'pt_Villa' }],
          [{ text: 'Borey / House', callback_data: 'pt_House' }, { text: 'Land', callback_data: 'pt_Land' }],
          [{ text: 'Commercial', callback_data: 'pt_Commercial' }]
        ]
      }
    });
  }

  // Property Type Selected
  if (session && session.step === 'PROPERTY_TYPE' && data.startsWith('pt_')) {
    session.propertyType = data.replace('pt_', '');
    session.step = 'PRICE_RANK';

    return bot.sendMessage(chatId, '💰 Enter **Price Rank / Budget** (e.g. $50,000 - $100,000 or $500/month):');
  }
});

// Express Web Server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Twenty5 Realty Bot is active!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on port ' + PORT);
});
