const express = require('express');
const axios = require('axios');
const { auth } = require('../firebase');
const router = express.Router();

// 1. 導向 LINE Login
router.get('/login', (req, res) => {
  const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', process.env.LINE_LOGIN_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', process.env.LINE_LOGIN_REDIRECT_URI);
  authorizeUrl.searchParams.set('scope', 'openid profile');
  authorizeUrl.searchParams.set('state', 'random_' + Math.random().toString(36).slice(2));
  res.redirect(authorizeUrl.toString());
});

// 2. callback → 交換 Token → 驗證 → 產生 Firebase Custom Token
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const tokenResp = await axios.post('https://api.line.me/oauth2/v2.1/token', null, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINE_LOGIN_REDIRECT_URI,
        client_id: process.env.LINE_LOGIN_CLIENT_ID,
        client_secret: process.env.LINE_LOGIN_CLIENT_SECRET,
      },
    });

    const { id_token } = tokenResp.data;

    // 驗證 id_token
    const verifyResp = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
      params: { id_token, client_id: process.env.LINE_LOGIN_CLIENT_ID },
    });

    const { sub: lineUserId, name } = verifyResp.data;

    // 用 LINE user id 建立 Firebase Token
    const firebaseToken = await auth.createCustomToken(lineUserId, { provider: 'line' });

    res.json({ firebaseToken, profile: { lineUserId, name } });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send('LINE Login Failed');
  }
});

module.exports = router;
