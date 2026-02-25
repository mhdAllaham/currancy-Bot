require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { getPricesInBase } = require('./services/currencyApi');

const token = process.env.TELEGRAM_TOKEN;
if (!token || token === 'your_token_here') {
    console.error("Please add your Telegram bot token to the .env file as TELEGRAM_TOKEN");
    process.exit(1);
}

// -------------------------------------------------------------
// DUMMY WEB SERVER FOR CLOUD HOSTING (Koyeb, Render, etc.)
// -------------------------------------------------------------
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Currency Bot is running! 🚀');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server is listening on port ${PORT}`);
});
// -------------------------------------------------------------

const bot = new TelegramBot(token, { polling: true });

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const usersFile = path.join(__dirname, 'data', 'users.json');
let users = {};
if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

function saveUsers() {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Available currencies for selection
const CURRENCIES = {
    'SAR': '🇸🇦 ريال سعودي',
    'EGP': '🇪🇬 جنيه مصري',
    'AED': '🇦🇪 درهم إماراتي',
    'KWD': '🇰🇼 دينار كويتي',
    'QAR': '🇶🇦 ريال قطري',
    'OMR': '🇴🇲 ريال عماني',
    'BHD': '🇧🇭 دينار بحريني',
    'JOD': '🇯🇴 دينار أردني',
    'IQD': '🇮🇶 دينار عراقي',
    'SYP': '🇸🇾 ليرة سورية',
    'LBP': '🇱🇧 ليرة لبنانية',
    'DZD': '🇩🇿 دينار جزائري',
    'MAD': '🇲🇦 درهم مغربي',
    'TND': '🇹🇳 دينار تونسي',
    'LYD': '🇱🇾 دينار ليبي',
    'TRY': '🇹🇷 ليرة تركية',
    'USD': '🇺🇸 دولار أمريكي',
    'EUR': '🇪🇺 يورو',
    'GBP': '🇬🇧 جنيه إسترليني'
};

const ITEMS_TO_TRACK = ['USD', 'EUR', 'GBP', 'XAU', 'XAG'];

const currencyKeyboard = {
    inline_keyboard: [
        [{ text: CURRENCIES['SAR'], callback_data: 'curr_SAR' }, { text: CURRENCIES['EGP'], callback_data: 'curr_EGP' }],
        [{ text: CURRENCIES['AED'], callback_data: 'curr_AED' }, { text: CURRENCIES['KWD'], callback_data: 'curr_KWD' }],
        [{ text: CURRENCIES['QAR'], callback_data: 'curr_QAR' }, { text: CURRENCIES['OMR'], callback_data: 'curr_OMR' }],
        [{ text: CURRENCIES['BHD'], callback_data: 'curr_BHD' }, { text: CURRENCIES['JOD'], callback_data: 'curr_JOD' }],
        [{ text: CURRENCIES['IQD'], callback_data: 'curr_IQD' }, { text: CURRENCIES['SYP'], callback_data: 'curr_SYP' }],
        [{ text: CURRENCIES['LBP'], callback_data: 'curr_LBP' }, { text: CURRENCIES['DZD'], callback_data: 'curr_DZD' }],
        [{ text: CURRENCIES['MAD'], callback_data: 'curr_MAD' }, { text: CURRENCIES['TND'], callback_data: 'curr_TND' }],
        [{ text: CURRENCIES['LYD'], callback_data: 'curr_LYD' }, { text: CURRENCIES['TRY'], callback_data: 'curr_TRY' }],
        [{ text: CURRENCIES['USD'], callback_data: 'curr_USD' }, { text: CURRENCIES['EUR'], callback_data: 'curr_EUR' }],
        [{ text: CURRENCIES['GBP'], callback_data: 'curr_GBP' }]
    ]
};

const shareLink = `https://t.me/share/url?url=https://t.me/your_bot_username&text=%D8%A5%D9%84%D9%8A%D9%83%20%D9%87%D8%B0%D8%A7%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D8%A7%D9%84%D8%B1%D8%A7%D8%A6%D8%B9%20%D9%84%D9%85%D8%B9%D8%B1%D9%81%D8%A9%20%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D8%B9%D9%85%D9%84%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%AF%D9%86%20%D8%A7%D9%84%D8%AB%D9%85%D9%8A%D9%86%D8%A9!`;
const shareKeyboard = [[{ text: '✨ شارك البوت مع أصدقائك ✨', url: shareLink }]];

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (!users[chatId]) {
        users[chatId] = { currency: null, subscribed: true };
        saveUsers();
    }

    bot.sendMessage(chatId, `مرحباً بك في بوت الأسعار 📈\nنقدم لك تحديثات أسعار العملات والمعادن (الذهب XAU، الفضة XAG).\n\nالأوامر المتاحة:\n/prices - عرض الأسعار الآن\n/setcurrency - تغيير العملة المحلية\n\nفضلاً.. اختر عملتك المحلية من القائمة لتستقبل الأسعار بها:`, {
        reply_markup: currencyKeyboard
    });
});

bot.onText(/\/setcurrency/, (msg) => {
    bot.sendMessage(msg.chat.id, `يرجى اختيار العملة المحلية الخاصة بك:`, {
        reply_markup: currencyKeyboard
    });
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('curr_')) {
        const selectedCurrency = data.split('_')[1];
        if (!users[chatId]) {
            users[chatId] = { subscribed: true };
        }
        users[chatId].currency = selectedCurrency;
        saveUsers();

        bot.answerCallbackQuery(query.id, { text: `تم تحديث عملتك إلى ${selectedCurrency} بنجاح ✅` });

        bot.editMessageText(`تم ضبط عملتك المحلية على: **${CURRENCIES[selectedCurrency]}**\n\nسيعرض البوت الأسعار بهذه العملة.\nيمكنك طلب /prices لرؤية الأسعار الآن.`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: shareKeyboard }
        });
    }
});

async function sendPrices(chatId, userCurrency) {
    const sentMsg = await bot.sendMessage(chatId, `⏳ جاري جلب أحدث الأسعار...`);

    const prices = await getPricesInBase(userCurrency, ITEMS_TO_TRACK);

    if (!prices) {
        return bot.editMessageText(`❌ عذراً، حدث خطأ أثناء جلب الأسعار. حاول مرة أخرى لاحقاً.`, {
            chat_id: chatId,
            message_id: sentMsg.message_id
        });
    }

    let message = `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🏦 **أسعار الصرف والمعادن**\n`;
    message += `📍 العملة: **${CURRENCIES[userCurrency] || userCurrency}**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const formatNumber = (num) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

    message += `💵 **العملات الأجنبية:**\n`;
    if (prices['USD'] && userCurrency !== 'USD') message += ` 🇺🇸 دولار أمريكي ➖ \`${formatNumber(prices['USD'])}\`\n`;
    if (prices['EUR'] && userCurrency !== 'EUR') message += ` 🇪🇺 يورو ➖ \`${formatNumber(prices['EUR'])}\`\n`;
    if (prices['GBP'] && userCurrency !== 'GBP') message += ` 🇬🇧 جنيه إسترليني ➖ \`${formatNumber(prices['GBP'])}\`\n`;

    message += `\n💎 **المعادن الثمينة (للأونصة):**\n`;
    if (prices['XAU']) message += ` 🥇 الذهب (XAU) ➖ \`${formatNumber(prices['XAU'])}\`\n`;
    if (prices['XAG']) message += ` 🥈 الفضة (XAG) ➖ \`${formatNumber(prices['XAG'])}\`\n`;

    message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    const d = new Date();
    message += `⏱ التحديث: \`${d.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}\`\n`;

    bot.editMessageText(message, {
        chat_id: chatId,
        message_id: sentMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: shareKeyboard }
    });
}

bot.onText(/\/prices/, async (msg) => {
    const chatId = msg.chat.id;
    const user = users[chatId];

    if (!user || !user.currency) {
        return bot.sendMessage(chatId, `يرجى اختيار العملة المحلية الخاصة بك أولاً عبر الأمر /setcurrency`, {
            reply_markup: currencyKeyboard
        });
    }

    await sendPrices(chatId, user.currency);
});

// Scheduler: Send updates every 12 hours (e.g., at 9 AM and 9 PM)
cron.schedule('0 9,21 * * *', async () => {
    console.log('Running scheduled broadcast...');
    for (const [chatId, userData] of Object.entries(users)) {
        if (userData.subscribed && userData.currency) {
            try {
                await sendPrices(chatId, userData.currency);
            } catch (error) {
                console.error(`Failed to send to ${chatId}:`, error.message);
            }
        }
    }
});

console.log("🤖 Bot is running...");
