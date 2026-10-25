# wegov2ray (wegov2ray.bond)

> موقع مجاني بالكامل لتوليد اشتراكات VPN (V2Ray / Xray) تلقائياً عبر REST API للوحة Nexora، مصمم ليعمل على **Cloudflare Workers (Static Assets + Worker)** بنظام بيئي متكامل وآمن.

---

## 🌟 المميزات والمواصفات

- **تصميم فائق البساطة (Ultra-Minimalist)**:
  - خلفية سوداء هادئة `#0A0A0A`، وكروت `#121212` بحدود رمادية `1px`.
  - اللون الأساسي الأصفر `#FFD60A` مع توهج (glow) ناعم جداً عند الـ hover.
  - زوايا مستديرة `14px`، وخط **Cairo** للعربية و **Inter** للإنجليزية.
  - ثنائي اللغة (عربي RTL افتراضي / English) مع دعم كامل للهواتف والأجهزة المختلفة (Mobile-First).
- **مولّد اشتراكات فوري**:
  - اختيار من 4 بروتوكولات أساسية:
    1. **VLESS Reality** (Template: `VLESS TCP REALITY`) — الأفضل لتخطي الحجب والسرعة الفائقة.
    2. **VLESS WebSocket** (Template: `VLESS WS`) — ممتاز لشبكات الـ CDN.
    3. **VMess WS TLS** (Template: `VMess WS TLS`) — توافقية قياسية مع الأجهزة القديمة.
    4. **VMess TCP** (Template: `VMess TCP`) — اتصال مباشر بأقل استهلاك للموارد.
  - خيارات المدة: 24 ساعة (86400 ثانية)، 4 أيام (345600 ثانية)، أسبوع (604800 ثانية).
  - حماية **Cloudflare Turnstile** لمنع البوتات وهجمات الاستنزاف.
  - بطاقة نتيجة تفاعلية: رابط اشتراك موحد، QR Code، روابط كونفيج فردية قابلة للطي، عدّاد تنازلي للوقت المتبقي، وسعة 1TB.
  - أزرار تثبيت مباشر للتطبيقات (Deep Links): `v2rayNG`, `Hiddify`, `Streisand`, `V2Box`.
  - حفظ آخر اشتراك في `localStorage` (داخل `try/catch`) لتسهيل الرجوع إليه قبل انتهائه.
- **مراقبة حية للسيرفرات (Server Status)**:
  - عرض حالة السيرفرات (Online/Degraded)، عدد المتصلين، وحمل السيرفر كنسبة مئوية، ومستوى السعة المتاحة.
  - **ممنوع كشف أي IPs أو عناوين داخلية نهائياً** لحماية البنية التحتية.
- **شروحات الإعداد والتوصيل**:
  - خطوات مختصرة ومصورة بالترتيب لـ v2rayNG و Hiddify و Streisand و V2Box و v2rayN.
- **سياسة خصوصية واستخدام صادقة وقانونية**:
  - لا نعد بوعود "no-logs" زائفة ومضللة؛ يتم توضيح أننا نشفّر الـ IP عبر `SHA-256` مع Salt ونحتفظ بالـ Hash فقط لمدة أقصاها 24 ساعة في ذاكرة مؤقتة (KV) لمنع الهجمات وإدارة الحصص اليومية، ثم تُحذف تلقائياً.
  - بند استخدام مقبول (AUP) صارم يمنع الأنشطة غير القانونية، وإفصاح الكوكيز والإعلانات.
- **جاهزية الإعلانات (Ad-Ready)**:
  - مكوّن `<AdSlot />` بمساحات ثابتة (أعلى المولّد، بعد النتيجة، والعمود الجانبي للديسكتوب) معطلة حالياً (`ADS_ENABLED=false`) وتعمل بمجرد تفعيل المتغير، دون أي تأثير سلبي على سرعة الموقع أو تجربة المستخدم.

---

## 🏗️ هيكلية المشروع (Architecture)

```
wegov2ray/
├── index.html                   # HTML الرئيسي مع خطوط Cairo & Inter وTurnstile
├── package.json                 # التبعيات وسكربتات التشغيل والبناء
├── tsconfig.json                # إعدادات TypeScript
├── vite.config.ts               # إعدادات Vite مع بروكسي الـ API
├── tailwind.config.js           # ألوان وهوية wegov2ray وتأثير الـ glow
├── wrangler.toml                # إعدادات Cloudflare Worker + Static Assets + Cron
├── .dev.vars.example            # نموذج المتغيرات السرية المحلية
├── src/
│   ├── worker/                  # كود الباك إند (Cloudflare Worker)
│   │   ├── index.ts             # معالج الـ API والـ Cron Trigger
│   │   ├── types.ts             # تعريفات الأنواع والبيانات
│   │   ├── nexora.ts            # طبقة NexoraClient والتواصل مع Nexora API
│   │   ├── rate-limit.ts        # تشفير الـ IP والـ Rate Limiting والحد اليومي
│   │   └── turnstile.ts         # التحقق من Cloudflare Turnstile
│   ├── tests/                   # اختبارات الوحدة (Unit Tests)
│   │   ├── nexora.test.ts       # اختبارات عميل Nexora وحساب السعات
│   │   └── rate-limit.test.ts   # اختبارات خصوصية الـ IP والحدود
│   └── frontend/                # كود الواجهة الأمامية (React + Vite)
│       ├── main.tsx             # نقطة الدخول
│       ├── App.tsx              # الصفحة الرئيسية وإدارة الحالة
│       ├── index.css            # أنماط Tailwind وتأثيرات التوهج
│       ├── i18n/                # الترجمة للغتين العربية والإنجليزية
│       ├── components/          # المكونات (Generator, ResultCard, Status...)
│       └── utils/               # أدوات التخزين والروابط العميقة (Deep Links)
```

---

## ⚙️ متطلبات التشغيل والنشر

1. **Node.js**: إصدار 20+ (تم الاختبار على Node 24).
2. **حساب Cloudflare**: لنشر الـ Worker وتفعيل KV Namespace و Turnstile.
3. **لوحة Nexora**: مع تفعيل API Token بصلاحيات:
   - `users:write`
   - `nodes:read`
   - `templates:read`
   - `stats:read`

---

## 🚀 خطوات النشر على Cloudflare Workers

### 1. تثبيت الحزم محلياً

```bash
npm install
```

### 2. إعداد KV Namespace على Cloudflare

قم بتنفيذ الأمر لإنشاء مساحة التخزين المؤقت `KV`:

```bash
npx wrangler kv namespace create KV
```

انسخ الـ `id` الناتج وضعه داخل ملف `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "ضع_الـ_ID_هنا"
```

### 3. إعداد الأسرار (Cloudflare Secrets)

> ⚠️ **تنبيه أمني هام**: لا تضع التوكنات السرية داخل الكود أو في ملف `wrangler.toml` نهائياً.

استخدم أوامر wrangler لإضافة الأسرار مباشرة إلى Cloudflare:

```bash
# توكن لوحة Nexora
npx wrangler secret put NEXORA_TOKEN

# المفتاح السري لـ Cloudflare Turnstile
npx wrangler secret put TURNSTILE_SECRET
```

### 4. إعداد المتغيرات العادية في `wrangler.toml`

تأكد من مراجعة قيم `[vars]` في `wrangler.toml`:

```toml
[vars]
NEXORA_API_URL = "https://ahmedmedo.bond:2053/api/v1"
SUPPORT_URL = "https://t.me/wegov2ray"
LICENSE_CAP = "25"
RESERVED_SLOTS = "3"
MAX_PER_IP_PER_DAY = "0"    # 0 = غير محدود
USER_IP_LIMIT = "5"
ADS_ENABLED = "false"
TURNSTILE_SITE_KEY = "0x4AAAAAA..." # Site Key العام للـ Turnstile
```

### 5. بناء ونشر الموقع

لبناء ملفات الواجهة الأمامية ونشر الـ Worker مع الـ Static Assets دفعة واحدة:

```bash
# بناء ملفات الواجهة
npm run build

# النشر المباشر
npm run worker:deploy
```

### 6. ربط الدومين الخاص `wegov2ray.bond` و `www`

في لوحة تحكم Cloudflare Dashboard:
1. توجه إلى: **Workers & Pages** -> اختر مشروع **wegov2ray**.
2. انتقل إلى تبويب **Settings** -> **Domains & Routes**.
3. اضغط على **Add Custom Domain** وأضف:
   - `wegov2ray.bond`
   - `www.wegov2ray.bond`
4. سيقوم Cloudflare بإنشاء شهادة SSL وتوجيه الحركة تلقائياً عبر شبكته السحابية.

---

## 💻 التشغيل المحلي والتطوير (Local Development)

1. أنشئ ملف `.dev.vars` بوضع أسرارك المحلية (بناءً على `.dev.vars.example`):
   ```ini
   NEXORA_TOKEN="your_nexora_token"
   TURNSTILE_SECRET=""
   ```
2. شغّل خادم الباك إند المحلي:
   ```bash
   npm run worker:dev
   ```
3. في نافذة طرفية أخرى، شغّل واجهة المستخدم:
   ```bash
   npm run dev
   ```
4. افتح المتصفح على: `http://localhost:3000`

---

## 🧪 تشغيل اختبارات الوحدة (Testing)

تم تضمين اختبارات تغطي طبقة `NexoraClient` والتعامل مع السعات، الـ rate limiting، وتشفير الـ IP:

```bash
npm test
```

---

## 🔒 الأمان ومكافحة الاستنزاف

1. **الخصوصية الشديدة**: لا يتم تخزين عنوان IP الصريح للمستخدمين في أي قاعدة بيانات. يتم إنشاء Hash أحادي الاتجاه عبر `SHA-256(Salt + IP)` وتخزينه بمدة صلاحية قصوى 24 ساعة في KV لمنع هجمات الـ DDoS والحسابات المتكررة.
2. **منع الأخطاء المتكررة (Idempotency)**: كل طلب لإنشاء مستخدم يرسل هيدر `Idempotency-Key` (UUID) فريد. في حال رجوع كود `409 Conflict`، يقوم العميل بإعادة المحاولة مرة واحدة بنفس المفتاح كما هو موثق.
3. **التنظيف التلقائي للحسابات (Auto-Cleanup)**:
   - يتم تشغيل معالج `scheduled()` عبر Cron Trigger كل 10 دقائق (`*/10 * * * *`) لحذف الحسابات المنتهية تلقائياً.
   - في حال نفاد الأماكن لحظة طلب المستخدم (`slotsLeft <= 0`)، يقوم الـ Worker بتشغيل أمر التنظيف فوراً وإعادة حساب المقاعد المتاحة.
   - في حال استمرار الامتلاء أو استرجاع كود `402` من Nexora، يتم إرجاع كود `503` برسالة ودية للمستخدم: *"الخدمة ممتلئة حالياً، جرّب بعد شوية"*.
4. **تشفير الاتصالات وعزل الـ Frontend**: الواجهة الأمامية لا تتصل مطلقاً بلوحة Nexora ولا تعلم عنها شيئاً؛ كل الطلبات تمر عبر Cloudflare Worker المعزول أمنياً.
