const line = require('@line/bot-sdk');

module.exports = (req, res, next) => {
  const signature = req.get('x-line-signature');
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!line.validateSignature(req.rawBody, channelSecret, signature)) {
    console.error('❌ 簽章驗證失敗');
    return res.status(401).send('Invalid signature');
  }

  next();
};
