// firebase.js
const admin = require('firebase-admin');
require('dotenv').config();

// 載入 service account JSON
const serviceAccount = require('./firebase-service-account.json');

// 初始化 Firebase Admin
if (!admin.apps.length) {
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
