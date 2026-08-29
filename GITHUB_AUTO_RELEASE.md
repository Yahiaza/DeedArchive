# النشر التلقائي عبر GitHub Actions

المشروع يحتوي على `.github/workflows/release.yml`.

عند رفع Tag يبدأ بحرف `v` مثل `v0.2.7`، يقوم GitHub تلقائيًا على Windows بـ:

1. تنزيل الكود.
2. تثبيت الحزم.
3. تشغيل `npm run dist:win`.
4. إنشاء GitHub Release.
5. رفع ملف `release/*.exe` إلى الـ Release.

لا يحتاج جهازك إلى GitHub CLI أو صلاحيات Administrator.

## رفع إصدار محدد

```powershell
npm run github:publish -- 0.2.7
```

هذا الأمر يقوم بعمل commit ثم push لـ main ثم إنشاء ورفع Tag `v0.2.7`. بعد ذلك يبدأ GitHub Actions تلقائيًا.
