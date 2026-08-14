require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('Error: BOT_TOKEN is missing in .env file!');
  process.exit(1);
}

// Fixed constructor call
const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Hello! Welcome to Twenty5 Realty Bot!');
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && !msg.text.startsWith('/')) {
    bot.sendMessage(chatId, 'You said: ' + msg.text);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Twenty5 Realty Bot is running successfully!');
});

app.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
  console.log('Telegram Bot is online and waiting for messages...');
});