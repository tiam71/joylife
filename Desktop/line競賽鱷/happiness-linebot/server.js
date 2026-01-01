// server.js
require('dotenv').config(); 
const cors = require('cors');
const express = require('express');
const { firestore, realtimeDB, auth } = require('./firebase');

// ------------------------------------------------
// 1. 引入路由檔案 (記得要 require 剛剛寫的 api.js)
// ------------------------------------------------
const webhookRoutes = require('./routes/webhook');
const loginRoutes = require('./routes/login');
const apiRouter = require('./routes/api'); 
const cronRouter = require('./routes/cron');
const app = express();
app.use(cors());
// ------------------------------------------------
// 2. 設定 Middleware (必須在路由掛載之前)
// ------------------------------------------------

// 解析 JSON，同時保留 rawBody 給 LINE 簽章驗證使用
// 這一個設定對 LINE Webhook 和 前端 API 都有效，不用寫兩次
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // 存 Buffer
  }
}));

// 解析 URL-encoded 格式 (表單資料)
app.use(express.urlencoded({ extended: true }));


// ------------------------------------------------
// 3. 掛載路由
// ------------------------------------------------
app.use('/', webhookRoutes);  // 掛載 LINE Webhook
app.use('/', loginRoutes);    // 掛載登入相關
app.use('/api', apiRouter);   // 掛載 API (建立膠囊功能)
app.use('/cron', cronRouter);

// ------------------------------------------------
// 4. 測試路由 (保持不變)
// ------------------------------------------------
// 測試 Firestore
app.get('/firestore-test', async (req, res) => {
  try {
    const docRef = firestore.collection('users').doc('testUser');
    await docRef.set({ name: 'Alice', createdAt: new Date() });
    const doc = await docRef.get();
    res.json(doc.data());
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// 測試 Realtime Database
app.get('/rtdb-test', async (req, res) => {
  try {
    const ref = realtimeDB.ref('users/testUser');
    await ref.set({ name: 'Bob', createdAt: new Date().toISOString() });
    const snapshot = await ref.once('value');
    res.json(snapshot.val());
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// 測試 Auth
app.get('/auth-test', async (req, res) => {
  try {
    const user = await auth.createUser({
      email: `user${Date.now()}@test.com`,
      password: 'password123',
    });
    res.json(user);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});