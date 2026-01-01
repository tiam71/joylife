// utils/setDefaultRichMenu.js
require('dotenv').config();
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const RICHMENU_ID = 'richmenu-114fbe61fae905b9b37fbd257ee8a358';

(async () => {
  try {
    await client.setDefaultRichMenu(RICHMENU_ID);
    console.log(`✅ 已設定 ${RICHMENU_ID} 為預設 Rich Menu`);
  } catch (err) {
    console.error('❌ 設定失敗：', err.originalError?.response?.data || err);
  }
})();

