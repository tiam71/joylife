// utils/deleteAllRichMenus.js
require('dotenv').config();
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function deleteAllRichMenus() {
  try {
    console.log('🔍 正在查詢所有 Rich Menu...\n');
    
    // 取得所有 Rich Menu
    const richMenus = await client.getRichMenuList();
    
    if (richMenus.length === 0) {
      console.log('✅ 目前沒有任何 Rich Menu');
      return;
    }

    console.log(`📋 找到 ${richMenus.length} 個 Rich Menu:\n`);
    richMenus.forEach((menu, index) => {
      console.log(`${index + 1}. ${menu.name || '未命名'}`);
      console.log(`   ID: ${menu.richMenuId}`);
      console.log(`   大小: ${menu.size.width}x${menu.size.height}`);
      console.log(`   選單文字: ${menu.chatBarText}\n`);
    });

    // 檢查預設 Rich Menu
    let defaultMenuId = null;
    try {
      defaultMenuId = await client.getDefaultRichMenuId();
      console.log(`⭐ 預設 Rich Menu: ${defaultMenuId}\n`);
    } catch (err) {
      console.log('ℹ️  沒有設定預設 Rich Menu\n');
    }

    // 開始刪除
    console.log('🗑️  開始刪除...\n');
    
    for (const menu of richMenus) {
      try {
        // 如果是預設選單，先取消預設
        if (menu.richMenuId === defaultMenuId) {
          console.log(`⚠️  正在取消預設 Rich Menu: ${menu.richMenuId}`);
          await client.deleteDefaultRichMenu();
          console.log('✅ 已取消預設設定');
        }

        // 刪除 Rich Menu
        await client.deleteRichMenu(menu.richMenuId);
        console.log(`✅ 已刪除: ${menu.name || menu.richMenuId}`);
      } catch (err) {
        console.error(`❌ 刪除失敗 ${menu.richMenuId}:`, err.message);
      }
    }

    console.log('\n🎉 所有 Rich Menu 已清除完成！');
    
  } catch (err) {
    console.error('❌ 執行失敗:', err.originalError?.response?.data || err.message);
  }
}

// 執行刪除
deleteAllRichMenus();