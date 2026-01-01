// routes/webhook.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const signatureCheck = require('../middlewares/lineSignature');
const { replyText } = require('../services/line');
const { ensureUser, saveUserTone, getUserTone } = require('../services/userService');
const { getAllTasks, getUserTasks, markTaskCompleted } = require('../services/taskService');
const { saveTaskImage } = require('../services/uploadService');
// 1. 新增引用 capsuleService
const capsuleService = require('../services/capsuleService'); 
const OpenAI = require('openai');

// ---------------------
// 設定檔與常數
// ---------------------
const RICHMENU_ID_MAP = {
  1: 'richmenu-114fbe61fae905b9b37fbd257ee8a358', 
  2: 'richmenu-598b8d74a7aa3cb0b787eaa1f223f9a3',
  3: 'richmenu-c9a24f8370bc5df8c0018f21cce9f57f',
};

// 2. 設定你的 LINE Bot ID (用於產生連結)
// 請將此處改為你的官方帳號 ID (包含 @ 符號，例如 @joylife)
const LINE_BOT_ID = '@620hhxpv'; 

const AI_TONES = {
  '溫暖陪伴': '你是個溫柔溫暖的朋友，用體貼和理解的語氣回應對方。',
  '幽默風趣': '你是個有幽默感的朋友，喜歡用輕鬆搞笑的語氣回應對方。',
  '熱情活力': '你是充滿能量的夥伴，語氣開朗有動力。',
  '高冷寡言': '你是個高冷但一針見血的朋友，用簡短回答。',
};

// ---------------------
// 初始化 SDK
// ---------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// ---------------------
// 記憶體暫存 (注意：正式環境建議改用 Redis 或資料庫)
// ---------------------
let pendingUploads = {}; 

// ---------------------
// 工具函式
// ---------------------
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getWeeklySeededTasks(tasks, weekNumber) {
  const seed = weekNumber * 12345;
  const rng = mulberry32(seed);
  const sortedTasks = tasks.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
  const shuffled = sortedTasks.sort(() => rng() - 0.5);
  return shuffled.slice(0, 7);
}

// ---------------------
// AI 回覆生成 (支援分段)
// ---------------------
async function generateAIReplyMessages(userMessage, tone) {
  const basePrompt = `
核心原則:
1. 使用繁體中文,語氣自然、溫柔、貼近台灣日常對話。
2. 每次回應若內容較多，請使用 "|||" 符號將不同段落分開，以便我分次傳送。
3. 總字數控制在 100 字以內，不要長篇大論。
  `.trim();

  const specificPrompt = AI_TONES[tone] || AI_TONES['溫暖陪伴'];
  const systemPrompt = `${basePrompt}\n${specificPrompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const rawContent = completion.choices[0].message.content || '';
    
    const messages = rawContent
      .split('|||')
      .map(text => ({ type: 'text', text: text.trim() }))
      .filter(msg => msg.text.length > 0);

    return messages.slice(0, 5);

  } catch (error) {
    console.error('OpenAI Error:', error);
    return [{ type: 'text', text: '我現在腦袋有點打結，稍後再聊好嗎？😵‍💫' }];
  }
}

// ---------------------
// Webhook Entry
// ---------------------
router.post('/webhook', signatureCheck, async (req, res) => {
  try {
    const events = req.body.events || [];
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).end();
  }
});

// ---------------------
// 事件處理主邏輯
// ---------------------
async function handleEvent(event) {
  const userId = event.source?.userId;
  if (!userId) return null;

  try {
    await ensureUser(userId);

    if (event.type === 'message' && event.message.type === 'image') {
      return await handleImageUpload(event, userId);
    }

    if (event.type === 'message' && event.message.type === 'text') {
      return await handleTextMessage(event, userId);
    }

    if (event.type === 'postback') {
      return await handlePostback(event, userId);
    }

  } catch (err) {
    console.error(`Error handling event for ${userId}:`, err);
  }
  return null;
}

// --- 分離出的邏輯: 圖片處理 ---
async function handleImageUpload(event, userId) {
  const taskId = pendingUploads[userId];
  
  if (!taskId) {
    return await replyText(event.replyToken, '⚠️ 請先從選單選擇「上傳圖片」的任務，我才知道這是哪一張喔！');
  }

  try {
    console.log(`🖼️ ${userId} 上傳圖片給任務 ${taskId}`);
    const stream = await client.getMessageContent(event.message.id);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const imageUrl = await saveTaskImage(userId, buffer, 'image/jpeg');
    await markTaskCompleted(userId, taskId, imageUrl);

    delete pendingUploads[userId];
    
    return await client.replyMessage(event.replyToken, [
      { type: 'text', text: '📸 收到照片囉！' },
      { type: 'text', text: '✅ 任務驗證成功，太棒了！' }
    ]);
  } catch (err) {
    console.error('❌ 上傳圖片錯誤:', err);
    return await replyText(event.replyToken, '上傳處理失敗，請稍後再試 🙏');
  }
}

// --- 分離出的邏輯: 文字處理 ---
async function handleTextMessage(event, userId) {
  const text = event.message.text.trim();

  // ----------------------------------------------------
  // 時光膠囊 
  // ----------------------------------------------------
if (text.startsWith('兌換:')) {
  const capsuleId = text.split(':')[1]?.trim();
  
  // 如果 ID 是空的，提示使用者
  if (!capsuleId) {
    await replyText(event.replyToken, '❌ 請提供有效的膠囊編號\n格式：兌換:CAPSULE_ID');
    return true;
  }

  try {
    const result = await capsuleService.bindReceiver(capsuleId, userId);
    
    // ✨ 修正版 Flex Message（移除不支援的屬性）
    const flexMessage = {
      type: "flex",
      altText: "收到一封來自過去的信",
      contents: {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#fcfaf2",
          spacing: "md",
          contents: [
            // 標題區
            {
              type: "text",
              text: "時光信箋 • 封存確認",
              weight: "bold",
              color: "#b91c1c",
              size: "xs",
              align: "center"
            },
            {
              type: "separator",
              margin: "md",
              color: "#b91c1c"
            },
            // 主要內容
            {
              type: "text",
              text: "信件已入庫",
              weight: "bold",
              size: "xl",
              margin: "lg",
              align: "center",
              color: "#2c2c2c"
            },
            {
              type: "text",
              text: "系統已確認您的身份。這封信將在時光長河中旅行，並於指定日期送達您的手中。",
              size: "sm",
              color: "#666666",
              wrap: true,
              margin: "md",
              align: "center"
            },
            // 裝飾分隔
            {
              type: "separator",
              margin: "xl",
              color: "#e0e0e0"
            },
            // 資訊欄位
            {
              type: "box",
              layout: "horizontal",
              margin: "lg",
              contents: [
                { 
                  type: "text", 
                  text: "📅 預計送達", 
                  size: "sm", 
                  color: "#888888", 
                  flex: 0 
                },
                { 
                  type: "text", 
                  text: result.date || "未設定", 
                  size: "sm", 
                  color: "#111111", 
                  align: "end", 
                  weight: "bold" 
                }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "sm",
              contents: [
                { 
                  type: "text", 
                  text: "🔑 信箋編號", 
                  size: "sm", 
                  color: "#888888", 
                  flex: 0 
                },
                { 
                  type: "text", 
                  text: capsuleId, 
                  size: "sm", 
                  color: "#111111", 
                  align: "end", 
                  weight: "bold" 
                }
              ]
            }
          ]
        },
        styles: {
          body: {
            backgroundColor: "#fcfaf2"
          }
        }
      }
    };

    // 嘗試發送 Flex Message
    await client.replyMessage(event.replyToken, flexMessage);
    console.log("✅ Flex Message 發送成功");
    return true;

  } catch (err) {
    console.error("Binding Error:", err);
    
    // 記錄詳細錯誤
    if (err.originalError?.response?.data) {
      console.error("LINE API Error Details:", JSON.stringify(err.originalError.response.data, null, 2));
    }
    
    
    try {
      await replyText(
        event.replyToken, 
        `❌ 抱歉，這顆膠囊無法領取。\n原因：${err.message || '連結已失效或已被領取'}`
      );
    } catch (replyErr) {
      // 如果錯誤訊息也發送失敗，只記錄但不再拋出
      console.error("⚠️ 無法發送錯誤訊息（replyToken 可能已失效）:", replyErr.message);
    }
    
    return true; // ✅ 錯誤已處理
  }
}


  
  // 性格設定引導
  if (text === '設定AI性格') {
    const quickReply = {
      items: Object.keys(AI_TONES).map(tone => ({
        type: 'action',
        action: { type: 'message', label: tone, text: `AI性格：${tone}` }
      }))
    };
    return await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '想讓我用哪一種語氣陪你聊天呢？',
      quickReply,
    });
  }

  // 儲存性格
  if (text.startsWith('AI性格：')) {
    const tone = text.replace('AI性格：', '');
    if (AI_TONES[tone]) {
      await saveUserTone(userId, tone);
      return await replyText(event.replyToken, `好喔！接下來我會用「${tone}」的方式陪你聊天 🌟`);
    }
  }

  // 每週任務
  if (text === '每週任務') {
    const allTasks = await getAllTasks();
    const userTasks = await getUserTasks(userId);
    const uncompleted = allTasks.filter(
      (t) => !userTasks[t.id] || userTasks[t.id].status !== 'completed'
    );

    const weekNumber = Math.ceil(
      (Date.now() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 86400000)
    );
    const weeklyTasks = getWeeklySeededTasks(uncompleted, weekNumber);

    if (weeklyTasks.length === 0) {
      return replyText(event.replyToken, '🎉 本週任務都完成啦！去休息吧！');
    }
    return await client.replyMessage(event.replyToken, buildTaskCarousel(weeklyTasks, true));
  }

  // 任務清單
  if (text === '任務清單' || text === '#任務') {
    const tasks = await getAllTasks();
    if (!tasks.length) return replyText(event.replyToken, '目前沒有任務喔!');
    return await client.replyMessage(event.replyToken, buildTaskCarousel(tasks));
  }

  // 進度查詢
  if (text === '#進度') {
    const userTasks = await getUserTasks(userId);
    const done = Object.values(userTasks).filter((t) => t.status === 'completed').length;
    const total = (await getAllTasks()).length || 1; 
    const percent = Math.round((done / total) * 100);
    return await replyText(event.replyToken, `📊 目前進度：${percent}% (${done}/${total})`);
  }

  // 取消上傳狀態
  if (text === '取消上傳') {
    if (pendingUploads[userId]) {
      delete pendingUploads[userId];
      return await replyText(event.replyToken, '✅ 已取消上傳模式，我們繼續聊天吧！');
    }
    return await replyText(event.replyToken, '目前沒有正在進行的上傳喔。');
  }

  if (text.startsWith('#上傳:')) {
    const taskTitle = text.replace('#上傳:', '').trim();
    const taskId = text.split(':')[1]; 
    const allTasks = await getAllTasks();
    const task = allTasks.find(t => t.title === taskTitle);
    
    if (task) {
      pendingUploads[userId] = task.id;
      return await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `📸 收到！請上傳「${task.title}」的照片給我吧！\n(若想放棄請點擊「取消上傳」)`,
        quickReply: {
          items: [{ type: 'action', action: { type: 'message', label: '取消上傳', text: '取消上傳' } }]
        }
      });
    } else {
      return await replyText(event.replyToken, `⚠️ 找不到「${taskTitle}」這個任務，請確認任務名稱是否正確。`);
    }
  }

  // AI 聊天 (最後才執行)
  const tone = await getUserTone(userId) || '溫暖陪伴';
  const aiMessages = await generateAIReplyMessages(text, tone);
  return await client.replyMessage(event.replyToken, aiMessages);
}

// --- 分離出的邏輯: Postback ---
async function handlePostback(event, userId) {
  const params = new URLSearchParams(event.postback.data || '');
  const action = params.get('action');

  if (action === 'switch') {
    const page = params.get('page');
    const targetMenu = RICHMENU_ID_MAP[page];
    if (targetMenu) {
      try {
        await client.linkRichMenuToUser(userId, targetMenu);
      } catch (e) {
        console.error('RichMenu link failed:', e);
      }
    }
    return;
  }

  if (action === 'upload') {
    const taskId = params.get('taskId');
    const taskTitle = decodeURIComponent(params.get('taskTitle') || '');
    
    pendingUploads[userId] = taskId;
    
    return await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📸 請傳送一張「${taskTitle}」的照片給我！\n(若想放棄請輸入「取消上傳」)`,
      quickReply: {
        items: [{ type: 'action', action: { type: 'message', label: '取消上傳', text: '取消上傳' } }]
      }
    });
  }

  if (action === 'complete') {
    const taskId = params.get('taskId');
    await markTaskCompleted(userId, taskId);
    return await replyText(event.replyToken, '🎉 任務已標記為完成！');
  }
}

// ---------------------
// UI 元件: Carousel Builder
// ---------------------
function buildTaskCarousel(tasks, uploadMode = false) {
  const displayTasks = tasks.slice(0, 10);

  return {
    type: 'flex',
    altText: uploadMode ? '每週任務清單' : '全部任務清單',
    contents: {
      type: 'carousel',
      contents: displayTasks.map(t => ({
        type: 'bubble',
        size: 'kilo',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: uploadMode ? '📸' : '✨', size: '3xl' },
                {
                  type: 'text',
                  text: uploadMode ? '待上傳' : '待完成',
                  size: 'xs',
                  color: '#ffffff',
                  weight: 'bold',
                  align: 'end',
                  gravity: 'center',
                },
              ],
              justifyContent: 'space-between',
              paddingAll: 'md',
            },
          ],
          backgroundColor: uploadMode ? '#667eea' : '#48bb78',
          paddingAll: 'none',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: t.title || '任務',
              weight: 'bold',
              size: 'xl',
              color: '#1a202c',
              wrap: true,
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                t.subtitle ? {
                  type: 'text',
                  text: t.subtitle,
                  size: 'sm',
                  color: '#718096',
                  wrap: true,
                } : null,
                {
                  type: 'text',
                  text: `類別: ${t.category || '一般'}`,
                  size: 'xs',
                  color: '#a0aec0',
                }
              ].filter(Boolean),
            },
          ],
          paddingAll: 'xl',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              color: uploadMode ? '#667eea' : '#48bb78',
              action: uploadMode
                ? {
                    type: 'postback',
                    label: '📸 上傳證明',
                    data: `action=upload&taskId=${t.id}&taskTitle=${encodeURIComponent(t.title || '')}`,
                  }
                : {
                    type: 'postback',
                    label: '✅ 標記完成',
                    data: `action=complete&taskId=${t.id}`,
                  },
            },
          ],
          paddingAll: 'lg',
        },
      })),
    },
  };
}

module.exports = router;