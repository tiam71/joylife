// utils/createRichMenu.js
require('dotenv').config();
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const baseRichMenuConfig = {
  size: { width: 2500, height: 1686 },
  chatBarText: "開啟任幸選單 💫",
  selected: false,
};

// --- 定義切換區域的 helper ---
const createSwitchAreas = (currentPage) => [
  { bounds: { x: 0, y: 0, width: 833, height: 251 }, action: { type: "richmenuswitch", richMenuAliasId: "page_1", data: "page=1" }},
  { bounds: { x: 833, y: 0, width: 833, height: 251 }, action: { type: "richmenuswitch", richMenuAliasId: "page_2", data: "page=2" }},
  { bounds: { x: 1666, y: 0, width: 833, height: 251 }, action: { type: "richmenuswitch", richMenuAliasId: "page_3", data: "page=3" }},
];

const richMenuPage1 = {
  ...baseRichMenuConfig,
  name: "Page1_任務首頁",
  areas: [
    ...createSwitchAreas(1),
    { bounds: { x: 0, y: 251, width: 2500, height: 665 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=event&event=xmas" }},
    { bounds: { x: 0, y: 916, width: 1250, height: 770 }, action: { type: "message", text: "每週任務" }},
    { bounds: { x: 1250, y: 916, width: 1250, height: 770 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j" }},
  ],
};

const richMenuPage2 = {
  ...baseRichMenuConfig,
  name: "Page2_成長紀錄",
  areas: [
    ...createSwitchAreas(2),
    { bounds: { x: 0, y: 251, width: 2500, height: 665 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=event&event=newyear" }},
    { bounds: { x: 0, y: 916, width: 833, height: 770 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=tasks" }},
    { bounds: { x: 833, y: 916, width: 833, height: 770 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=badges" }},
    { bounds: { x: 1666, y: 916, width: 833, height: 770 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=recap" }},
  ],
};

const richMenuPage3 = {
  ...baseRichMenuConfig,
  name: "Page3_AI陪伴",
  areas: [
    ...createSwitchAreas(3),
    { bounds: { x: 0, y: 251, width: 2500, height: 665 }, action: { type: "uri", uri: "https://liff.line.me/2008223484-qgJsGp1j?page=event&event=spring" }},
    { bounds: { x: 0, y: 916, width: 1250, height: 770 }, action: { type: "message", text: "設定AI性格" }},
    { bounds: { x: 1250, y: 916, width: 1250, height: 770 }, action: { type: "message", text: "給我一句建議" }},
  ],
};

async function createRichMenus() {
  try {
    // 0. 先清理舊的 Alias 避免衝突
    const existingAliases = await client.getRichMenuAliasList();
    for (const alias of existingAliases.aliases) {
      await client.deleteRichMenuAlias(alias.richMenuAliasId);
    }

    const menus = [richMenuPage1, richMenuPage2, richMenuPage3];
    const createdMenuIds = [];

    for (const [i, menu] of menus.entries()) {
      // 1. 建立選單
      const richMenuId = await client.createRichMenu(menu);
      createdMenuIds.push(richMenuId);
      console.log(`✅ Rich Menu ${i + 1} 已建立：${richMenuId}`);

      // 2. 綁定圖片
      const imgPath = path.join(__dirname, '../richmenu_images', `richmenu_${i + 1}.jpg`);
      if (fs.existsSync(imgPath)) {
        await client.setRichMenuImage(richMenuId, fs.createReadStream(imgPath));
        console.log(`🖼️ 已綁定圖片：${imgPath}`);
      }

      // 3. 建立別名 (Alias)
      const aliasId = `page_${i + 1}`;
      await client.createRichMenuAlias(richMenuId, aliasId);
      console.log(`🏷️ 已建立別名：${aliasId}`);
    }

    // 4. 設定第一頁為預設選單
    await client.setDefaultRichMenu(createdMenuIds[0]);
    console.log(`⭐ 已設定 ${createdMenuIds[0]} 為預設選單`);

    console.log('🎉 Alias 版 Rich Menu 配置完成！');
  } catch (err) {
    console.error('❌ 建立失敗：', err.originalError?.response?.data || err);
  }
}

createRichMenus();