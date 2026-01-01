const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;

// 邏輯：Zeabur 上面沒有檔案，所以我們改讀環境變數
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // 把環境變數裡的 JSON 字串轉回物件
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('Firebase JSON 解析失敗，請檢查環境變數格式', error);
  }
} else {
  // 本地開發時，如果沒有設定環境變數，嘗試讀取檔案
  try {
    serviceAccount = require('./firebase-service-account.json');
  } catch (error) {
    console.warn('找不到本地金鑰檔案，也未設定環境變數');
  }
}

// 初始化 Firebase Admin
if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL, // Realtime Database
    storageBucket: "gs://joyline-61e03.firebasestorage.app", 
  });
}

// Firestore
const firestore = admin.firestore();

// Realtime Database
const realtimeDB = admin.database();

// Firebase Auth
const auth = admin.auth();

const storage = admin.storage();

// 匯出模組
module.exports = {
  admin,
  firestore,
  realtimeDB,
  auth,
  storage,
};