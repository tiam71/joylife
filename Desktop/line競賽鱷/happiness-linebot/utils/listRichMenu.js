// utils/listRichMenu.js
require('dotenv').config();
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

(async () => {
  try {
    const richMenus = await client.getRichMenuList();
    console.log('📋 目前的 Rich Menu 清單:');
    console.log(JSON.stringify(richMenus, null, 2));
  } catch (err) {
    console.error('❌ 取得 Rich Menu 清單失敗：', err.originalError?.response?.data || err);
  }
})();
