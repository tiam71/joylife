// taskService.js
const { firestore, admin } = require('../firebase'); // 確保路徑正確指向你的 firebase.js

// 1. 取得所有任務列表
async function getAllTasks() {
  const snapshot = await firestore.collection('tasks').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 2. 查詢單一使用者的進度
async function getUserTasks(userId) {
  const doc = await firestore.collection('user_tasks').doc(userId).get();
  return doc.exists ? doc.data() : {};
}

// 3. 標記任務完成 + 計算積分 (核心功能)
async function markTaskCompleted(userId, taskId, imageUrl = null) {
  const userRef = firestore.collection('users').doc(userId);
  const taskRef = firestore.collection('user_tasks').doc(userId);

  // 🎯 判斷是否為活動任務 (給予不同積分)
  // 邏輯：如果任務 ID 或標題包含特定關鍵字，給 100 分，否則 50 分
  const isEvent = taskId.includes("活動") || taskId.includes("聖誕") || taskId.includes("新年") || taskId.includes("春季");
  const bonusPoints = isEvent ? 100 : 50;

  try {
    await firestore.runTransaction(async (t) => {
      // (A) 寫入任務完成紀錄
      // 使用 set + merge: true，避免覆蓋掉該使用者其他的任務紀錄
      t.set(taskRef, {
        [taskId]: {
          status: 'completed',
          photoUrl: imageUrl,
          completedAt: new Date().toISOString(),
        }
      }, { merge: true });

      // (B) 增加使用者積分
      // 使用 increment 確保即使多人同時操作也不會算錯
      t.set(userRef, {
        points: admin.firestore.FieldValue.increment(bonusPoints),
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    console.log(`✅ User ${userId} 完成任務 ${taskId} | 積分 +${bonusPoints}`);
    return bonusPoints; // 回傳獲得的分數，方便 Controller 回覆 LINE 訊息

  } catch (error) {
    console.error('❌ 交易失敗:', error);
    throw error;
  }
}

module.exports = { getAllTasks, markTaskCompleted, getUserTasks };