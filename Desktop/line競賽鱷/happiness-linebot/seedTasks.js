// seedTasks.js
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const themes = {
  "自我挑戰": [
    { title: "一天不抱怨", subtitle: "沒有人來煩我，大家都很安分" },
    { title: "早起一小時", subtitle: "起床後寫下三件感恩的事" },
    { title: "嘗試新事物", subtitle: "挑戰從未做過的一件小事" },
    { title: "走不同的路回家", subtitle: "結果真的迷路，但也挺新鮮。" },
  ],
  "學習成就": [
    { title: "看完一本理財相關的書", subtitle: "分享你今天學到的一句話" },
    { title: "閱讀一篇新知文章", subtitle: "原來學到新東西這麼有成就感。" },
    { title: "學習一項新技能", subtitle: "可大可小，例如剪影片或烹飪" },
    { title: "記錄今天的學習成果", subtitle: "學習筆記比心情日記還有成就感。" },
    { title: "學一個實用技能", subtitle: "修好一樣東西就像打敗人生小怪獸。" },
    { title: "完成一件拖延很久的事", subtitle: "終於不用再被良心譴責了。" },
  ],
  "家庭關懷": [
    { title: "陪家人聊天10分鐘", subtitle: "問候、傾聽、表達感謝" },
    { title: "幫忙家務", subtitle: "做一件幫家人減輕負擔的小事" },
    { title: "主動洗碗", subtitle: "被媽媽誇獎的感覺太稀有了。" },
    { title: "幫忙整理房間", subtitle: "找回了失蹤的襪子和童年。" },
    { title: "寫張小卡片給家人", subtitle: "雖然害羞，但感動是真的。" },
  ],
  "友情升溫": [
    { title: "傳訊息給好友", subtitle: "問候久未聯絡的朋友" },
    { title: "一起午餐", subtitle: "與朋友面對面交流" },
    { title: "分享一首喜歡的歌", subtitle: "那首歌變成我們的新默契。" },
    { title: "一起拍一張合照", subtitle: "笑得太大結果眼睛變一條線。" },
    { title: "傳訊息給老朋友", subtitle: "對方回我『你誰』，但我們聊回來了。" },
    { title: "誠實說一句感謝", subtitle: "朋友愣了一下，但笑得很真。" },
  ],
  "學習探索": [
    { title: "看一部紀錄片", subtitle: "從影片中學習新的觀點" },
    { title: "探索一個興趣", subtitle: "寫下你想嘗試的事情" },
    { title: "查一個你從沒關心過的主題", subtitle: "發現世界比想像大很多。" },
    { title: "找一個你佩服的人聊天或學習", subtitle: "原來榜樣真的會發光。" },
    { title: "寫幾篇日記", subtitle: "原來榜樣真的會發光。" },
    { title: "寫下一件想改變的事", subtitle: "從想法開始，就是行動的起點。" },
  ],
  "社會參與": [
    { title: "撿垃圾10分鐘", subtitle: "維護社區整潔" },
    { title: "閱讀時事新聞", subtitle: "了解社會議題並反思" },
    { title: "關心一則社會議題", subtitle: "原來每個行動都能帶來影響。" },
    { title: "參與志工", subtitle: "原來每個行動都能帶來影響。" },
    { title: "了解近期熱門的國際時事", subtitle: "原來每個行動都能帶來影響。" },
    { title: "了解近期熱門的國內時事", subtitle: "原來每個行動都能帶來影響。" },
  ],
};


async function seed() {
  for (const [category, tasks] of Object.entries(themes)) {
    for (let i = 0; i < tasks.length; i++) {
      const docRef = db.collection("tasks").doc();
      await docRef.set({
        title: tasks[i].title,
        subtitle: tasks[i].subtitle,
        category,
        progress: 0,
        active: true,
      });
    }
  }
  console.log("✅ 任務清單建立完成！");
  process.exit();
}

seed().catch(console.error);
