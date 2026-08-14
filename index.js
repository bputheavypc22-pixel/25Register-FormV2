require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('Error: BOT_TOKEN is missing in environment variables!');
  process.exit(1);
}

// Fixed constructor call for TelegramBot
const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! Welcome to Twenty5 Realty Bot!');
});

// Handle incoming regular messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && !msg.text.startsWith('/')) {
    bot.sendMessage(chatId, 'You said: ' + msg.text);
  }
});

// Web server setup for Render & UptimeRobot
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Twenty5 Realty Bot is running successfully!');
});

// Bind to 0.0.0.0 to ensure Render receives incoming web requests properly
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server listening on port ' + PORT);
  console.log('Telegram Bot is online and waiting for messages...');
});