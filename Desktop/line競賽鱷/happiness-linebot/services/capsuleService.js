// services/capsuleService.js
// ⚠️ 請複製這段完整的程式碼去覆蓋原本的 services/capsuleService.js
const { firestore } = require('../firebase'); 
const { v4: uuidv4 } = require('uuid');

const CAPSULE_COLLECTION = 'capsules';

const capsuleService = {
  // 1. 建立膠囊
  async createCapsule(senderId, content, targetDate, receiverId = null) {
    console.log(`[Service] 建立膠囊... Sender:${senderId}, To:${receiverId || 'Link'}`);
    const capsuleId = uuidv4().split('-')[0]; 
    const status = receiverId ? 'active' : 'pending';

    try {
      await firestore.collection(CAPSULE_COLLECTION).doc(capsuleId).set({
        id: capsuleId,
        senderId: senderId,
        receiverId: receiverId, 
        content: content,
        sendDate: targetDate, 
        status: status,       
        createdAt: new Date()
      });
      return capsuleId;
    } catch (error) {
      console.error('[Service] 寫入失敗:', error);
      throw error;
    }
  },

  // 2. 綁定接收者
  async bindReceiver(capsuleId, receiverId) {
    const docRef = firestore.collection(CAPSULE_COLLECTION).doc(capsuleId);
    return await firestore.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) throw new Error('找不到此膠囊');
      const data = doc.data();

      // 允許本人重複點擊查看
      if (data.status === 'active' && data.receiverId === receiverId) {
          return { success: true, date: data.sendDate };
      }
      if (data.status !== 'pending') {
        throw new Error('此膠囊已經被領取或失效');
      }

      t.update(docRef, { receiverId: receiverId, status: 'active', updatedAt: new Date() });
      return { success: true, date: data.sendDate };
    });
  },

  // 3. 【關鍵修正】取得所有到期的膠囊 (你原本缺這個!)
  async getDueCapsules() {
    const now = new Date();
    const twDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
    const y = twDate.getFullYear();
    const m = String(twDate.getMonth() + 1).padStart(2, '0');
    const d = String(twDate.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    console.log(`[Service] 正在檢查 ${today} 到期信件...`);

    try {
        const snapshot = await firestore.collection(CAPSULE_COLLECTION)
            .where('status', '==', 'active') 
            .where('sendDate', '<=', today)
            .get();

        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('[Service] 查詢失敗:', error);
        return [];
    }
  },

  // 4. 標記為已寄送
  async markAsSent(capsuleId) {
    await firestore.collection(CAPSULE_COLLECTION).doc(capsuleId).update({
        status: 'sent',
        sentAt: new Date()
    });
  }
};

module.exports = capsuleService;