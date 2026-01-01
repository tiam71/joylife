const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim(),
  channelSecret: (process.env.LINE_CHANNEL_SECRET || '').trim(),
};

console.log("LINE AccessToken length:", config.channelAccessToken.length);

const client = new line.Client(config);

async function replyText(replyToken, text) {
  return client.replyMessage(replyToken, { type: 'text', text });
}

module.exports = { replyText };
