# wegov2ray

المشروع الحالي يستخدم React/Vite للواجهة وCloudflare Workers للـ API، مع D1 للحسابات و3x-ui لإنشاء حسابات VPN من الخادم.

## تشغيل محلي

1. ثبّت Node.js ثم نفّذ `npm install`.
2. أضف إعداداتك السرية محلياً في `.dev.vars`، ولا ترفع هذا الملف إلى Git:

```dotenv
XUI_BASE_URL=https://your-panel.example
XUI_API_TOKEN=your-api-token
XUI_PUBLIC_HOST=vpn.example
LOCAL_TEST_MODE=true
SESSION_SECRET=use-a-long-random-value
```

3. شغّل `start.bat` أو `npm run local`، ثم افتح العنوان الذي يعرضه Wrangler.

أمر التشغيل المحلي يسمح بما يصل إلى 7 حسابات يوميًا و7 حسابات نشطة للمستخدم لتجربة أنواع الاتصال؛ هذه القيم لا تُستخدم عند النشر.

قاعدة D1 وKV المحلية تستخدم محاكاة Wrangler. للتشغيل الكامل في Cloudflare، عيّن معرفات D1 وKV في `wrangler.toml`، واضبط الأسرار باستخدام Wrangler secrets. لا تضع بيانات لوحة التحكم في متغيرات الواجهة العامة.

## إعداد 3x-ui

- `XUI_BASE_URL`: عنوان لوحة HTTPS.
- `XUI_API_TOKEN`: API token الخاص باللوحة، محفوظ كسِر على الخادم.
- `XUI_PUBLIC_HOST`: اسم المضيف المستخدم في إعدادات الاتصال.
- `XUI_INBOUND_MAP`: ربط البروتوكولات بالـ inbounds المخصصة للموقع.

لا يغيّر التطبيق إعدادات الـ inbounds. يجب تفعيل شهادة TLS صالحة للوحة.

## الأوامر

- `npm run dev`: الواجهة مع API محلي.
- `npm run local`: بناء الواجهة وتشغيل Worker وD1 المحليين.
- `npm test`: الاختبارات.
- `npm run build`: بناء الإنتاج.
