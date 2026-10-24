require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());
app.set('trust proxy', 1); 

const NEXORA_API = process.env.NEXORA_URL;
const TOKEN = process.env.NEXORA_TOKEN;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'wego123456';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function sendTelegramNotification(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;
    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId, text: message, parse_mode: 'HTML'
        });
    } catch (error) {}
}

app.post('/api/create-custom-order', async (req, res) => {
    const { name, email, protocol, durationDays } = req.body;
    
    if (!name || !email || !protocol || !durationDays) {
        return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
    }

    try {
        const safeName = name.replace(/\s+/g, '_').substring(0, 10);
        const safeEmail = email.replace(/[@.]/g, '_').substring(0, 10);
        const durationInSeconds = Number(durationDays) * 24 * 60 * 60; 
        const volumeInGB = Number(durationDays) * 2; 
        const volumeInBytes = volumeInGB * 1024 * 1024 * 1024;
        const uniqueId = crypto.randomBytes(4).toString('hex'); 

        let proxies = {};
        let inbounds = {};

        // 🟢 تحديد البروتوكول بناءً على اختيار العميل
        if (protocol === 'v2ray' || protocol === 'v2ray_ws') {
            proxies = { vless: {}, vmess: {} };
            inbounds = { vless: ["VLESS TCP REALITY"], vmess: ["VMess TCP"] };
        } else if (protocol === 'trojan') {
            proxies = { trojan: {} };
            inbounds = { trojan: ["TROJAN TCP"] };
        } else if (protocol === 'ssh') {
            proxies = { ssh: {} }; 
            inbounds = { ssh: ["SSH"] };
        }

        const payload = {
            adminId: 0, allTemplates: true, autoReset: false,
            config: { uuid: crypto.randomUUID(), password: crypto.randomBytes(16).toString('hex') },
            desc: "", deviceLimit: 0, duration: durationInSeconds, enable: true, expiry: 0,
            group: "", ipLimit: 0, name: `${safeName}_${safeEmail}_${uniqueId}`, remark: "",
            resetCalendar: "", resetDays: 0, resetPeriod: "", resetStartDay: 1, resetStartMonth: 1,
            speedLimit: 0, subId: crypto.randomUUID(), templateIds: [],
            volume: volumeInBytes, start_on_first_connection: true,
            note: `Type: Free | Protocol: ${protocol} | Email: ${email} | Name: ${name}`,
            proxies: proxies, inbounds: inbounds
        };

        const response = await axios.post(`${NEXORA_API}/users`, payload, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            httpsAgent, timeout: 8000 
        });

        const userData = response.data;
        const subUrl = userData.subUrl;
        let configLink = "لم يتم العثور على الكونفيج";

        if (subUrl) {
            try {
                const subRes = await axios.get(subUrl, { httpsAgent });
                const decoded = Buffer.from(subRes.data, 'base64').toString('utf-8');
                const lines = decoded.split('\n');
                
                // 🟢 بنجيب الكونفيج حسب البروتوكول اللي إحنا طالبينه
                lines.forEach(line => {
                    if (protocol.includes('v2ray') && line.startsWith('vless://')) configLink = line.trim();
                    if (protocol === 'trojan' && line.startsWith('trojan://')) configLink = line.trim();
                    if (protocol === 'ssh' && (line.includes('ssh') || line.includes('@'))) configLink = line.trim();
                });

                // لو ملقاش حاجة، يرجع أول سطر
                if (configLink === "لم يتم العثور على الكونفيج" && lines.length > 0) {
                    configLink = lines[0].trim();
                }
            } catch (err) {
                console.error("Error fetching config:", err.message);
            }
        }

        const tgMessage = `🎁 <b>كونفيج مجاني جديد</b>\n👤 <b>الاسم:</b> ${name} | 📧 <b>الإيميل:</b> ${email}\n📦 <b>الباقة:</b> ${protocol} / ${durationDays} يوم\n🔗 <b>اللينك:</b>\n<code>${subUrl}</code>`;
        await sendTelegramNotification(tgMessage);

        // بنرجع الكونفيج اللي طلع (سواء vless أو ssh أو غيره)
        res.json({ success: true, data: { configLink: configLink } });
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'حدث خطأ في لوحة التحكم' });
    }
});

app.post('/api/my-orders', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'إيميل غير صحيح' });

    try {
        const response = await axios.get(`${NEXORA_API}/users`, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/json' }, 
            httpsAgent, timeout: 8000
        });
        
        const allUsers = response.data.users || response.data || [];
        const emailPart = email.replace(/[@.]/g, '_').substring(0, 10);
        const myUsers = allUsers.filter(u => u.name.includes(emailPart));

        const formattedData = myUsers.map(user => {
            let subUrl = user.subUrl;
            if (!subUrl && user.subId) subUrl = `${NEXORA_API.replace('/api', '')}/sub/${user.subId}`;
            return { name: user.name, status: user.enable ? 'active' : 'disabled', volume: user.volume, up: user.up || 0, down: user.down || 0, expiry: user.expiry, subUrl: subUrl, note: user.note || '' };
        });
        
        formattedData.sort((a, b) => b.expiry - a.expiry);
        res.json({ success: true, data: formattedData });
    } catch (error) { 
        res.status(500).json({ success: false, message: 'Error fetching data' }); 
    }
});

app.post('/api/get-config', async (req, res) => {
    const { subUrl } = req.body;
    try {
        const subRes = await axios.get(subUrl, { httpsAgent });
        const decoded = Buffer.from(subRes.data, 'base64').toString('utf-8');
        const link = decoded.split('\n').find(l => l.includes('://'));
        if (link) res.json({ success: true, configLink: link.trim() });
        else res.status(404).json({ success: false, message: 'لا يوجد كونفيج' });
    } catch (error) { res.status(500).json({ success: false, message: 'خطأ' }); }
});

app.post('/api/admin/orders', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASS) return res.status(401).json({ success: false, message: 'Wrong Password' });

    try {
        const response = await axios.get(`${NEXORA_API}/users`, {
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/json' }, httpsAgent, timeout: 8000
        });
        
        let allUsers = response.data.users || response.data || [];
        let filteredUsers = allUsers.filter(u => {
            if (u.owner && String(u.owner).toLowerCase() === 'admin') return true;
            if (u.name && u.name.includes('_')) return true;
            if (u.note && u.note.includes('Email:')) return true;
            return false;
        });

        filteredUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        const formatted = filteredUsers.map(u => {
            let subUrl = u.subUrl || (u.subId ? `${NEXORA_API.replace('/api', '')}/sub/${u.subId}` : '');
            return {
                id: u.id, name: u.name, status: u.enable ? 'active' : 'disabled', 
                volume: u.volume, up: u.up || 0, down: u.down || 0, expiry: u.expiry, subUrl: subUrl, note: u.note || ''
            };
        });
        res.json({ success: true, data: formatted });
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`🚀 السيرفر شغال على بورت ${process.env.PORT || 3000}`);
    });
}
