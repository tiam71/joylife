// routes/api.js
const express = require('express');
const router = express.Router();
const capsuleService = require('../services/capsuleService'); // 確保引用路徑正確

// 設定你的 Bot ID (用於生成連結)
const LINE_BOT_ID = '@620hhxpv'; 

// 接收前端 (Vue) 來的建立膠囊請求
router.post('/createCapsule', async (req, res) => {
    try {
        const { userId, content, date, receiverId } = req.body;
        if (!userId || !content || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. 呼叫 Service 寫入 Firestore
        const capsuleId = await capsuleService.createCapsule(userId, content, date);
        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(0,0,0,0); // 歸零時分秒，只比對日期
        if (inputDate < today) {
            return res.status(400).json({ error: '不能寄回到過去喔！請選擇明天以後的日期。' });
        }
        // 2. 生成 Deep Link
        // 格式：https://line.me/R/oaMessage/{BOT_ID}/?兌換:{CAPSULE_ID}
        // 注意：這裡直接回傳完整連結給前端顯示
        const link = `https://line.me/R/oaMessage/${LINE_BOT_ID}/?兌換:${capsuleId}`;

        // 3. 回傳給前端
        res.json({ 
            success: true, 
            capsuleId: capsuleId,
            link: link 
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;