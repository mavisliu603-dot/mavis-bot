const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  geminiKey: "AIzaSyDwI4dCSCg45BH4_oM8QVr6FMd9TMEJpr8",
  groqKey: "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",
  ownerNumber: "8615119358184",
  companyName: "Brivolux",
  website: "brivoluxtech.com",
  productsDir: path.join(__dirname, "products"),
};

// ============================================================
// 产品知识库
// ============================================================
function loadProducts() {
  const products = {};
  const dirs = ["fan_lights", "energy_storage", "emergency", "company"];
  dirs.forEach((dir) => {
    const files = ["specs.txt", "intro.txt"];
    for (const file of files) {
      const p = path.join(CONFIG.productsDir, dir, file);
      if (fs.existsSync(p)) {
        products[dir] = fs.readFileSync(p, "utf8");
        break;
      }
    }
  });
  return products;
}

// ============================================================
// 客户数据库
// ============================================================
const DB_FILE = path.join(__dirname, "customers.json");

function loadDB() {
  try {
    return fs.existsSync(DB_FILE)
      ? JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
      : {};
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

// ============================================================
// 语言识别
// ============================================================
function detectLanguage(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4e00-\u9fa5]/.test(text)) return "zh";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  if (/ol\u00e1|obrigado|voc\u00ea|brasil|tudo/i.test(text)) return "pt";
  if (/hola|gracias|buenos|c\u00f3mo|espa\u00f1ol|precio/i.test(text)) return "es";
  if (/bonjour|merci|fran\u00e7ais|prix|produit/i.test(text)) return "fr";
  if (/apa|terima kasih|selamat|harga|produk/i.test(text)) return "ms";
  return "en";
}

// ============================================================
// 客户价值评分
// ============================================================
function scoreCustomer(text, history) {
  let score = 0;
  const full = (history.map((h) => h.content).join(" ") + " " + text).toLowerCase();
  if (/\d+\s*(pcs|units|pieces|sets)/i.test(full)) score += 10;
  if (/500|1000|container|fcl/i.test(full)) score += 15;
  if (/certif|ce\b|etl|ul\b|soncap|saso/i.test(full)) score += 10;
  if (/project|installation|tender/i.test(full)) score += 10;
  if (/sample|pi\b|proforma|purchase order/i.test(full)) score += 15;
  if (/lead time|delivery|how long/i.test(full)) score += 5;
  if (/payment|tt\b|wire transfer|lc\b/i.test(full)) score += 10;
  if (/cheapest|lowest price only/i.test(full)) score -= 10;
  return score;
}

// ============================================================
// Mavis 人设 System Prompt
// ============================================================
function buildSystemPrompt(lang, customer, products) {
  const langMap = {
    en: "English", ar: "Arabic", es: "Spanish",
    fr: "French", pt: "Portuguese", ms: "Malay",
    zh: "Chinese", th: "Thai",
  };

  return `You are Mavis Chen, Senior International Sales Manager at Brivolux Technology.

IDENTITY:
- Name: Mavis Chen, 32 years old, Singaporean Chinese
- 8 years experience in international LED lighting & energy storage sales
- Background: Electrical Engineering + International Business MBA
- Markets: Southeast Asia (2016-2018), Middle East (2018-2021), Europe/Africa (2021-2023)
- Currently: Global Sales Manager at Brivolux
- You are a REAL HUMAN - never admit to being AI under any circumstances

COMPANY: Brivolux Technology | brivoluxtech.com | "You air, we care"

PRODUCTS:
1. Brivolux Breeze - Fan Lights
${products.fan_lights || "BL-FL001 72W ($52/pc FOB), BL-FL002 96W ($75/pc FOB). CE/RoHS certified. 3-year warranty. MOQ 50pcs."}

2. Brivolux Power - Energy Storage
${products.energy_storage || "BL-ES001 5kWh ($900/pc), BL-ES002 10kWh ($1650/pc). LiFePO4. CE/IEC62619. 5-year warranty. MOQ 5pcs."}

3. Brivolux Guard - Emergency Storage
${products.emergency || "BL-EM001 1kWh ($175/pc), BL-EM002 2kWh ($320/pc). IP65. Solar compatible. CE/RoHS. MOQ 10pcs."}

PRICING (FOB Shenzhen):
Fan Lights: 50-199pcs $52/pc | 200-499pcs $47/pc | 500+ $43/pc (BL-FL001 72W)
Storage: 10-49pcs $900/pc | 50+ $820/pc (BL-ES001 5kWh)
Emergency: 20-99pcs $175/pc | 100+ $158/pc (BL-EM001 1kWh)

CUSTOMER INFO:
- Name: ${customer.name || "Customer"}
- Country: ${customer.country || "unknown"}
- Score: ${customer.score || 0}/100
- Previous topics: ${customer.interests?.join(", ") || "first contact"}
- Chat count: ${customer.totalChats || 1}

LANGUAGE RULE: You MUST reply ONLY in ${langMap[lang] || "English"}. No exceptions.

CONVERSATION RULES:
1. Keep replies SHORT - max 4 short lines for WhatsApp
2. Sound like a real person texting, NOT writing a formal email
3. Use contractions: I'm, you're, we've, that's
4. Use 1-2 emojis naturally per message
5. Ask only ONE question at a time
6. Reference customer history naturally when available
7. NEVER start with "Dear" or "I hope this message finds you well"

SALES FLOW:
New customer: Warm greeting → ask country → identify need
Interested: Recommend product → offer to send specs/photos
Considering: Give quote → handle objections → build value
Ready to buy: Suggest sample or PI → soft urgency
Follow up: Natural check-in → new value offer

OBJECTION RESPONSES:
"Too expensive" → "I get it! Let me show you what's included - CE cert, 3yr warranty, free tech support... what budget were you working with? Maybe I can find a fit 😊"
"Need to think" → "Of course no rush! Just so you know we have a production run next week - if you decide soon I can hold a slot for you 🙂"
"Competitor cheaper" → "Interesting! Could you share their quote? I want to make sure we're comparing same specs - certification and warranty can make a big difference"
"Just browsing" → "No worries at all! Let me send our catalog - which product caught your eye?"

IF ASKED "are you real/AI/human/robot":
Reply: "Haha yes I'm real! 8 years in this industry 😄 Was my English too perfect? 😂 So anyway, back to your inquiry..."

SHIPPING GUIDE:
- Samples: DHL/FedEx 3-5 days ~$80-150
- 50-300kg: Air freight 5-7 days
- 300kg+: Sea freight LCL/FCL 20-35 days
- Middle East: Also recommend Aramex
- Africa: Advise on local customs

CLOSING MOVES:
- "Want me to prepare a sample order?"
- "Shall I put together a formal PI for you?"
- "I can lock in this price if you confirm by [date]"
- "For 200pcs I can do $47/pc - worth considering?"`;
}

// ============================================================
// AI 回复（Gemini主力 + Groq备用）
// ============================================================
async function getAIReply(text, lang, customer, products) {
  const systemPrompt = buildSystemPrompt(lang, customer, products);
  const history = (customer.history || []).slice(-10);

  // Gemini Flash（主力，免费）
  try {
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text }] },
    ];

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.geminiKey}`,
      {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 300,
          topP: 0.9,
        },
      },
      { timeout: 15000 }
    );

    const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) {
      console.log("[AI: Gemini ✅]");
      return reply.trim();
    }
  } catch (e) {
    console.log("[Gemini ❌]", e.message);
  }

  // Groq 备用
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: text },
        ],
        max_tokens: 300,
        temperature: 0.85,
      },
      {
        headers: { Authorization: `Bearer ${CONFIG.groqKey}` },
        timeout: 10000,
      }
    );
    const reply = res.data?.choices?.[0]?.message?.content;
    if (reply) {
      console.log("[AI: Groq ✅]");
      return reply.trim();
    }
  } catch (e) {
    console.log("[Groq ❌]", e.message);
  }

  return getDefaultReply(lang);
}

// ============================================================
// 默认回复（AI全部失败时）
// ============================================================
function getDefaultReply(lang) {
  const r = {
    en: "Hi! I'm Mavis from Brivolux 😊 We do fan lights, energy storage & emergency power. Which country are you from? That helps me recommend the right products for you!",
    ar: "مرحباً! أنا مافيس من Brivolux 😊 نتخصص في مصابيح المروحة وتخزين الطاقة. من أي دولة أنت؟",
    es: "¡Hola! Soy Mavis de Brivolux 😊 Hacemos ventiladores con luz y almacenamiento de energía. ¿De qué país eres?",
    fr: "Bonjour! Je suis Mavis de Brivolux 😊 Ventilateurs lumineux et stockage d'énergie. Vous êtes de quel pays?",
    pt: "Olá! Sou Mavis da Brivolux 😊 Fazemos ventiladores com luz e armazenamento de energia. De que país você é?",
    ms: "Hai! Saya Mavis dari Brivolux 😊 Kami buat lampu kipas dan penyimpanan tenaga. Dari negara mana anda?",
    zh: "你好！我是Brivolux的Mavis 😊 我们做风扇灯、储能和应急电源。请问您来自哪个国家？",
  };
  return r[lang] || r.en;
}

// ============================================================
// 打字延迟模拟（像真人一样）
// ============================================================
async function simulateTyping(chat, replyText) {
  const charCount = replyText.length;
  const typingTime = Math.min(charCount * 45 + Math.random() * 2000, 9000);
  await chat.sendStateTyping();
  await new Promise((r) => setTimeout(r, typingTime));
}

// ============================================================
// 高价值客户通知
// ============================================================
async function notifyOwner(client, customer, msg) {
  try {
    const ownerJid = CONFIG.ownerNumber + "@c.us";
    await client.sendMessage(
      ownerJid,
      `🔥 高价值客户！\n客户：${customer.name}\n国家：${customer.country || "未知"}\n评分：${customer.score}/100\n消息：${msg}\n\n回复 /接管${customer.number} 切换人工`
    );
  } catch (e) {
    console.log("通知失败:", e.message);
  }
}

// ============================================================
// WhatsApp 客户端
// ============================================================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  try {
    require("qrcode").toFile(
      path.join(__dirname, "qr.png"),
      qr,
      { width: 300 },
      () => console.log("二维码已保存: mavis-bot/qr.png")
    );
  } catch (e) {}
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\n" + "=".repeat(50));
  console.log("  Mavis AI销售系统 V2.0 已启动!");
  console.log("  Brivolux | You air, we care.");
  console.log("  AI: Gemini Flash + Groq备用");
  console.log("  语言: EN/AR/ES/FR/PT/MS/ZH");
  console.log("=".repeat(50) + "\n");
});

client.on("message", async (msg) => {
  if (msg.from.includes("@g.us") || msg.fromMe) return;
  if (msg.type !== "chat") return;

  const sender = msg.from;
  const text = msg.body?.trim();
  if (!text) return;

  const db = loadDB();
  const products = loadProducts();

  // 初始化客户档案
  if (!db[sender]) {
    db[sender] = {
      name: msg._data?.notifyName || "Customer",
      number: sender,
      country: "",
      lang: "en",
      status: "new",
      score: 0,
      history: [],
      interests: [],
      quotes: [],
      totalChats: 0,
      firstContact: new Date().toISOString(),
      lastContact: new Date().toISOString(),
    };
  }

  const customer = db[sender];
  customer.lastContact = new Date().toISOString();
  customer.totalChats = (customer.totalChats || 0) + 1;
  customer.lang = detectLanguage(text);

  // 自动检测国家
  const countryMatch = text.match(
    /(?:from|in|based in|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  );
  if (countryMatch && !customer.country) {
    customer.country = countryMatch[1];
  }

  console.log(`\n[${new Date().toLocaleTimeString()}] ${customer.name} (${customer.lang}): ${text}`);

  // 人工接管模式
  if (customer.status === "manual") {
    console.log(`[人工模式] 跳过自动回复`);
    saveDB(db);
    return;
  }

  // 评分
  const newScore = scoreCustomer(text, customer.history);
  customer.score = (customer.score || 0) + newScore;

  // 加入历史
  customer.history.push({ role: "user", content: text });
  if (customer.history.length > 16) {
    customer.history = customer.history.slice(-16);
  }

  // 获取AI回复
  const reply = await getAIReply(text, customer.lang, customer, products);

  // 模拟打字
  const chat = await msg.getChat();
  await simulateTyping(chat, reply);

  // 发送
  await msg.reply(reply);
  console.log(`[回复] ${reply.substring(0, 100)}`);

  // 记录
  customer.history.push({ role: "assistant", content: reply });
  if (customer.status === "new") customer.status = "contacted";

  // 高价值提醒（首次达到30分时通知）
  const prevScore = customer.score - newScore;
  if (customer.score >= 30 && prevScore < 30) {
    await notifyOwner(client, customer, text);
  }

  saveDB(db);
});

// ============================================================
// 启动
// ============================================================
console.log("=".repeat(50));
console.log("  Mavis 启动中...");
console.log("  Brivolux | You air, we care.");
console.log("=".repeat(50));
client.initialize();
