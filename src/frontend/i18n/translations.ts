export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    brand: 'wegov2ray',
    nav: {
      generator: 'المولّد',
      status: 'حالة السيرفر',
      guides: 'شروحات الإعداد',
      faq: 'الأسئلة الشائعة',
      support: 'الدعم الفني',
      language: 'English',
    },
    hero: {
      tag: 'اشتراكات مجانية 100% بدون تسجيل',
      title: 'إنترنت حر وآمن بدون قيود',
      subtitle: 'أنشئ اشتراكات V2Ray و Xray مجانية بضغطة زر واحدة لتخطي الحجب وتأمين اتصالك بأعلى سرعة وسعة 1TB.',
      cta: 'ابدأ مجاناً الآن',
      learnMore: 'شروحات التشغيل',
    },
    generator: {
      badge: 'المولّد التلقائي',
      title: 'أنشئ حسابك المجاني',
      subtitle: 'اختر البروتوكول والمدة المفضلة واضغط على إنشاء للحصول على رابط الاشتراك والـ QR Code فوراً.',
      protocolLabel: '1. اختر البروتوكول',
      protocols: {
        'vless-reality': {
          name: 'VLESS Reality',
          desc: 'الأفضل لتخطي الحجب الصارم والسرعة الفائقة بدون شهادة SSL',
        },
        'vless-ws': {
          name: 'VLESS WebSocket',
          desc: 'ممتاز لشبكات الـ CDN وتجاوز حجب المنافذ في الشبكات المراقبة',
        },
        'vmess-ws-tls': {
          name: 'VMess WS TLS',
          desc: 'توافقية قياسية وعالية مع الأجهزة والتطبيقات القديمة والحديثة',
        },
        'vmess-tcp': {
          name: 'VMess TCP',
          desc: 'اتصال مباشر وسريع بأقل استهلاك لموارد المعالج وبطارية الجهاز',
        },
      },
      durationLabel: '2. اختر المدة',
      durations: {
        '86400': '24 ساعة',
        '345600': '4 أيام',
        '604800': 'أسبوع كامل',
      },
      turnstileLabel: 'التحقق الأمني',
      generateBtn: 'إنشاء الحساب الآن',
      generatingBtn: 'جاري تجهيز الاشتراك...',
      serviceFullMsg: 'الخدمة ممتلئة حالياً، يرجى المحاولة بعد قليل أو عند تحرير أماكن جديدة.',
      limitMsg: 'لقد استنفدت الحد المسموح لإنشاء الحسابات مؤقتاً.',
      genericError: 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة بعد لحظات.',
    },
    result: {
      titleSuccess: 'تم إنشاء الاشتراك بنجاح!',
      titleRestored: 'اشتراكك النشط المحفوظ',
      restoredBadge: 'تم استعادته من ذاكرة جهازك',
      subUrlLabel: 'رابط الاشتراك الموحد (Subscription URL)',
      copyBtn: 'نسخ الرابط',
      copiedBtn: 'تم النسخ بنجاح!',
      qrTitle: 'امسح الـ QR Code من التطبيق',
      quotaLabel: 'سعة البيانات:',
      quotaVal: '1 تيرابايت (1024 GB)',
      remainingLabel: 'الوقت المتبقي:',
      deepLinksTitle: 'إضافة مباشرة إلى تطبيقك المفضّل:',
      showConfigs: 'عرض روابط الكونفيج الفردية',
      hideConfigs: 'إخفاء روابط الكونفيج الفردية',
      configCopy: 'نسخ الكونفيج',
      generateNew: 'إنشاء اشتراك جديد',
    },
    status: {
      badge: 'الشبكة الموزعة',
      title: 'حالة السيرفرات والشبكة',
      subtitle: 'مراقبة حية لجهوزية السيرفرات والضغط دون إظهار أي بيانات حساسة.',
      nodesOnline: 'السيرفرات العاملة',
      connectedUsers: 'المتصلون النشطون',
      serverLoad: 'حمل السيرفر',
      capacity: 'حالة السعة',
      capacityStates: {
        available: 'أماكن متاحة',
        high_demand: 'إقبال مرتفع',
        full: 'ممتلئ مؤقتاً',
      },
      stateOnline: 'متصل ومستقر',
      stateDegraded: 'أداء مقيد',
      stateOffline: 'صيانة طارئة',
      lastUpdated: 'تحديث تلقائي كل 30 ثانية',
    },
    guides: {
      badge: 'دليل الاستخدام',
      title: 'شروحات الإعداد والتوصيل',
      subtitle: 'خطوات سريعة ومبسطة لتشغيل اشتراكك على جميع الأنظمة والتطبيقات.',
      platforms: {
        v2rayng: {
          name: 'v2rayNG',
          os: 'Android',
          steps: [
            'حمّل تطبيق v2rayNG من متجر Google Play أو GitHub.',
            'انسخ رابط الاشتراك من الأعلى أو اضغط على زر "إضافة لـ v2rayNG".',
            'في التطبيق، افتح القائمة الجانبية واختر "إعدادات الاشتراك" ثم أضف الرابط.',
            'ارجع للشاشة الرئيسية، اضغط على النقاط الثلاث بالأعلى واختر "تحديث الاشتراكات"، ثم اتصل.',
          ],
        },
        hiddify: {
          name: 'Hiddify',
          os: 'Android / iOS / Windows / Mac',
          steps: [
            'حمّل تطبيق Hiddify المناسب لجهازك (متاح لجميع الأنظمة).',
            'اضغط على زر "إضافة لـ Hiddify" بالنتيجة أعلاه أو انسخ الرابط.',
            'داخل Hiddify، اضغط على زر (+) في الأعلى ثم اختر "إضافة من الحافظة".',
            'اضغط على الزر الدائري الكبير في المنتصف لبدء الاتصال فوراً وبأقصى سرعة.',
          ],
        },
        streisand: {
          name: 'Streisand',
          os: 'iOS / iPhone / iPad',
          steps: [
            'حمّل تطبيق Streisand مجاناً من متجر App Store.',
            'اضغط على زر "إضافة لـ Streisand" بالنتيجة ليفتح التطبيق تلقائياً.',
            'أو انسخ رابط الاشتراك، وافتح Streisand واضغط (+) ثم "Import from Clipboard".',
            'اختر السيرفر واضغط على مفتاح الاتصال لتفعيل الـ VPN.',
          ],
        },
        v2box: {
          name: 'V2Box',
          os: 'iOS / Android',
          steps: [
            'ثبّت تطبيق V2Box من App Store لأجهزة أبل أو Play Store لأجهزة أندرويد.',
            'اضغط على زر "إضافة لـ V2Box" أعلى الشاشة لتثبيت الاشتراك بضغطة زر.',
            'أو انتقل لتبويب Configs واضغط (+) واختر "Add Subscription" والصق الرابط.',
            'اسحب لأسفل لتحديث السيرفرات، ثم اضغط على زر الاتصال في الصفحة الرئيسية.',
          ],
        },
        v2rayn: {
          name: 'v2rayN',
          os: 'Windows PC',
          steps: [
            'حمّل برنامج v2rayN مع Xray-core لنظام ويندوز.',
            'انسخ رابط الاشتراك من الموقع بالضغط على زر "نسخ الرابط".',
            'في البرنامج، اختر Subscription Group من القائمة العلوية ثم Subscription setting وأضف الرابط.',
            'اضغط على Update Subscriptions لتحميل السيرفرات، واضبط System Proxy على Set System Proxy.',
          ],
        },
      },
    },
    faq: {
      badge: 'الاستفسارات',
      title: 'الأسئلة الشائعة',
      subtitle: 'إجابات على أكثر الأسئلة شيوعاً حول الاشتراكات وطريقة استخدامها.',
      supportText: 'تحتاج لمساعدة أو سيرفر مخصص؟ تواصل معنا عبر تليجرام',
      supportBtn: 'قناة الدعم الفني',
      items: [
        {
          q: 'هل موقع wegov2ray مجاني بالكامل؟',
          a: 'نعم، الخدمة مجانية بنسبة 100% ولا تتطلب أي بطاقة بنكية أو إنشاء حساب شخصي أو دفع أي رسوم.',
        },
        {
          q: 'كيف أجدد الاشتراك بعد انتهاء مدته؟',
          a: 'عند انتهاء مدة الحساب (24 ساعة، 4 أيام، أو أسبوع)، ما عليك سوى العودة إلى الموقع والضغط على "إنشاء اشتراك جديد" للحصول على اشتراك جديد فعال وفوري.',
        },
        {
          q: 'ما هو البروتوكول الأفضل لي؟',
          a: 'إذا كنت تعاني من حجب قوي في بلدك، فإن VLESS Reality هو الأقوى والأسرع بلا منازع لأنه يتنكر كحركة تصفح طبيعية. أما إذا كنت ترغب بتشغيل الخدمة عبر Cloudflare CDN فاختر VLESS WebSocket.',
        },
        {
          q: 'ماذا أفعل لو انقطع الاتصال أو أظهر السيرفر خطأ؟',
          a: 'تأكد من تحديث الاشتراك داخل التطبيق (Update Subscription). تأكد أيضاً من ضبط الوقت والتاريخ على جهازك بدقة متناهية (توقيت تلقائي)، لأن أي فارق في الثواني قد يمنع اتصال بروتوكولات V2Ray.',
        },
        {
          q: 'كم جهاز يمكنه استخدام نفس الرابط في نفس الوقت؟',
          a: 'يسمح الاشتراك باتصال حتى 5 أجهزة في الوقت نفسه، مع سعة بيانات عملاقة تصل إلى 1 تيرابايت لكل حساب.',
        },
      ],
    },
    footer: {
      copyright: 'جميع الحقوق محفوظة © wegov2ray',
      tagline: 'خدمة اشتراكات V2Ray حرة ومجانية للجميع.',
      terms: 'شروط الاستخدام',
      privacy: 'سياسة الخصوصية',
    },
    legal: {
      termsTitle: 'شروط الاستخدام والخدمة',
      privacyTitle: 'سياسة الخصوصية وحماية البيانات',
      close: 'إغلاق',
      termsContent: [
        {
          heading: '1. قبول الشروط',
          text: 'باستخدامك لموقع wegov2ray أو الاستفادة من الاشتراكات وحسابات V2Ray المجانية التي نولدها، فإنك توافق التام على الالتزام بهذه الشروط وبسياسة الخصوصية الخاصة بنا.',
        },
        {
          heading: '2. سياسة الاستخدام المقبول (AUP)',
          text: 'خدمتنا مخصصة حصرياً للاستخدام الشخصي المشروع، وتأمين التصفح وتخطي الرقابة الجائرة. يُحظر تماماً وبشكل قاطع استخدام الخدمة في: الهجمات السيبرانية (DDoS)، التطفل والاختراق، إرسال البريد المزعج (SPAM)، توزيع الفيروسات والبرمجيات الخبيثة، أو أي نشاط مخالف للقوانين والأنظمة الدولية. يتم حظر ومسح أي حساب ينتهك هذه المعايير فوراً.',
        },
        {
          heading: '3. طبيعة الخدمة والضمانات',
          text: 'تُقدم هذه الخدمة "كما هي" (AS IS) وبشكل مجاني بالكامل وبدون أي ضمانات صريحة أو ضمنية لضمان الاستمرارية طوال الوقت أو ملائمة غرض محدد. نحتفظ بحق تعديل الخدمة أو إيقافها أو تنظيف الحسابات المنتهية في أي وقت لإتاحة الفرصة لمستخدمين آخرين.',
        },
      ],
      privacyContent: [
        {
          heading: '1. سياسة صادقة وشفافة تماماً',
          text: 'نحن لا نقدم وعوداً زائفة بـ "عدم حفظ أي سجلات نهائياً (No-Logs)"، لأن الحماية التقنية ومكافحة الهجمات وإدارة حصص السيرفر تتطلب حداً أدنى من البيانات التقنية. إليك الحقيقة الكاملة لما نجمعه ونتعامل معه.',
        },
        {
          heading: '2. ما نجمعه وكيف نحميه (Hashed IP)',
          text: 'لحماية الخدمة من الاستنزاف وهجمات الحرمان من الخدمة ولتطبيق حدود الاستخدام اليومي العادل، نقوم بتشفير عنوان IP الخاص بك عبر دالة تشفير أحادية الاتجاه (SHA-256 مع Salt سرّي). لا نقوم نهائياً بتخزين عنوان IP الصريح الخاص بك، بل نكتفي بالـ Hash فقط في ذاكرة مؤقتة (KV) تنتهي صلاحيتها وتُمسح تلقائياً خلال 24 ساعة كحد أقصى.',
        },
        {
          heading: '3. حركة التصفح والبيانات',
          text: 'نحن لا نسجل، ولا نراقب، ولا نبيع، ولا نحلل محتوى تصفحك، ولا المواقع التي تزورها، ولا البيانات التي ترسلها عبر قنوات الـ VPN. التشفير قوي من طرف لطرف وفق معايير بروتوكولات V2Ray/Xray الحديثة.',
        },
        {
          heading: '4. الذاكرة المحلية (LocalStorage) والكوكيز',
          text: 'الموقع لا يستخدم كوكيز تتبع إعلانية متطفلة. نستخدم تقنية الـ LocalStorage في متصفحك فقط لحفظ آخر اشتراك قمت بإنشائه حتى لا يضيع عليك إذا أغلقت الصفحة قبل انتهاء صلاحيته، وتبقى هذه البيانات على جهازك أنت وحدك ويمكنك مسحها متى شئت.',
        },
        {
          heading: '5. الإعلانات التابعة لجهات خارجية',
          text: 'في حال تفعيل مساحات إعلانية مستقبلية لدعم تكاليف السيرفرات، قد تستخدم شبكات الإعلانات مثل Google AdSense كوكيز لعرض إعلانات غير مخصصة وفقاً لسياسات الخصوصية الخاصة بها.',
        },
      ],
    },
  },
  en: {
    brand: 'wegov2ray',
    nav: {
      generator: 'Generator',
      status: 'Server Status',
      guides: 'Setup Guides',
      faq: 'FAQ',
      support: 'Support',
      language: 'العربية',
    },
    hero: {
      tag: '100% Free Subscriptions • No Registration',
      title: 'Free & Unrestricted Internet Access',
      subtitle: 'Instantly generate free V2Ray & Xray subscriptions in one click. Bypass censorship and protect your privacy with 1TB quota and high-speed nodes.',
      cta: 'Get Started Free',
      learnMore: 'Setup Guides',
    },
    generator: {
      badge: 'Automated Provisioning',
      title: 'Generate Free Account',
      subtitle: 'Select your preferred protocol and duration, verify the captcha, and click generate for an instant subscription URL & QR Code.',
      protocolLabel: '1. Select Protocol',
      protocols: {
        'vless-reality': {
          name: 'VLESS Reality',
          desc: 'Best for aggressive censorship & top speed without requiring SSL certificates',
        },
        'vless-ws': {
          name: 'VLESS WebSocket',
          desc: 'Ideal for CDN tunneling and bypassing port restrictions on restricted networks',
        },
        'vmess-ws-tls': {
          name: 'VMess WS TLS',
          desc: 'Maximum compatibility across legacy and modern VPN client applications',
        },
        'vmess-tcp': {
          name: 'VMess TCP',
          desc: 'Classic direct TCP connection with minimal CPU overhead and battery draw',
        },
      },
      durationLabel: '2. Select Duration',
      durations: {
        '86400': '24 Hours',
        '345600': '4 Days',
        '604800': '1 Full Week',
      },
      turnstileLabel: 'Security Check',
      generateBtn: 'Generate Account Now',
      generatingBtn: 'Provisioning Subscription...',
      serviceFullMsg: 'Service is currently at full capacity. Please try again shortly once expired slots clear.',
      limitMsg: 'Daily account creation limit reached for your connection.',
      genericError: 'Failed to generate account. Please wait a few seconds and try again.',
    },
    result: {
      titleSuccess: 'Subscription Created Successfully!',
      titleRestored: 'Active Subscription Restored',
      restoredBadge: 'Saved from your local session',
      subUrlLabel: 'Unified Subscription URL',
      copyBtn: 'Copy Link',
      copiedBtn: 'Copied to Clipboard!',
      qrTitle: 'Scan QR Code from your app',
      quotaLabel: 'Data Quota:',
      quotaVal: '1 Terabyte (1,024 GB)',
      remainingLabel: 'Time Remaining:',
      deepLinksTitle: 'Direct One-Click App Import:',
      showConfigs: 'View Individual Config Links',
      hideConfigs: 'Hide Individual Config Links',
      configCopy: 'Copy Config',
      generateNew: 'Generate Another Account',
    },
    status: {
      badge: 'Distributed Edge',
      title: 'Server & Network Status',
      subtitle: 'Real-time telemetry and network availability without exposing sensitive internal node details.',
      nodesOnline: 'Online Nodes',
      connectedUsers: 'Active Users',
      serverLoad: 'Average Load',
      capacity: 'Capacity State',
      capacityStates: {
        available: 'Slots Available',
        high_demand: 'High Demand',
        full: 'Full Capacity',
      },
      stateOnline: 'Online & Optimal',
      stateDegraded: 'Degraded Performance',
      stateOffline: 'Maintenance',
      lastUpdated: 'Auto-refreshed every 30 seconds',
    },
    guides: {
      badge: 'Quick Setup',
      title: 'Setup & Connection Guides',
      subtitle: 'Clear, concise step-by-step instructions to connect across all major operating systems.',
      platforms: {
        v2rayng: {
          name: 'v2rayNG',
          os: 'Android',
          steps: [
            'Install v2rayNG from Google Play Store or GitHub releases.',
            'Copy your subscription link above or click "Add to v2rayNG".',
            'In the app, open the side menu, tap "Subscription Group setting", and add the URL.',
            'Return to the main screen, tap the 3 dots in the top corner, choose "Update subscription", and connect.',
          ],
        },
        hiddify: {
          name: 'Hiddify',
          os: 'Android / iOS / Windows / Mac',
          steps: [
            'Download Hiddify for your platform (multi-platform client).',
            'Click the "Add to Hiddify" button above or copy your subscription link.',
            'In Hiddify, tap the (+) button at top and select "Add from Clipboard".',
            'Tap the large circular connect button in the center to establish connection.',
          ],
        },
        streisand: {
          name: 'Streisand',
          os: 'iOS / iPhone / iPad',
          steps: [
            'Download Streisand free from the Apple App Store.',
            'Click "Add to Streisand" in the result card to launch the app automatically.',
            'Or copy the subscription URL, open Streisand, tap (+) and select "Import from Clipboard".',
            'Select a server node and toggle the connect switch.',
          ],
        },
        v2box: {
          name: 'V2Box',
          os: 'iOS / Android',
          steps: [
            'Install V2Box from the App Store (iOS) or Play Store (Android).',
            'Click the "Add to V2Box" button above for 1-click import.',
            'Or go to the Configs tab, tap (+), choose "Add Subscription", and paste the link.',
            'Swipe down to fetch node configs, then return to the Home tab and toggle Connect.',
          ],
        },
        v2rayn: {
          name: 'v2rayN',
          os: 'Windows PC',
          steps: [
            'Download v2rayN with Xray-core for Windows.',
            'Copy the subscription link from this website.',
            'In v2rayN, navigate to Subscription Group -> Subscription setting, and paste the URL.',
            'Click "Update Subscriptions" to load servers, and set System Proxy to "Set System Proxy".',
          ],
        },
      },
    },
    faq: {
      badge: 'Questions & Answers',
      title: 'Frequently Asked Questions',
      subtitle: 'Answers to the most common questions regarding our free subscriptions and usage.',
      supportText: 'Need extra help or node assistance? Reach out on Telegram',
      supportBtn: 'Telegram Support Channel',
      items: [
        {
          q: 'Is wegov2ray truly 100% free?',
          a: 'Yes, completely free. There are no credit cards, no account registrations, and no hidden fees whatsoever.',
        },
        {
          q: 'How do I renew my subscription once it expires?',
          a: 'When your account duration (24h, 4d, or 7d) ends, simply revisit wegov2ray, select your protocol, and generate a fresh subscription in seconds.',
        },
        {
          q: 'Which protocol should I choose?',
          a: 'If you face strict regional DPI censorship, VLESS Reality is the fastest and most stealthy choice as it mimics legitimate TLS web traffic. For CDN routing, pick VLESS WebSocket.',
        },
        {
          q: 'What should I do if the connection drops?',
          a: 'Try updating your subscription in your app ("Update Subscription"). Also verify that your device clock is set to automatic network time, as timestamp skew breaks modern V2Ray handshakes.',
        },
        {
          q: 'How many devices can connect concurrently?',
          a: 'Each generated subscription supports up to 5 concurrent connected IP addresses, with a massive 1TB data quota.',
        },
      ],
    },
    footer: {
      copyright: 'All rights reserved © wegov2ray',
      tagline: 'Free, fast, and unrestricted V2Ray subscriptions for everyone.',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
    },
    legal: {
      termsTitle: 'Terms of Service',
      privacyTitle: 'Privacy & Data Protection Policy',
      close: 'Close',
      termsContent: [
        {
          heading: '1. Acceptance of Terms',
          text: 'By accessing wegov2ray and utilizing our free V2Ray subscriptions, you agree to comply with and be bound by these Terms of Service and our Privacy Policy.',
        },
        {
          heading: '2. Acceptable Use Policy (AUP)',
          text: 'Our service is strictly intended for lawful, personal communication, privacy enhancement, and bypassing unfair censorship. You may NOT use our infrastructure for: cyberattacks, DDoS, port scanning, spamming, malware/botnet command, or any illicit activities. Violations result in immediate subscription termination and blacklisting.',
        },
        {
          heading: '3. Disclaimer & Service Provision',
          text: 'The service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of uninterrupted uptime or fitness for a particular purpose. We reserve the right to prune expired accounts and manage node capacity as necessary.',
        },
      ],
      privacyContent: [
        {
          heading: '1. Transparent & Honest Policy',
          text: 'We do not make dishonest "zero-logs" marketing claims. Maintaining infrastructure stability, mitigating malicious traffic, and enforcing fair daily limits require minimal technical markers. Here is exactly what we do and do not store.',
        },
        {
          heading: '2. Hashed IP Storage Only (SHA-256)',
          text: 'To prevent abuse and enforce the daily account limit, your IP address is cryptographically hashed with SHA-256 and a secret salt. We NEVER persist your raw IP. Only the one-way hash is retained in volatile Cloudflare KV storage with a strict 24-hour expiration TTL, after which it is automatically deleted.',
        },
        {
          heading: '3. Browsing & Traffic Privacy',
          text: 'We do NOT inspect, record, analyze, or monetize your web browsing traffic, DNS queries, or visited domains. Traffic is encrypted end-to-end between your client and our edge nodes.',
        },
        {
          heading: '4. Local Storage & Cookies',
          text: 'We do not utilize invasive tracking cookies. Your browser\'s localStorage is used strictly to cache your active subscription on your own device so it remains available until expiration.',
        },
        {
          heading: '5. Advertising Disclosure',
          text: 'If advertising slots are activated in the future to subsidize server hardware costs, third-party advertising networks (such as Google AdSense) may serve non-intrusive ads governed by their respective privacy terms.',
        },
      ],
    },
  },
};
