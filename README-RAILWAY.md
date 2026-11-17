# راه‌اندازی Backend روی Railway

این راهنما برای API جدید Node.js/Express و PostgreSQL خالی است. فایل‌های Frontend و JSONهای پایه همچنان روی GitHub Pages می‌مانند. هیچ رکوردی از Cloudflare D1 خوانده، پشتیبان‌گیری یا منتقل نمی‌شود؛ Worker و D1 قدیمی را تا پایان آزمون‌های عملیاتی نگه دارید.

## استقرار

1. در Railway یک پروژه بسازید و یک PostgreSQL خالی اضافه کنید.
2. مخزن سایت را به‌عنوان سرویس Node.js وصل کنید. ریشهٔ مخزن باید `package.json` و `railway.json` را ببیند؛ build با Nixpacks انجام می‌شود و start command برابر `npm start` است.
3. در تنظیمات سرویس API، متغیرهای زیر را به‌صورت Railway Variables/Secrets وارد کنید:

| متغیر | لازم؟ | مقدار |
| --- | --- | --- |
| `DATABASE_URL` | بله | Reference به متغیر اتصال PostgreSQL در Railway (ترجیحاً `${{Postgres.DATABASE_URL}}`) |
| `ADMIN_KEY` | بله | کلید طولانی و تصادفی؛ فقط در Railway Secret، نه در GitHub یا Frontend |
| `ALLOWED_ORIGINS` | بله برای مرورگر | مبدأ دقیق سایت، شامل scheme و host، بدون مسیر؛ برای چند مبدأ با ویرگول جدا کنید |
| `TG_BOT_TOKEN` | خیر | Secret توکن بات؛ در صورت استفاده |
| `TG_CHAT_ID` | خیر | شناسهٔ مدیر/گروه؛ در صورت استفاده |
| `PAY_INFO` | خیر | اطلاعات پرداخت موردنیاز بات سفارش‌گیر |
| `PUBLIC_API_URL` | خیر | URL عمومی سرویس API، مانند `https://<service>.up.railway.app`؛ اگر خالی باشد از `RAILWAY_PUBLIC_DOMAIN` استفاده می‌شود |
| `TRUST_PROXY_HOPS` | خیر | پیش‌فرض `1`؛ فقط در صورت تغییر توپولوژی پروکسی، مقدار واقعی را تنظیم کنید |

`PORT` را Railway فراهم می‌کند. هنگام استفاده از PostgreSQL Railway، مقدار `DATABASE_URL` باید از سرویس PostgreSQL همان پروژه ارجاع داده شود؛ هیچ credential را در فایل `.env.example` جایگزین یا commit نکنید.

4. برای سرویس API در Railway دامنهٔ عمومی ایجاد کنید. `/health` باید وضعیت 200 و `{"ok":true}` برگرداند. اجرای سرویس در شروع، schema را به‌صورت idempotent ایجاد می‌کند؛ دیتابیس مقصد خالی می‌ماند.
5. مبدأ واقعی Frontend را دقیقاً در `ALLOWED_ORIGINS` بگذارید: برای GitHub Pages معمولاً `https://<account>.github.io` است؛ اگر دامنهٔ سفارشی سایت به GitHub Pages وصل است، همان دامنه (مثلاً `https://naqshejahannut.ir`) را نیز جداگانه وارد کنید. `*.github.io` و wildcardهای دیگر پشتیبانی نمی‌شوند.
6. پس از داشتن URL عمومی Railway، در `public/assets/js/loader.js` مقدار `window.NJK_API_BASE` را از رشتهٔ خالی به origin سرویس API تغییر دهید، سپس Frontend را به GitHub Pages منتشر کنید. این مقدار عمومی است، اما `ADMIN_KEY`, `DATABASE_URL` و توکن‌های تلگرام هرگز نباید در آن قرار گیرند. درخواست‌های `products.json` و `reviews.json` از API می‌آیند تا overrideها و نظرهای تأییدشده با فایل‌های پایه ترکیب شوند؛ `categories.json` و `product-info.json` همچنان از GitHub Pages می‌آیند.

## آزمون و بازگشت

پس از Deploy، از مبدأ واقعی GitHub Pages بررسی کنید:

- `GET /health` پاسخ 200 می‌دهد و یک درخواست `OPTIONS` با مبدأ مجاز پاسخ 204، ولی مبدأ نامجاز مسدود می‌شود.
- `GET /products.json` و `GET /reviews.json` دادهٔ عمومی درست می‌دهند.
- سفارش آزمایشی، ثبت نظر، پیگیری با کد و شماره، و ورود/CRUD پنل مدیریت را امتحان کنید.
- اگر از تلگرام استفاده می‌کنید، وضعیت بات و webhook را از پنل بررسی کنید؛ پس از تغییر URL API یا `ADMIN_KEY`، ثبت webhook را دوباره انجام دهید.
- Worker و D1 قبلی را تا موفقیت همهٔ آزمون‌ها و تأیید نهایی نگه دارید. برای بازگشت، مقدار `NJK_API_BASE` را به URL قدیمی Worker برگردانید و Frontend را دوباره منتشر کنید؛ هیچ داده‌ای بین دو دیتابیس همگام نمی‌شود.

## آزمون محلی

Node.js 20 یا جدیدتر و یک PostgreSQL آزمایشی لازم است. پس از نصب وابستگی‌ها، `npm test` تست‌های adapter، health و CORS را اجرا می‌کند. تست‌ها به دیتابیس واقعی متصل نمی‌شوند؛ schema و مسیرهای CRUD در PostgreSQL واقعی باید جداگانه با دیتابیس آزمایشی بررسی شوند. برای اجرای سرور محلی، متغیرهای نمونه را در `.env` محلی (که Git نادیده می‌گیرد) تنظیم کنید و از یک PostgreSQL آزمایشی استفاده کنید.

## جزئیات پیاده‌سازی

- `server.js` سرویس Express را اجرا و `worker.js` را با adapter PostgreSQL فراخوانی می‌کند تا قرارداد endpointها و منطق سفارش/مدیریت/بات حفظ شوند.
- `backend/schema.postgres.sql` فقط جدول‌ها و شاخص‌ها را می‌سازد؛ هیچ seed یا import از D1 ندارد.
- cache در Railway درون هر process است و بین replicaها مشترک نیست؛ پس از تغییر محصول یا نظر ممکن است replicaهای دیگر تا پایان TTL پاسخ قدیمی بدهند.
- هدرهای forwarded دلخواه به handler منتقل نمی‌شوند؛ IP rate limit از `req.ip` طبق `TRUST_PROXY_HOPS` محاسبه می‌شود.
