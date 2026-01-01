const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');

const router = express.Router();

// Step 1: 引導使用者去 LINE Login 授權頁
router.get('/login', (req, res) => {
  const authorizeUrl =
    `https://access.line.me/oauth2/v2.1/authorize?response_type=code` +
    `&client_id=${process.env.LINE_LOGIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.LINE_LOGIN_REDIRECT_URI)}` +
    `&state=12345abcde` +
    `&scope=openid%20profile`;
  res.redirect(authorizeUrl);
});

// Step 2: LINE 回傳授權碼，伺服器拿 code 去換 access token
router.get('/login/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // 用 code 換 access_token & id_token
    const tokenRes = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINE_LOGIN_REDIRECT_URI,
        client_id: process.env.LINE_LOGIN_CLIENT_ID,
        client_secret: process.env.LINE_LOGIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { id_token, access_token } = tokenRes.data;

    // 取得使用者資料
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { userId, displayName, pictureUrl } = profileRes.data;

    // 用 Firebase Admin 建立 Custom Token
    const customToken = await admin.auth().createCustomToken(userId);

    // 回傳給前端（真實專案會 redirect，這裡簡單輸出）
    res.json({
      message: 'LINE Login 成功',
      firebaseCustomToken: customToken,
      profile: { userId, displayName, pictureUrl },
    });
  } catch (err) {
    console.error('LINE Login Error:', err.response?.data || err.message);
    res.status(500).send('Login Failed');
  }
});

module.exports = router;
