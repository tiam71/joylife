const { firestore, realtimeDB , admin } = require('../firebase');

const usersCol = firestore.collection('users');

async function ensureUser(userId) {
  const ref = usersCol.doc(userId);
  const doc = await ref.get();

  if (!doc.exists) {
    await userRef.set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      tone: '溫暖陪伴', // 預設語氣
      progress: 0,
    });
    console.log(`建立新使用者: ${userId}`);
    const userData = { createdAt: new Date() };
    await ref.set(userData);

    // 同步到 Realtime DB
    await realtimeDB.ref(`users/${userId}`).set({
      createdAt: new Date().toISOString(),
    });
    return userRef;
  }
}

async function updateUser(userId, patch) {
  // Firestore 更新
  await usersCol.doc(userId).set(patch, { merge: true });

  // RTDB 更新
  await realtimeDB.ref(`users/${userId}`).update(patch);
}
//儲存使用者的 AI 語氣設定
 
async function saveUserTone(userId, tone) {
  try {
    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({ tone, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(`🎨 已更新 ${userId} 的 AI 語氣設定為: ${tone}`);
  } catch (error) {
    console.error('❌ 儲存使用者語氣設定失敗:', error);
  }
}
//取得使用者目前設定的 AI 語氣，預設「溫暖陪伴」

async function getUserTone(userId) {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      console.log(`取得 ${userId} 的語氣設定: ${data.tone || '溫暖陪伴'}`);
      return data.tone || '溫暖陪伴';
    } else {
      console.log(`找不到使用者 ${userId} 文件，建立中...`);
      await ensureUser(userId);
      return '溫暖陪伴';
    }
  } catch (error) {
    console.error('取得使用者語氣設定失敗:', error);
    return '溫暖陪伴';
  }
}

module.exports = {
  ensureUser,
  saveUserTone,
  getUserTone,
  updateUser ,
};






