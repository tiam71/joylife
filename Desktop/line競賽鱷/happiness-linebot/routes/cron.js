// routes/cron.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
// 👇 1. 引入 firestore (為了查使用者暱稱)
const { firestore } = require('../firebase'); 
const capsuleService = require('../services/capsuleService');
const line = require('@line/bot-sdk');

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

// 日期格式化 helper
function formatDate(dateObj) {
    if (!dateObj) return '未知日期';
    const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
}

router.get('/trigger-send', async (req, res) => {
    console.log('[Cron] 開始執行排程檢查...');
    
    try {
        const capsules = await capsuleService.getDueCapsules();
        
        if (!capsules || capsules.length === 0) {
            console.log('[Cron] 今天沒有要寄送的膠囊');
            return res.send('No capsules to send today.');
        }

        const logs = [];
        
        for (const cap of capsules) {
            try {
                // --- 步驟 A: 判斷寄件人 (優先讀取 Firestore) ---
                let senderName = "時光旅人"; 

                if (cap.senderId === cap.receiverId) {
                    senderName = "過去的你";
                } else {
                    try {
                        // 1. 先去 Firestore `users` 找這個 senderId 的資料
                        const userDoc = await firestore.collection('users').doc(cap.senderId).get();
                        
                        // 2. 如果有找到 doc 且裡面有 name 欄位，就用它
                        if (userDoc.exists && userDoc.data().name) {
                            senderName = userDoc.data().name;
                        } else {
                            // 3. 如果 Firestore 沒資料 (例如舊用戶)，才嘗試抓 LINE Profile
                            const profile = await client.getProfile(cap.senderId);
                            senderName = profile.displayName;
                        }
                    } catch (err) {
                        // 真的都抓不到，只好用通用名稱
                        console.error('抓取名稱失敗:', err.message);
                        senderName = "某位好朋友";
                    }
                }

                // --- 步驟 B: 取得日期 ---
                const writtenDate = formatDate(cap.createdAt || new Date());

                // --- 步驟 C: 高質感 Flex Message ---
                const flexMessage = {
                type: "flex",
                altText: `📬 您有一封來自 ${senderName} 的時光信件`,
                contents: {
                type: "bubble",
                size: "mega",
                body: {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#fcfaf2",
                    paddingTop: "20px",
                    paddingBottom: "20px",
                    paddingStart: "20px",
                    paddingEnd: "20px",
                    contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                        { 
                            type: "text", 
                            text: "TIME CAPSULE", 
                            color: "#b91c1c", 
                            size: "xxs", 
                            weight: "bold", 
                            flex: 1 
                        },
                        { 
                            type: "text", 
                            text: "OFFICIAL DELIVERY", 
                            color: "#d4d4d8", 
                            size: "xxs", 
                            weight: "bold", 
                            align: "end", 
                            flex: 1 
                        }
                        ],
                        margin: "none"
                    },
                    {
                        type: "text",
                        text: "時光包裹已送達",
                        weight: "bold",
                        size: "xl",
                        color: "#2c2c2c",
                        margin: "md"
                    },
                    { 
                        type: "separator", 
                        margin: "lg", 
                        color: "#b91c1c" 
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                        {
                            type: "box",
                            layout: "baseline",
                            contents: [
                            { 
                                type: "text", 
                                text: "From", 
                                color: "#aaaaaa", 
                                size: "xs", 
                                flex: 1 
                            },
                            { 
                                type: "text", 
                                text: senderName, 
                                color: "#2c2c2c", 
                                size: "sm", 
                                weight: "bold", 
                                flex: 4 
                            }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            contents: [
                            { 
                                type: "text", 
                                text: "Date", 
                                color: "#aaaaaa", 
                                size: "xs", 
                                flex: 1 
                            },
                            { 
                                type: "text", 
                                text: writtenDate, 
                                color: "#2c2c2c", 
                                size: "sm", 
                                weight: "regular", 
                                flex: 4 
                            }
                            ]
                        }
                        ]
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "xl",
                        paddingTop: "15px",
                        paddingBottom: "15px",
                        paddingStart: "15px",
                        paddingEnd: "15px",
                        backgroundColor: "#ffffff",
                        contents: [
                        {
                            type: "text",
                            text: cap.content || "(內容空白)",
                            color: "#4b5563",
                            size: "md",
                            wrap: true
                        }
                        ]
                    },
                    {
                        type: "text",
                        text: "還記得寫下這段話時的心情嗎？",
                        size: "xs",
                        color: "#9ca3af",
                        margin: "xl",
                        align: "center"
                    }
                    ]
                }
                }
            };
            
            await client.pushMessage(cap.receiverId, flexMessage);
            await capsuleService.markAsSent(cap.id);
            logs.push(`Success: Sent from ${senderName} to ${cap.receiverId}`);

            } catch (e) {
            console.error(`[Cron] 發送失敗 (${cap.id}):`, e);
            logs.push(`Failed (${cap.id}): ${e.message}`);
            }

        }
        
        res.send(`Job finished. Logs: <br>${logs.join('<br>')}`);

    } catch (error) {
        console.error('[Cron] Error:', error);
        res.status(500).send('Cron error: ' + error.message);
    }
});

module.exports = router;