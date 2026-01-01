const { firestore, admin } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

// 上傳任務圖片
async function saveTaskImage(userId, imageBuffer, mimeType) {
  // 指定 Storage bucket
  const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);

  // 檔案儲存路徑：uploads/userId/uuid.jpg
  const filePath = `uploads/${userId}/${uuidv4()}.jpg`;
  const file = bucket.file(filePath);

  // 寫入圖片
  await file.save(imageBuffer, {
    metadata: { contentType: mimeType },
  });

  // 設為公開可讀
  await file.makePublic();

  // 取得公開連結
  const url = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}`;

  // Firestore 記錄上傳紀錄
  await firestore.collection('user_uploads').add({
    userId,
    url,
    path: filePath,
    uploadedAt: new Date().toISOString(),
  });

  return url;
}

module.exports = { saveTaskImage };
