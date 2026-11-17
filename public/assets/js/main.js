/* =============================================================
   خشکبار نقش جهان — main.js
   Vanilla JS، بدون وابستگی. بخش‌ها:
   داده محصولات → رندر تصویر SVG → سبد/علاقه‌مندی (localStorage) →
   رندر گرید (صفحه اصلی: پیش‌نمایش ثابت | صفحه فروشگاه: فیلتر واقعی
   بر اساس ?category= در URL) → جستجوی زنده → مشاهده سریع → پنل‌ها → هدر
   ============================================================= */
function boot(OV, CD) {
  "use strict";

  /* ---------- ابزارهای عمومی ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const fa = (n) => Number(n).toLocaleString("fa-IR"); // اعداد فارسی با جداکننده هزار
  const PAGE = document.body.dataset.page || "home"; // "home" | "shop" | "account" | "checkout"

  /* تصویرسازی دسته‌بندی‌ها (SVG)؛ یک بار برای همه‌ی صفحه‌ها تزریق می‌شود و با <use href="#c-نام"> استفاده می‌شود */
  document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="gAl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E0B073"/><stop offset="1" stop-color="#B27639"/></linearGradient><linearGradient id="gDt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9A532C"/><stop offset="1" stop-color="#5A2813"/></linearGradient><radialGradient id="gHz" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#B07A47"/><stop offset="1" stop-color="#5A3418"/></radialGradient><radialGradient id="gGp" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#8A62AE"/><stop offset="1" stop-color="#3C2257"/></radialGradient><radialGradient id="gCh" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#F0D597"/><stop offset="1" stop-color="#C09443"/></radialGradient><radialGradient id="gWn" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#C58E58"/><stop offset="1" stop-color="#7A4C29"/></radialGradient><radialGradient id="gAp" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FFC163"/><stop offset="1" stop-color="#E0812A"/></radialGradient><radialGradient id="gPe" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#D2EC98"/><stop offset="1" stop-color="#8DBB4C"/></radialGradient><g id="aAl"><path d="M0-13C7.5-8 9 5 0 13C-9 5-7.5-8 0-13Z" fill="url(#gAl)"/><path d="M-3-7C-5-1-4 5-1 9" stroke="#EBC58C" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M0-12C1-3 1 5 0 12" stroke="#9A6330" stroke-width=".8" fill="none" opacity=".55"/></g><g id="aPs"><ellipse rx="10" ry="14" fill="#E6D2A6" stroke="#C4AA77" stroke-width="1.2"/><path d="M0-13C6-7 6 7 0 13C-6 7-6-7 0-13Z" fill="#8FB341"/><path d="M-1.5-8C-3-2-3 4-1 9" stroke="#BBD66F" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M0-13C6-7 6 7 0 13" stroke="#6E8F2A" stroke-width="1" fill="none"/></g><g id="aPc"><ellipse rx="9" ry="13" fill="#E6D2A6" stroke="#C4AA77" stroke-width="1.2"/><path d="M0-12C3-5 3 6 0 12" stroke="#B89A63" stroke-width="1.2" fill="none"/><path d="M-4-6C-6-1-5 5-3 8" stroke="#F6EBD0" stroke-width="1.6" fill="none" stroke-linecap="round"/></g><g id="aHz"><path d="M0-12C8-12 12-5 11 2C10 9 5 12 0 12C-5 12-10 9-11 2C-12-5-8-12 0-12Z" fill="url(#gHz)"/><ellipse cy="9" rx="6.5" ry="2.6" fill="#D9B27A"/><path d="M-1.6-12L0-14.8L1.6-12Z" fill="#4E2D14"/><ellipse cx="-4" cy="-5" rx="3" ry="2" fill="#fff" opacity=".35" transform="rotate(-30 -4 -5)"/></g><g id="aWn"><circle r="13" fill="url(#gWn)"/><path d="M0-13C-3-5-3 5 0 13" stroke="#6B411F" stroke-width="1.4" fill="none"/><path d="M-9-7C-6-4-6 4-9 7M9-7C6-4 6 4 9 7M-6-10C-4-8-4-6-6-4" stroke="#8E5D35" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="-5" cy="-6" rx="3" ry="2" fill="#fff" opacity=".28" transform="rotate(-35 -5 -6)"/></g><g id="aWk"><path d="M0 9C-14 7-15-8-6-9.5C-3-10 0-8.5 0-6C0-8.5 3-10 6-9.5C15-8 14 7 0 9Z" fill="#EBD3A2" stroke="#C79E64" stroke-width=".8"/><path d="M0-6C-1-2-1 4 0 9M-9-5C-6-3-6 1-9 3M-5-4C-4-1-4 2-5 4M9-5C6-3 6 1 9 3M5-4C4-1 4 2 5 4" stroke="#B88A52" stroke-width="1.2" fill="none" stroke-linecap="round"/></g><g id="aCh"><path d="M-2-11L1-8.5C8-8 11-2 10 3C9 9 3 11-1 11C-7 11-11 6-10 0C-9-5-6-7-3-8Z" fill="url(#gCh)"/><path d="M-2-10C-2-4 0 0-4 5" stroke="#B38538" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/><ellipse cx="3" cy="-3" rx="2.5" ry="1.6" fill="#fff" opacity=".4" transform="rotate(-30 3 -3)"/></g><g id="aGr"><circle r="6" fill="url(#gGp)"/><path d="M-3-2C-1 0 1 0 3-2M-3 2C-1 4 1 4 3 2" stroke="#2E1844" stroke-width=".8" fill="none" opacity=".6"/><ellipse cx="-2" cy="-2.5" rx="1.8" ry="1.1" fill="#fff" opacity=".4" transform="rotate(-30 -2 -2.5)"/></g><g id="aDt"><path d="M0-13C6-13 9-6 8 1C7 9 4 13 0 13C-4 13-7 9-8 1C-9-6-6-13 0-13Z" fill="url(#gDt)"/><path d="M-4-8C-5-2-4 5-3 9" stroke="#C47A45" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/><path d="M-1-4L4-5M0 3L5 2M-1 8L3 7" stroke="#3E1A0A" stroke-width=".8" opacity=".5" fill="none"/><circle cy="-12" r="2" fill="#C9A06A"/></g><g id="aDh"><path d="M0-13C6-13 9-6 8 1C7 9 4 13 0 13C-4 13-7 9-8 1C-9-6-6-13 0-13Z" fill="#7A3A1D"/><path d="M0-10C4-10 6-5 5.5 1C5 7 3 10 0 10C-3 10-5 7-5.5 1C-6-5-4-10 0-10Z" fill="#CB925B"/><ellipse rx="2.3" ry="6" fill="#EAD7AC" stroke="#B88A55" stroke-width=".8"/></g><g id="aAp"><path d="M0-11C8-11 13-5 12 2C11 9 5 11 0 11C-5 11-11 9-12 2C-13-5-8-11 0-11Z" fill="url(#gAp)"/><path d="M-1-9C-4-3-4 4 0 10" stroke="#C86A1C" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="6" cy="-4" rx="3" ry="2" fill="#fff" opacity=".32" transform="rotate(-30 6 -4)"/><path d="M-7-3L-6-2M-8 3L-7 4M6 5L7 6" stroke="#C86A1C" stroke-width="1" opacity=".6"/></g><g id="aRg"><path fill-rule="evenodd" d="M0-10A10 10 0 1 1 0 10A10 10 0 1 1 0-10ZM0-3.5A3.5 3.5 0 1 0 0 3.5A3.5 3.5 0 1 0 0-3.5Z" fill="#F0DCA8" stroke="#C9A24E" stroke-width="1"/><path d="M-6-6C-3-8 2-8 5-6" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/><circle cx="5.5" cy="4" r=".9" fill="#7A4A1E"/><circle cx="-5" cy="5.5" r=".9" fill="#7A4A1E"/></g><g id="aSd"><path d="M0-12C7-5 7 6 0 12C-7 6-7-5 0-12Z" fill="#3A3329"/><path d="M-3.2-3C-3.6 1-2.4 6 0 9M3.2-3C3.6 1 2.4 6 0 9M0-8V8" stroke="#E6DFCC" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="-3.5" cy="-4" rx="1.1" ry="2.4" fill="#fff" opacity=".25" transform="rotate(10 -3.5 -4)"/></g><g id="aPk"><path d="M0-12C8-8 8 4 0 12C-8 4-8-8 0-12Z" fill="#CFE0A0" stroke="#92A85A" stroke-width="1.2"/><path d="M0-8.5C5-5 5 3 0 8.5C-5 3-5-5 0-8.5Z" fill="#E9F2C8"/><path d="M0-6V6" stroke="#AFC27A" stroke-width="1"/></g><g id="aPd"><path d="M-15 0C-10-7 10-7 15 0C10 7-10 7-15 0Z" fill="#5E9B34"/><path d="M-13 0C-9-4.5 9-4.5 13 0C9 4.5-9 4.5-13 0Z" fill="#8DC152"/><g fill="url(#gPe)" stroke="#6E9C3A" stroke-width=".6"><circle cx="-8" r="3.3"/><circle cx="-2.7" r="3.5"/><circle cx="2.8" r="3.5"/><circle cx="8" r="3.3"/></g><path d="M14-1C17-3 18-6 17-8" stroke="#4E8228" stroke-width="1.6" fill="none" stroke-linecap="round"/></g><path id="kb" d="M-10 0C-10-6-1-9 6-7C11-5 11 2 7 5C3 7 1 4-2 4C-6 4-10 5-10 0Z"/><g id="aKr"><use href="#kb" fill="#A6302B"/><path d="M-6-3C-3-5 2-5 5-4" stroke="#E5776D" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/></g><g id="aKw"><use href="#kb" fill="#EFE3C8" stroke="#CDB98C" stroke-width=".8"/><path d="M-6-3C-3-5 2-5 5-4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".9"/></g></defs><symbol id="c-pistachio" viewBox="0 0 64 64"><use href="#aPs" transform="translate(23 28) rotate(-28) scale(1.1)"/><use href="#aPc" transform="translate(43 38) rotate(32) scale(1.08)"/></symbol><symbol id="c-almond" viewBox="0 0 64 64"><use href="#aAl" transform="translate(22 30) rotate(-25)"/><use href="#aAl" transform="translate(42 28) rotate(22)"/><g transform="translate(32 43) rotate(4) scale(.95)"><path d="M0-13C7.5-8 9 5 0 13C-9 5-7.5-8 0-13Z" fill="#F4E6C9" stroke="#D8BE8E" stroke-width="1"/><path d="M-3-7C-5-1-4 5-1 9" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/></g></symbol><symbol id="c-walnut" viewBox="0 0 64 64"><use href="#aWn" transform="translate(23 40) scale(1.05)"/><path d="M28 36C28 30 36 28 42 28C50 28 57 31 57 37C57 45 49 48 42 48C34 48 28 44 28 36Z" fill="url(#gWn)"/><path d="M30 38C34 42 50 42 55 37" stroke="#5E3718" stroke-width="1.2" fill="none" opacity=".6"/><use href="#aWk" transform="translate(42 30)"/></symbol><symbol id="c-hazelnut" viewBox="0 0 64 64"><path d="M40 8C52 8 58 18 54 28C44 30 36 22 40 8Z" fill="#6E9A3C"/><path d="M42 11C46 17 50 22 53 26" stroke="#4E7A26" stroke-width="1.2" fill="none"/><use href="#aHz" transform="translate(25 37) scale(1.1)"/><use href="#aHz" transform="translate(43 42) scale(.85)"/></symbol><symbol id="c-raisin" viewBox="0 0 64 64"><path d="M32 8V18" stroke="#6B4A2B" stroke-width="2.2" stroke-linecap="round"/><path d="M33 12C40 6 48 8 50 12C44 16 37 15 33 12Z" fill="#7BAA45"/><use href="#aGr" transform="translate(21 25) scale(1.05)"/><use href="#aGr" transform="translate(32 24) scale(1.05)"/><use href="#aGr" transform="translate(43 25) scale(1.05)"/><use href="#aGr" transform="translate(26 35) scale(1.05)"/><use href="#aGr" transform="translate(38 35) scale(1.05)"/><use href="#aGr" transform="translate(32 45) scale(1.05)"/></symbol><symbol id="c-date" viewBox="0 0 64 64"><use href="#aDt" transform="translate(21 30) rotate(-22)"/><use href="#aDt" transform="translate(43 28) rotate(20)"/><use href="#aDh" transform="translate(32 47) rotate(82) scale(.8)"/></symbol><symbol id="c-fruit" viewBox="0 0 64 64"><use href="#aAp" transform="translate(23 25) rotate(-15)"/><use href="#aAp" transform="translate(42 30) rotate(15) scale(.95)"/><use href="#aRg" transform="translate(30 47) scale(.9)"/></symbol><symbol id="c-legumes" viewBox="0 0 64 64"><use href="#aPd" transform="translate(30 21) rotate(-20) scale(1.12)"/><use href="#aKr" transform="translate(44 45) rotate(15) scale(1.05)"/><use href="#aKw" transform="translate(21 46) rotate(-18) scale(1.05)"/><g fill="#E39B3C" stroke="#B9731F" stroke-width=".6"><ellipse cx="51" cy="26" rx="3" ry="2.4"/><ellipse cx="55" cy="32" rx="3" ry="2.4"/><ellipse cx="48" cy="32" rx="3" ry="2.4"/></g></symbol><symbol id="c-nokhodchi" viewBox="0 0 64 64"><use href="#aCh" transform="translate(21 40) rotate(-15) scale(1.1)"/><use href="#aCh" transform="translate(43 41) rotate(20) scale(1.1)"/><use href="#aCh" transform="translate(32 26) rotate(5) scale(1.15)"/><use href="#aCh" transform="translate(32 47) rotate(-10) scale(.95)"/></symbol><symbol id="c-seeds" viewBox="0 0 64 64"><use href="#aPk" transform="translate(41 24) rotate(38) scale(1.05)"/><use href="#aPk" transform="translate(46 42) rotate(-30) scale(.95)"/><use href="#aSd" transform="translate(21 27) rotate(-32) scale(1.1)"/><use href="#aSd" transform="translate(30 43) rotate(18) scale(1.1)"/><use href="#aSd" transform="translate(14 44) rotate(-70) scale(.85)"/></symbol><symbol id="c-honey" viewBox="0 0 64 64"><ellipse cx="32" cy="57" rx="17" ry="3.5" fill="#12291D" opacity=".25"/><rect x="19" y="22" width="26" height="33" rx="8" fill="#E39B3C" stroke="#B9731F" stroke-width="1.2"/><rect x="22" y="32" width="20" height="14" rx="3" fill="#F7EBC8" stroke="#B9731F" stroke-width=".8"/><path d="M32 34.5l1.8 3.6 4 .6-2.9 2.8.7 4L32 43.6l-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#D4AF37"/><rect x="21" y="14" width="22" height="9" rx="3" fill="#1C3B2B" stroke="#12291D"/><path d="M24 26c0 6 .6 10 1.4 14" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/></symbol><symbol id="c-mixed" viewBox="0 0 64 64"><ellipse cx="32" cy="38" rx="22" ry="5" fill="#12291D"/><use href="#aWn" transform="translate(30 27) scale(.62)"/><use href="#aAl" transform="translate(19 31) rotate(-35) scale(.6)"/><use href="#aPc" transform="translate(44 31) rotate(30) scale(.55)"/><use href="#aGr" transform="translate(24 38) scale(.8)"/><use href="#aHz" transform="translate(37 36) scale(.55)"/><use href="#aCh" transform="translate(48 38) scale(.6)"/><use href="#aGr" transform="translate(15 38) scale(.7)"/><path d="M10 38C10 41 20 43 32 43C44 43 54 41 54 38C54 52 44 58 32 58C20 58 10 52 10 38Z" fill="#2E5741"/><path d="M10 38C10 41 20 43 32 43C44 43 54 41 54 38" stroke="#D4AF37" stroke-width="1.8" fill="none"/><path d="M12 46C20 50 44 50 52 46" stroke="#D4AF37" stroke-width="1.6" fill="none"/><path d="M26 57.5H38L39.5 61H24.5Z" fill="#D4AF37"/><path d="M32 49.5L34 52L32 54.5L30 52Z" fill="#D4AF37"/></symbol></svg>`);

  function storage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* حالت خصوصی مرورگر */ }
  }

  /* =============================================================
     تقویم شمسی (بدون کتابخانه): تبدیل میلادی → جلالی
     الگوریتم استاندارد و کوتاه؛ فقط محاسبات عددی، هیچ وزنی اضافه نمی‌کند
     ============================================================= */
  function gregorianToJalali(gy, gm, gd) {
    const div = (a, b) => Math.trunc(a / b);
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * div(days, 12053);
    days %= 12053;
    jy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
    const jm = (days < 186) ? 1 + div(days, 31) : 7 + div(days - 186, 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }
  const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  const JALALI_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  /* اعداد بدون جداکننده‌ی هزارگان (برعکس fa()) — برای سال/روزِ تاریخ */
  const faDigits = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  function formatJalali(date, withWeekday) {
    const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const base = `${faDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${faDigits(jy)}`;
    return withWeekday ? `${JALALI_WEEKDAYS[(date.getDay() + 1) % 7]}، ${base}` : base;
  }
  /* تاریخ تحویل تخمینی: امروز + چند روز کاری (جمعه‌ها حساب نمی‌شود) */
  function estimateDeliveryDate(workDays) {
    const d = new Date();
    let added = 0;
    while (added < workDays) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 5) added++; // ۵ = جمعه در جاوااسکریپت
    }
    return d;
  }

  /* =============================================================
     حساب کاربری (شبیه‌سازی سمت کاربر — بدون بک‌اند واقعی)
     نکته‌ی مهم: چون این یک سایت استاتیک بدون سرور است، پیامک واقعی
     ارسال نمی‌شود؛ کد تایید به‌صورت آزمایشی همین‌جا نمایش داده می‌شود
     تا کل مسیر ورود/ثبت‌نام واقعاً و به‌طور کامل قابل تست باشد.
     ============================================================= */
  const AUTH = {
    getUser() { return storage("njk_user", null); },
    isLoggedIn() {
      const phone = storage("njk_session", null);
      const u = this.getUser();
      return !!(phone && u && u.phone === phone);
    },
    currentUser() { return this.isLoggedIn() ? this.getUser() : null; },
    sendOtp(phone) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const payload = { phone, code, expires: Date.now() + 2 * 60 * 1000 };
      try { sessionStorage.setItem("njk_otp", JSON.stringify(payload)); } catch (e) {}
      return code;
    },
    verifyOtp(phone, code) {
      let payload = null;
      try { payload = JSON.parse(sessionStorage.getItem("njk_otp") || "null"); } catch (e) {}
      if (!payload || payload.phone !== phone) return { ok: false, reason: "notfound" };
      if (Date.now() > payload.expires) return { ok: false, reason: "expired" };
      if (payload.code !== code) return { ok: false, reason: "mismatch" };
      return { ok: true };
    },
    registerUser({ phone, name, family, address, province, city, password }) {
      const user = { phone, name, family, address, province, city, password, createdAt: new Date().toISOString() };
      save("njk_user", user);
      save("njk_session", phone);
      try { sessionStorage.removeItem("njk_otp"); } catch (e) {}
      return user;
    },
    login(phone, password) {
      const u = this.getUser();
      if (!u || u.phone !== phone) return { ok: false, reason: "notfound" };
      if (u.password !== password) return { ok: false, reason: "password" };
      save("njk_session", phone);
      return { ok: true, user: u };
    },
    logout() { save("njk_session", null); }
  };

  /* ---------- داده محصولات (مرجع رسمی فروشگاه) ----------
     قیمت‌ها: تومان به ازای هر ۱ کیلوگرم. وزن‌های فروش برای همه‌ی محصولات:
     ۱ کیلوگرم (۱۰۰٪)، ۵۰۰ گرم (۵۰٪)، ۲۵۰ گرم (۲۵٪). price:null ⇒ «قیمت نامشخص». */
  const CATEGORIES = [
    ["pistachio", "پسته"],
    ["mixed", "آجیل مخلوط"],
    ["nokhodchi", "نخودچی"],
    ["almond", "بادام"],
    ["walnut", "گردو"],
    ["hazelnut", "فندق"],
    ["raisin", "کشمش و مویز"],
    ["date", "خرما"],
    ["fruit", "میوه خشک"],
    ["legumes", "حبوبات"],
    ["seeds", "تخمه"],
    ["honey", "عسل"]
  ];
  const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);
  const WEIGHTS = [
    { g: 1000, label: "۱ کیلوگرم" },
    { g: 750, label: "۷۵۰ گرم" },
    { g: 500, label: "۵۰۰ گرم" },
    { g: 250, label: "۲۵۰ گرم" }
  ];
  const DEFAULT_W = [250, 500, 1000]; // وزن‌های پیش‌فرض هر محصول (اگر در products.json نیامده باشد)
  const UNKNOWN_PRICE = "تماس بگیرید";

  // شکل و رنگ تصویر جایگزین (placeholder) هر دسته
  const ART = {
    pistachio: { kind: "pistachio", bg: ["#EEF2DC", "#DCE6B8"] },
    mixed: { kind: ["pistachio", "almond", "walnut", "raisin"], bg: ["#F1EEDD", "#DCE0BE"] },
    nokhodchi: { kind: "chickpea", bg: ["#F6EEDA", "#E3C88F"] },
    almond: { kind: "almond", bg: ["#F8ECDD", "#EBD3B4"] },
    walnut: { kind: "walnut", bg: ["#F4EAE0", "#DFC9B2"] },
    hazelnut: { kind: "walnut", bg: ["#F1E6DA", "#D2B594"] },
    raisin: { kind: "raisin", bg: ["#EFE7F0", "#D6C3DA"] },
    date: { kind: "date", bg: ["#F2E5DA", "#D9BDA6"] },
    fruit: { kind: "apricot", bg: ["#FBE9D3", "#F1C68A"] },
    legumes: { kind: "chickpea", bg: ["#F3ECD6", "#DCC98E"] },
    seeds: { kind: "almond", bg: ["#F5EFD9", "#DCCB93"] },
    honey: { kind: "date", bg: ["#FBF0D2", "#EBCB7A"] }
  };

  /* ---------- دسته‌های ساخته‌شده در پنل ادمین (categories.json) ----------
     دسته‌ی جدید: {id, name, icon?, img?}. برای دسته‌های آماده فقط img (عکس جایگزین آیکون) خوانده می‌شود.
     دسته‌ی جدید با کلون‌کردن آیتم «عسل» در منوها، فیلترها و کارت‌های صفحه اصلی ساخته می‌شود. */
  (function () {
    const IMG = {}, EXTRA = [];
    ((CD && CD.cats) || []).forEach(c => {
      if (!c || !/^[a-z][a-z0-9]{0,23}$/.test(c.id || "")) return;
      if (!CATEGORY_LABEL[c.id]) {
        const name = String(c.name || "").trim().slice(0, 30);
        if (!name) return;
        const icon = Object.prototype.hasOwnProperty.call(ART, c.icon) ? c.icon : "mixed";
        CATEGORY_LABEL[c.id] = name; ART[c.id] = ART[icon]; EXTRA.push({ id: c.id, name, icon });
      }
      if (/^[\w.-]+$/.test(c.img || "")) IMG[c.id] = c.img;
    });
    EXTRA.length && $$('a[data-category="honey"]').forEach(el => {
      const host = el.closest("li") || el; let ref = host;
      EXTRA.forEach(c => {
        const n = host.cloneNode(true), lnk = n.matches("a") ? n : n.querySelector("a");
        lnk.href = "shop.html?category=" + c.id; lnk.dataset.category = c.id; lnk.classList.remove("is-active");
        (n.querySelector(".category-card__name") || lnk.lastChild).textContent = c.name;
        const ct = n.querySelector("[data-count]"); if (ct) ct.dataset.count = c.id;
        const u = n.querySelector("use"); if (u) u.setAttribute("href", "#c-" + c.icon);
        ref.after(n); ref = n;
      });
    });
    Object.keys(IMG).forEach(id => $$(`a[data-category="${id}"] .category-card__disc svg, a[data-category="${id}"] .mnav-icon svg`).forEach(sv => {
      const im = document.createElement("img");
      im.src = "assets/img/categories/" + IMG[id]; im.alt = ""; im.width = im.height = 64; im.loading = "lazy"; im.decoding = "async";
      sv.replaceWith(im);
    }));
  })();

  /* ---------- محصولات: کاملاً از products.json (ویرایش با پنل ادمین) ----------
     هر ردیف: {id, name, cat, price(هر کیلوگرم)، old?, badge?, label?, w?(وزن‌های موجود)} */
  const seedOf = (id) => {
    const m = /^p(\d+)$/.exec(id); let n = m ? +m[1] : 1;
    if (!m) for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
    return 11 + (n - 1) * 7;
  };
  const PRODUCTS = (Array.isArray(OV) ? OV : []).filter(x => x && x.id && x.name && ART[x.cat]).map(x => {
    const a = ART[x.cat], w = Array.isArray(x.w) ? WEIGHTS.filter(k => x.w.includes(k.g)).map(k => k.g) : [];
    return {
      id: x.id, name: x.name, cat: x.cat, price: x.price == null ? null : +x.price,
      old: x.old || undefined, badge: x.badge || undefined, label: x.label || undefined,
      img: /^[\w.-]+$/.test(x.i || "") ? x.i : undefined,
      w: w.length ? w : DEFAULT_W, kind: a.kind, bg: a.bg, seed: seedOf(x.id)
    };
  });
  function oldPrice(p, g) { return p.old ? (p.old * g) / 1000 : null; }
  function saveAmount(p, g) { return p.old && p.price != null ? oldPrice(p, g) - unitPrice(p, g) : null; }
  function oldPriceHTML(p, g) {
    const sv = saveAmount(p, g);
    return sv > 0
      ? `<s class="price-old">${fa(oldPrice(p, g))}</s><span class="price-pct">${fa(Math.round((sv / oldPrice(p, g)) * 100))}٪</span>`
      : "";
  }

  // قیمت دقیق هر وزن: ۱kg = قیمت مرجع، ۵۰۰g = ۵۰٪، ۲۵۰g = ۲۵٪ (بدون گردکردن)
  function unitPrice(p, g) { return p.price == null ? null : (p.price * g) / 1000; }
  function weightLabel(g) { return (WEIGHTS.find(w => w.g === g) || WEIGHTS[0]).label; }
  const weightsOf = (p) => WEIGHTS.filter(w => p.w.includes(w.g)); // از بزرگ به کوچک
  const defG = (p) => weightsOf(p)[0].g;                            // وزن پیش‌فرض = بزرگ‌ترین وزن موجود
  function priceText(n) { return n == null ? UNKNOWN_PRICE : fa(n) + " تومان"; }

  const BADGE = {
    sale: { label: "تخفیف", cls: "badge--sale" },
    best: { label: "پرفروش", cls: "badge--best" },
    new:  { label: "ویژه",   cls: "badge--new"  },
    custom: { label: "", cls: "badge--new" }
  };

  const FREE_SHIP_THRESHOLD = 1000000;
  const SHIP_COST = 45000;
  const FEATURED_COUNT = 8; // تعداد کارت‌های پیش‌نمایش در صفحه اصلی

  /* ---------- تولید تصویر SVG کاسه‌ی خشکبار (بدون تصویر واقعی) ---------- */
  function bowlSVG(kind, bg, seed, viewW, viewH) {
    let s = seed || 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const w = viewW || 260, h = viewH || 230;
    const cx = w / 2, bw = w * .66, bh = h * .24, by = h * .60;
    const kinds = Array.isArray(kind) ? kind : [kind];
    const items = [];
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.04 + 0.92 * rnd());
      const rr = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * bw * .5 * rr * .98;
      const y = by - Math.sin(a) * bh * 1.25 * rr;
      const scale = (0.85 + rnd() * 0.4) * (w / 260);
      const rot = rnd() * 180;
      items.push({ x, y, scale, rot, k: kinds[i % kinds.length] });
    }
    items.sort((a, b) => a.y - b.y);
    const nutUses = items.map(it =>
      `<use href="#n-${it.k}" transform="translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.rot.toFixed(0)}) scale(${it.scale.toFixed(2)})"/>`
    ).join("");
    const gradId = "bg" + Math.random().toString(36).slice(2, 8);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/>
      </linearGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${gradId})"/>
      <circle cx="${cx}" cy="${h * .42}" r="${w * .3}" fill="#fff" opacity=".35"/>
      ${nutUses}
      <path d="M${cx - bw / 2} ${by - 3} Q${cx - bw / 2} ${by + bh} ${cx} ${by + bh} Q${cx + bw / 2} ${by + bh} ${cx + bw / 2} ${by - 3} Z" fill="url(#g-bowl)"/>
      <ellipse cx="${cx}" cy="${by - 3}" rx="${bw / 2}" ry="${h * .026}" fill="#EADCBB"/>
      <path d="M${cx - bw / 2 + 10} ${by + bh * .32} Q${cx} ${by + bh * .52} ${cx + bw / 2 - 10} ${by + bh * .32}" stroke="#D4AF37" stroke-width="2" fill="none" opacity=".8"/>
    </svg>`;
  }

  /* ---------- عکس محصولات ----------
     اگر در products.json برای محصول فیلد «i» (نام فایل داخل assets/img/products/) باشد، همان عکس نشان داده می‌شود؛
     وگرنه تصویر SVG پیش‌فرضِ دسته. عکس‌ها را پنل ادمین خودکار کوچک و بهینه می‌کند. */
  function productMedia(p, viewW, viewH) {
    if (!p.img) return bowlSVG(p.kind, p.bg, p.seed, viewW, viewH);
    const src = "assets/img/products/" + p.img;
    const alt = String(p.name).replace(/"/g, "&quot;");
    return `<img class="product-photo" src="${src}" alt="${alt}" width="${viewW}" height="${viewH}" loading="lazy" decoding="async">`;
  }

  /* ---------- وضعیت: سبد خرید و علاقه‌مندی ---------- */
  const state = {
    cart: storage("njk_cart_v2", {}),        // { "productId|grams": qty }
    wishlist: storage("njk_wishlist_v2", []) // [productId]
  };

  function findProduct(id) { return PRODUCTS.find(p => p.id === id); }
  const cartKey = (id, g) => id + "|" + g;
  function parseKey(key) {
    const [id, g] = String(key).split("|");
    const p = findProduct(id), grams = Number(g);
    return p && p.w.includes(grams) ? { p, g: grams } : null;
  }
  // پاک‌سازی سبد/علاقه‌مندی ذخیره‌شده‌ی قدیمی (محصول حذف‌شده، ساختار قدیمی، بدون قیمت)
  (function sanitizeStored() {
    const clean = {};
    Object.entries(state.cart).forEach(([k, q]) => {
      const r = parseKey(k);
      if (r && r.p.price != null && Number.isInteger(q) && q > 0) clean[k] = q;
    });
    state.cart = clean; save("njk_cart_v2", clean);
    state.wishlist = state.wishlist.filter(id => findProduct(id));
    save("njk_wishlist_v2", state.wishlist);
  })();
  function cartCount() { return Object.values(state.cart).reduce((a, b) => a + b, 0); }
  function cartSubtotal() {
    return Object.entries(state.cart).reduce((sum, [k, qty]) => {
      const r = parseKey(k); return r ? sum + unitPrice(r.p, r.g) * qty : sum;
    }, 0);
  }

  function addToCart(id, g, qty) {
    const p = findProduct(id);
    if (!p || p.price == null) { toast("قیمت این محصول هنوز مشخص نشده است."); return false; }
    const k = cartKey(id, g || defG(p));
    state.cart[k] = (state.cart[k] || 0) + (qty || 1);
    save("njk_cart_v2", state.cart);
    renderCart(); updateCounts();
    return true;
  }
  function setQty(key, qty) {
    if (qty <= 0) { delete state.cart[key]; } else { state.cart[key] = qty; }
    save("njk_cart_v2", state.cart);
    renderCart(); updateCounts();
  }
  function removeFromCart(key) { setQty(key, 0); }

  function toggleWishlist(id) {
    const i = state.wishlist.indexOf(id);
    if (i > -1) state.wishlist.splice(i, 1); else state.wishlist.push(id);
    save("njk_wishlist_v2", state.wishlist);
    renderWishlist(); updateCounts();
    $$(`[data-wish-toggle="${id}"]`).forEach(btn => btn.classList.toggle("is-active", state.wishlist.includes(id)));
    clubCheck();
    return state.wishlist.includes(id);
  }

  function updateCounts() {
    const cc = cartCount(), wc = state.wishlist.length;
    $$("[data-cart-count]").forEach(el => { el.textContent = fa(cc); el.hidden = cc === 0; });
    $$("[data-wish-count]").forEach(el => { el.textContent = fa(wc); el.hidden = wc === 0; });
    const cct = $("[data-cart-count-text]"); if (cct) cct.textContent = cc ? `(${fa(cc)})` : "";
    const wct = $("[data-wish-count-text]"); if (wct) wct.textContent = wc ? `(${fa(wc)})` : "";
  }

  /* ---------- کارت محصول (مشترک بین صفحه اصلی و فروشگاه) ---------- */
  function productCard(p) {
    const li = document.createElement("li");
    const g0 = defG(p);
    li.innerHTML = `
      <article class="product-card neo" data-card="${p.id}">
        <div class="product-card__media">
          ${productMedia(p, 252, 220)}
          ${p.badge && BADGE[p.badge] ? `<span class="badge ${BADGE[p.badge].cls}">${p.badge === "new" || p.badge === "custom" ? '<svg class="icon icon--fill icon--xs" aria-hidden="true"><use href="#i-star"/></svg>' : ""}${p.badge === "custom" ? esc(p.label) : BADGE[p.badge].label}</span>` : ""}
          <button class="wish-btn" type="button" data-wish-toggle="${p.id}" aria-pressed="${state.wishlist.includes(p.id)}" aria-label="افزودن ${p.name} به علاقه‌مندی‌ها">
            <svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>
          </button>
          <button class="qv-btn glass" type="button" data-quickview="${p.id}">
            <svg class="icon icon--sm" aria-hidden="true"><use href="#i-eye"/></svg>
            مشاهده سریع
          </button>
        </div>
        <div class="product-card__info">
          <div class="product-card__meta">
            <p class="product-card__cat">${CATEGORY_LABEL[p.cat]}</p>
            <span class="weight-chip">${weightLabel(g0)}</span>
          </div>
          <h3 class="product-card__name">${p.name}</h3>
          <div class="price-box">
            <div class="price-top">${oldPriceHTML(p, g0)}</div>
            ${p.price == null
              ? `<span class="price-now"><b class="price-unknown">${UNKNOWN_PRICE}</b></span>`
              : `<span class="price-now"><b>${fa(unitPrice(p, g0))}</b><span>تومان</span></span>`}
          </div>
        </div>
        <button class="add-btn" type="button" data-add-to-cart="${p.id}"${p.price == null ? " disabled" : ""}>
          <svg class="icon" aria-hidden="true"><use href="#i-cart"/></svg>
          افزودن به سبد خرید
        </button>
      </article>`;
    li.querySelector(`[data-wish-toggle="${p.id}"]`).classList.toggle("is-active", state.wishlist.includes(p.id));
    return li;
  }

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ESC[c]);
  /* هم‌طول‌سازی ی/ک عربی و فارسی و نیم‌فاصله؛ طول رشته ثابت می‌ماند تا هایلایت درست بماند */
  const norm = (t) => t.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").toLowerCase();
  const matchQ = (p, q) => (p._n || (p._n = norm(p.name))).includes(q) || norm(CATEGORY_LABEL[p.cat]).includes(q);

  const GRID = $("#product-grid");

  function fillGrid(list) {
    GRID.innerHTML = "";
    if (!list.length) {
      GRID.innerHTML = `<li class="no-results">محصولی یافت نشد.</li>`;
    } else {
      list.forEach(p => GRID.appendChild(productCard(p)));
    }
  }

  /* شمارنده‌ی هر دسته — روی هر عنصر [data-count] در هر صفحه‌ای که باشد */
  function renderCategoryCounts() {
    $$("[data-count]").forEach(el => {
      const n = PRODUCTS.filter(p => p.cat === el.dataset.count).length;
      el.textContent = n ? fa(n) : "به‌زودی";
      el.classList.toggle("is-soon", !n);
    });
  }

  /* ---------- صفحه اصلی: پیش‌نمایش ثابت محصولات ویژه (بدون فیلتر/اسکرول) ---------- */
  function renderFeaturedGrid() {
    /* فقط محصولات دارای لیبل (تخفیف/پرفروش/ویژه)، به‌صورت چرخشی تا ترکیب متنوع باشد */
    const groups = ["sale", "best", "new"].map(b => PRODUCTS.filter(p => p.badge === b));
    const picked = [];
    for (let i = 0; picked.length < FEATURED_COUNT && groups.some(g => i < g.length); i++) {
      groups.forEach(g => { if (g[i] && picked.length < FEATURED_COUNT) picked.push(g[i]); });
    }
    fillGrid(picked);
    renderCategoryCounts();
  }

  /* ---------- صفحه فروشگاه: فیلتر واقعی بر اساس ?category= در آدرس ---------- */
  function renderShopGrid() {
    const params = new URLSearchParams(location.search);
    const rawQ = (params.get("q") || "").trim().slice(0, 60);
    const q = norm(rawQ);
    const cat = params.get("category") || document.body.dataset.category; // صفحه‌های ثابت دسته: دسته از body می‌آید
    const valid = !q && cat && CATEGORY_LABEL[cat] ? cat : null;

    const list = q ? PRODUCTS.filter(p => matchQ(p, q)) : valid ? PRODUCTS.filter(p => p.cat === valid) : PRODUCTS.slice();
    fillGrid(list);
    if (valid && !list.length) GRID.innerHTML = `<li class="no-results">محصولات دسته‌ی «${CATEGORY_LABEL[valid]}» به‌زودی اضافه می‌شود.</li>`;
    renderCategoryCounts();

    // به‌روزرسانی بنر و بردکرامب
    const titleEl = $("[data-shop-title]");
    const subEl = $("[data-shop-sub]");
    const crumbEl = $("#breadcrumb-current");
    if (q) {
      if (titleEl) titleEl.textContent = `نتایج جستجو برای «${rawQ}»`;
      if (subEl) subEl.textContent = list.length ? `${fa(list.length)} محصول یافت شد` : "محصولی با این عبارت یافت نشد؛ عبارت دیگری را امتحان کنید یا از دسته‌بندی‌ها استفاده کنید.";
      if (crumbEl) crumbEl.textContent = "نتایج جستجو";
      $$("#search-input, #search-input-m").forEach(el => { el.value = rawQ; });
    } else if (valid) {
      if (titleEl && !document.body.dataset.category) titleEl.textContent = CATEGORY_LABEL[valid]; // در صفحه‌ی ثابت، h1 همان متن HTML می‌ماند
      if (subEl) subEl.textContent = list.length ? `${fa(list.length)} محصول در دسته‌بندی «${CATEGORY_LABEL[valid]}»` : `محصولات دسته‌بندی «${CATEGORY_LABEL[valid]}» به‌زودی اضافه می‌شود`;
      if (crumbEl) crumbEl.textContent = CATEGORY_LABEL[valid];
    } else {
      if (titleEl) titleEl.textContent = "فروشگاه خشکبار نقش جهان";
      if (subEl) subEl.textContent = "مرور و خرید همه‌ی محصولات، بر اساس دسته‌بندی دلخواه شما";
      if (crumbEl) crumbEl.textContent = "فروشگاه";
    }

    // هایلایت Pill فعال
    $$("[data-cat-pill]").forEach(pill => {
      const isActive = q ? false : valid ? pill.dataset.category === valid : !pill.dataset.category;
      pill.classList.toggle("is-active", isActive);
    });

    if (!document.body.dataset.category) document.title = (q ? `نتایج جستجو برای «${rawQ}»` : valid ? `${CATEGORY_LABEL[valid]} | فروشگاه` : "فروشگاه") + " | خشکبار نقش جهان";

    // توضیحات دسته‌بندی زیر محصولات: فقط برای دسته‌ی انتخاب‌شده
    const infoSection = $("#cat-info-section");
    if (infoSection) {
      const hasInfo = !!(valid && $(`[data-cat-info="${valid}"]`));
      infoSection.hidden = !hasInfo;
      $$("[data-cat-info]").forEach(a => { a.hidden = a.dataset.catInfo !== valid; });
    }
  }

  if (GRID) {
    if (PAGE === "shop") {
      renderShopGrid();
    } else if (PAGE === "home") {
      renderFeaturedGrid();
    }

    GRID.addEventListener("click", (e) => {
    const wishBtn = e.target.closest("[data-wish-toggle]");
    if (wishBtn) {
      const active = toggleWishlist(wishBtn.dataset.wishToggle);
      wishBtn.setAttribute("aria-pressed", String(active));
      if (active) { wishBtn.classList.remove("is-popping"); void wishBtn.offsetWidth; wishBtn.classList.add("is-popping"); }
      return;
    }
    const qvBtn = e.target.closest("[data-quickview]");
    if (qvBtn) { openQuickView(qvBtn.dataset.quickview); return; }
    const addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      if (!addToCart(addBtn.dataset.addToCart, defG(findProduct(addBtn.dataset.addToCart)), 1)) return;
      const p = findProduct(addBtn.dataset.addToCart);
      toast(`«${p.name}» به سبد خرید افزوده شد`);
      addBtn.classList.add("is-added");
      addBtn.querySelector("svg use").setAttribute("href", "#i-check");
      setTimeout(() => { addBtn.classList.remove("is-added"); addBtn.querySelector("svg use").setAttribute("href", "#i-cart"); }, 1100);
      return;
    }
    // کلیک روی هر قسمت خالیِ دیگرِ کارت (تصویر، عنوان، قیمت و ...) هم
    // مثل دکمه‌ی «مشاهده سریع» عمل می‌کند
    const card = e.target.closest("[data-card]");
    if (card) { openQuickView(card.dataset.card); }
    });
  }

  /* ---------- رندر سبد خرید ---------- */
  const CART_LIST = $("#cart-list");
  function renderCart() {
    const entries = Object.entries(state.cart);
    CART_LIST.innerHTML = "";
    $("#cart-empty").hidden = entries.length > 0;
    $("#cart-foot").hidden = entries.length === 0;
    entries.forEach(([id, qty]) => {
      const r = parseKey(id); if (!r) return;
      const p = r.p;
      const li = document.createElement("li");
      li.className = "line-item";
      li.innerHTML = `
        <div class="line-item__thumb">${productMedia(p, 80, 80)}</div>
        <div class="line-item__body">
          <div class="line-item__top">
            <div><p class="line-item__name">${p.name}</p><p class="line-item__weight">${weightLabel(r.g)}</p></div>
            <button class="line-item__remove" type="button" data-remove="${id}" aria-label="حذف ${p.name}">
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-trash"/></svg>
            </button>
          </div>
          <div class="line-item__bottom">
            <div class="stepper" role="group" aria-label="تعداد ${p.name}">
              <button type="button" data-step="-1" data-id="${id}" aria-label="کم کردن یک عدد">
                <svg class="icon icon--sm" aria-hidden="true"><use href="#i-minus"/></svg>
              </button>
              <span>${fa(qty)}</span>
              <button type="button" data-step="1" data-id="${id}" aria-label="یک عدد بیشتر">
                <svg class="icon icon--sm" aria-hidden="true"><use href="#i-plus"/></svg>
              </button>
            </div>
            <span class="line-item__price">${fa(unitPrice(p, r.g) * qty)} تومان</span>
          </div>
        </div>`;
      CART_LIST.appendChild(li);
    });

    const subtotal = cartSubtotal();
    $("#cart-subtotal").textContent = fa(subtotal) + " تومان";
    const remaining = FREE_SHIP_THRESHOLD - subtotal;
    const shipEl = $("#cart-shipping");
    if (subtotal === 0) {
      shipEl.textContent = "—";
    } else if (remaining > 0) {
      shipEl.textContent = fa(SHIP_COST) + " تومان";
    } else {
      shipEl.textContent = "رایگان";
    }
    const shipText = $("#ship-text");
    const shipFill = $("#ship-fill");
    if (subtotal === 0) {
      shipText.textContent = "با اولین خرید، از ارسال رایگان مطلع می‌شوید.";
      shipFill.style.width = "0%";
    } else if (remaining > 0) {
      shipText.innerHTML = `تا <strong>${fa(remaining)} تومان</strong> دیگر، ارسال رایگان می‌شود.`;
      shipFill.style.width = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100) + "%";
    } else {
      shipText.textContent = "سفارش شما شامل ارسال رایگان است. 🎉";
      shipFill.style.width = "100%";
    }
  }

  CART_LIST.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { removeFromCart(rm.dataset.remove); return; }
    const step = e.target.closest("[data-step]");
    if (step) {
      const id = step.dataset.id;
      const delta = Number(step.dataset.step);
      setQty(id, (state.cart[id] || 0) + delta);
    }
  });

  $("[data-action='checkout']").addEventListener("click", () => {
    if (cartCount() === 0) { toast("سبد خرید شما خالی است."); return; }
    location.href = "checkout.html";
  });

  /* ---------- رندر علاقه‌مندی‌ها ---------- */
  const WISH_LIST = $("#wishlist-list");
  function renderWishlist() {
    WISH_LIST.innerHTML = "";
    $("#wishlist-empty").hidden = state.wishlist.length > 0;
    state.wishlist.forEach(id => {
      const p = findProduct(id); if (!p) return;
      const li = document.createElement("li");
      li.className = "line-item";
      li.innerHTML = `
        <div class="line-item__thumb">${productMedia(p, 80, 80)}</div>
        <div class="line-item__body">
          <div class="line-item__top">
            <div><p class="line-item__name">${p.name}</p><p class="line-item__weight">${weightLabel(defG(p))}</p></div>
            <button class="line-item__remove" type="button" data-wish-remove="${id}" aria-label="حذف ${p.name} از علاقه‌مندی‌ها">
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-trash"/></svg>
            </button>
          </div>
          <div class="line-item__bottom">
            <span class="line-item__price">${priceText(p.price)}</span>
            <button class="wish-move" type="button" data-wish-to-cart="${id}">افزودن به سبد</button>
          </div>
        </div>`;
      WISH_LIST.appendChild(li);
    });
  }
  WISH_LIST.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-wish-remove]");
    if (rm) { toggleWishlist(rm.dataset.wishRemove); return; }
    const add = e.target.closest("[data-wish-to-cart]");
    const wp = add && findProduct(add.dataset.wishToCart);
    if (wp && addToCart(wp.id, defG(wp), 1)) { toast("به سبد خرید افزوده شد"); }
  });

  /* ---------- مشاهده سریع ---------- */
  const QV = $("#quickview");
  /* محصولات مشابه: اول هم‌دسته‌ها (نزدیک‌ترین قیمت)، بعد چند محصول تصادفی از دسته‌های دیگر.
     در مجموع تا SIM_MAX مورد؛ همیشه حداقل SIM_OTHERS_MIN مورد از دسته‌های دیگر (اگر موجود باشد). */
  const SIM_MAX = 12, SIM_OTHERS_MIN = 4;
  function similarOf(p) {
    const gap = (x) => (x.price == null || p.price == null ? 1e12 : Math.abs(x.price - p.price));
    const same = PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat).sort((a, b) => gap(a) - gap(b));
    const shown = same.slice(0, SIM_MAX - SIM_OTHERS_MIN);
    const pool = PRODUCTS.filter(x => x.cat !== p.cat);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return { list: shown.concat(pool.slice(0, SIM_MAX - shown.length)), title: same.length ? "محصولات مشابه" : "پیشنهاد برای شما" };
  }
  /* اطلاعات تکمیلی محصول (گالری، توضیحات، مشخصات) از product-info.json، فقط هنگام اولین «مشاهده سریع» بارگیری می‌شود.
     عمداً جدا از products.json است: پنل ادمین هنگام ذخیره‌ی قیمت‌ها فیلدهای ناشناس آن فایل را حذف می‌کند.
     هر محصول: { "imgs": ["عکس۲.webp", ...], "desc": "توضیح", "specs": [["عنوان", "مقدار"], ...] } — عکس‌ها در assets/img/products/ */
  const RATE_KEY = "njk_my_ratings_v1";
  let INFOD = null, INFOP = null;
  const FILE_OK = /^[\w.-]+\.(webp|avif|jpe?g|png)$/i;
  const loadInfo = () => INFOP || (INFOP = fetch("product-info.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => (INFOD = j && typeof j === "object" ? j : {})));
  /* عکس اصلی (فیلد i در products.json) + عکس‌های بیشتر؛ با کمتر از دو عکس همان نمای قبلی می‌ماند */
  function galleryHTML(p, x) {
    const imgs = (p.img ? [p.img] : []).concat((Array.isArray(x.imgs) ? x.imgs : []).filter(f => FILE_OK.test(f) && f !== p.img)).slice(0, 8);
    if (imgs.length < 2) return [productMedia(p, 420, 420), false];
    const alt = esc(p.name), src = (f) => "assets/img/products/" + f;
    return [`<div class="qv__stage" tabindex="0" role="group" aria-label="تصاویر ${alt}">${imgs.map((f, i) => `<img class="product-photo" src="${src(f)}" alt="${alt} — تصویر ${fa(i + 1)} از ${fa(imgs.length)}" width="420" height="420" decoding="async"${i ? ' loading="lazy"' : ""}>`).join("")}</div><div class="qv__thumbs">${imgs.map((f, i) => `<button type="button" class="qv__thumb${i ? "" : " is-active"}" aria-label="نمایش تصویر ${fa(i + 1)}"><img src="${src(f)}" alt="" width="58" height="58" loading="lazy" decoding="async"></button>`).join("")}</div>`, true];
  }
  /* مشخصات: ردیف‌های اول از داده‌ی واقعی فروشگاه ساخته می‌شود؛ بقیه فقط اگر در product-info.json آمده باشد */
  function specsHTML(p, x) {
    const rows = [["دسته‌بندی", CATEGORY_LABEL[p.cat]], ["وزن‌های موجود", weightsOf(p).map(w => w.label).reverse().join("، ")]];
    if (p.price != null) rows.push(["قیمت هر کیلوگرم", priceText(p.price)]);
    (Array.isArray(x.specs) ? x.specs : []).slice(0, 8).forEach(r => { if (Array.isArray(r) && r[0] && r[1]) rows.push([String(r[0]).slice(0, 40), String(r[1]).slice(0, 120)]); });
    return `<dl class="qv__specs">${rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>`;
  }
  function openQuickView(id) {
    let p = findProduct(id); if (!p) return;
    clubView(id);
    let activeG = defG(p), keepScroll = false, sim, simId, slide = 0, slideId; // sim فقط با عوض شدن محصول دوباره انتخاب می‌شود (تا با تغییر وزن، لیست تصادفی عوض نشود)

    /* امتیاز عمومی = میانگین نظرهای reviews.json همین محصول؛ «امتیاز شما» فقط در همین مرورگر ذخیره می‌شود */
    function renderRate() {
      loadReviews().then(all => {
        const box = $("#qv-rate"); if (!box || box.dataset.pid !== p.id) return;
        const rs = all.filter(v => v.pid === p.id), n = rs.length, avg = n ? rs.reduce((s, v) => s + v.r, 0) / n : 0, my = (storage(RATE_KEY, {}) || {})[p.id] || 0;
        box.innerHTML = `<h3>امتیاز و نظرات</h3><div class="qv__avg">${n ? `<b>${avg.toLocaleString("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b><span class="stars-row" role="img" aria-label="میانگین امتیاز ${fa(Math.round(avg))} از ۵">${rvStars(avg)}</span><small>از ${fa(n)} نظر${rs.some(v => v.demo) ? " (نمونه‌ی آزمایشی)" : ""}</small>` : "<small>هنوز امتیازی برای این محصول ثبت نشده است.</small>"}</div><div class="qv__mine-rate"><span>امتیاز شما:</span><span class="rstars" role="group" aria-label="امتیاز شما به این محصول">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="rstar${i <= my ? " is-on" : ""}" data-rate="${i}" aria-label="${fa(i)} از ۵" aria-pressed="${i === my}"><svg class="icon icon--fill" aria-hidden="true"><use href="#i-star"/></svg></button>`).join("")}</span>${my ? "<small>فقط در این مرورگر ذخیره شده</small>" : ""}</div>${n ? `<ul class="reviews__list">${rs.slice(0, 3).map(v => rvItem(v, -1)).join("")}</ul>` : ""}`;
        box.onclick = (e) => {
          const b = e.target.closest("[data-rate]"); if (!b) return;
          const m = storage(RATE_KEY, {}) || {}; m[p.id] = +b.dataset.rate; save(RATE_KEY, m);
          toast("امتیاز شما در همین مرورگر ذخیره شد"); renderRate();
        };
      });
    }
    function render() {
      const price = unitPrice(p, activeG);
      const oldTrack = $(".qv__track", QV), sl = keepScroll && oldTrack ? oldTrack.scrollLeft : 0;
      if (simId !== p.id) { sim = similarOf(p); simId = p.id; }
      if (slideId !== p.id) { slide = 0; slideId = p.id; }
      const x = (INFOD && INFOD[p.id]) || {}, [media, multi] = galleryHTML(p, x);
      $("#qv-content").innerHTML = `
        <div class="qv__media${multi ? " qv__media--gal" : ""}">${media}</div>
        <div class="qv__info">
          <p class="qv__cat">${CATEGORY_LABEL[p.cat]}</p>
          <h2 class="qv__name" id="qv-title" tabindex="-1">${p.name}</h2>
          ${x.desc ? `<p class="qv__desc">${esc(x.desc)}</p>` : ""}
          <div class="qv__weights" role="group" aria-label="انتخاب وزن">
            ${weightsOf(p).map(w => `<button type="button" data-g="${w.g}" class="${w.g === activeG ? "is-active" : ""}" aria-pressed="${w.g === activeG}">${w.label}</button>`).join("")}
          </div>
          ${price == null
            ? `<p class="qv__price"><b class="price-unknown">${UNKNOWN_PRICE}</b></p>`
            : `<p class="qv__price"><b>${fa(price)}</b><span>تومان</span>${saveAmount(p, activeG) > 0 ? `<span class="price-old">${fa(oldPrice(p, activeG))}</span><span class="price-save">${fa(saveAmount(p, activeG))} تومان تخفیف</span>` : ""}</p>`}
          <div class="qv__actions">
            <button class="add-btn" type="button" id="qv-add"${price == null ? " disabled" : ""}>
              <svg class="icon" aria-hidden="true"><use href="#i-cart"/></svg>
              افزودن به سبد خرید
            </button>
            <button class="icon-btn neo" type="button" id="qv-wish" aria-label="افزودن به علاقه‌مندی‌ها" aria-pressed="${state.wishlist.includes(p.id)}">
              <svg class="icon ${state.wishlist.includes(p.id) ? 'icon--fill' : ''}" aria-hidden="true"><use href="#i-heart"/></svg>
            </button>
          </div>
          ${specsHTML(p, x)}
          <section class="qv__rate" id="qv-rate" data-pid="${p.id}" aria-label="امتیاز و نظرات"></section>
        </div>
        ${sim.list.length ? `<section class="qv__similar" aria-label="${sim.title}">
          <div class="qv__sim-head"><h3>${sim.title}</h3>
            <div class="qv__nav"><button type="button" data-sim-nav="1" aria-label="قبلی"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button><button type="button" data-sim-nav="-1" aria-label="بعدی"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button></div></div>
          <div class="qv__track">${sim.list.map(x => `<button type="button" class="sim" data-sim="${x.id}"><span class="sim__img">${productMedia(x, 120, 120)}</span><span class="sim__name">${esc(x.name)}</span><span class="sim__price">${priceText(unitPrice(x, defG(x)))}</span></button>`).join("")}</div>
        </section>` : ""}`;
      const track = $(".qv__track", QV);
      if (track) track.scrollLeft = sl;
      const stage = $(".qv__stage", QV);
      if (stage) {
        const th = $$(".qv__thumb", QV), im = $$("img", stage), mark = (i) => th.forEach((b, j) => b.classList.toggle("is-active", i === j));
        th.forEach((b, i) => b.addEventListener("click", () => im[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })));
        if (slide) { im[slide].scrollIntoView({ block: "nearest", inline: "center" }); mark(slide); }
        if ("IntersectionObserver" in window) {
          const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { slide = im.indexOf(e.target); mark(slide); } }), { root: stage, threshold: .6 });
          im.forEach(s => io.observe(s));
        }
      }
      renderRate();
      $$("[data-sim]", QV).forEach(b => b.addEventListener("click", () => {
        p = findProduct(b.dataset.sim); activeG = defG(p); keepScroll = false; render(); QV.scrollTop = 0; $("#qv-title").focus();
      }));
      $$("[data-sim-nav]", QV).forEach(b => b.addEventListener("click", () => {
        track.scrollBy({ left: -b.dataset.simNav * track.clientWidth * .85, behavior: "smooth" });
      }));
      $$("[data-g]", QV).forEach(btn => btn.addEventListener("click", () => { activeG = Number(btn.dataset.g); keepScroll = true; render(); }));
      $("#qv-add", QV).addEventListener("click", () => {
        if (!addToCart(p.id, activeG, 1)) return;
        toast(`«${p.name}» (${weightLabel(activeG)}) به سبد خرید افزوده شد`); closeAllDialogs();
      });
      $("#qv-wish", QV).addEventListener("click", (e) => {
        const active = toggleWishlist(p.id);
        e.currentTarget.setAttribute("aria-pressed", String(active));
        e.currentTarget.querySelector("svg").classList.toggle("icon--fill", active);
      });
    }
    render();
    openDialog(QV);
    if (!INFOD) loadInfo().then(d => { if (QV.open && d[p.id]) { keepScroll = true; render(); } });
  }

  /* ---------- جستجوی زنده (قابل استفاده برای چند نمونه: هدر دسکتاپ + منوی موبایل) ---------- */
  function highlight(text, q) {
    const idx = q ? norm(text).indexOf(q) : -1;
    if (idx === -1) return esc(text);
    return esc(text.slice(0, idx)) + "<mark>" + esc(text.slice(idx, idx + q.length)) + "</mark>" + esc(text.slice(idx + q.length));
  }

  function initSearch(formId) {
    const form = $(formId);
    if (!form) return; // این صفحه ممکن است این نمونه از سرچ را نداشته باشد
    const input = $(".search__input", form);
    const panel = $(".search__panel", form);
    const results = $(".search__list", form);
    const allBtn = $(".search__all", form);

    function runSearch(q) {
      const raw = q.trim();
      q = norm(raw);
      if (!q) { panel.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      const matches = PRODUCTS.filter(p => matchQ(p, q));
      results.innerHTML = "";
      if (!matches.length) {
        results.innerHTML = `<li class="search__empty">نتیجه‌ای برای «${esc(raw)}» یافت نشد.</li>`;
      } else {
        matches.slice(0, 6).forEach(p => {
          const li = document.createElement("li");
          li.innerHTML = `
            <button class="search__item" type="button" data-goto="${p.id}" role="option">
              <span class="search__thumb">${productMedia(p, 60, 60)}</span>
              <span class="search__meta">
                <span class="search__name">${highlight(p.name, q)}</span>
                <span class="search__price">${weightLabel(defG(p))} · ${priceText(unitPrice(p, defG(p)))}</span>
              </span>
            </button>`;
          results.appendChild(li);
        });
      }
      allBtn.hidden = matches.length <= 6;
      allBtn.href = "shop.html?q=" + encodeURIComponent(raw);
      allBtn.textContent = `مشاهده همه ${fa(matches.length)} نتیجه در فروشگاه`;
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => runSearch(input.value), 120);
    });
    input.addEventListener("focus", () => { if (input.value.trim()) runSearch(input.value); });
    results.addEventListener("click", (e) => {
      const item = e.target.closest("[data-goto]");
      if (item) { openQuickView(item.dataset.goto); panel.hidden = true; input.value = ""; }
    });
    document.addEventListener("click", (e) => {
      if (!form.contains(e.target)) panel.hidden = true;
    });
    form.addEventListener("submit", (e) => {
      if (!input.value.trim()) { e.preventDefault(); input.focus(); }
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { panel.hidden = true; input.blur(); } });
  }

  initSearch("#search");    // نوار سرچ هدر (دسکتاپ)
  initSearch("#search-m");  // سرچ داخل منوی موبایل

  /* ---------- منوی «دسته‌بندی‌ها» در هدر (فقط باز/بسته‌شدن dropdown، لینک‌ها واقعی‌اند) ---------- */
  const hasMenu = $(".has-menu");
  const submenuBtn = $("[data-action='submenu']");
  submenuBtn.addEventListener("click", () => {
    const open = hasMenu.classList.toggle("is-open");
    submenuBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!hasMenu.contains(e.target)) { hasMenu.classList.remove("is-open"); submenuBtn.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- پنل‌های <dialog>: باز/بسته‌شدن، فوکوس، اسکرول پس‌زمینه ---------- */
  let openDialogEl = null;
  function openDialog(el) {
    if (openDialogEl && openDialogEl !== el) closeAllDialogs();
    document.documentElement.style.overflow = "hidden";
    el.showModal();
    openDialogEl = el;
  }
  function closeAllDialogs() {
    $$("dialog[open]").forEach(d => d.close());
  }
  $$("dialog").forEach(d => {
    d.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
      if (openDialogEl === d) openDialogEl = null;
    });
    // کلیک روی بک‌دراپ برای بستن
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  });
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-action='cart-open']");
    if (openBtn) { openDialog($("#cart-drawer")); return; }
    const wishBtn = e.target.closest("[data-action='wishlist-open']");
    if (wishBtn) { openDialog($("#wishlist-drawer")); return; }
    const menuBtn = e.target.closest("[data-action='menu-open']");
    if (menuBtn) { openDialog($("#mobile-menu")); return; }
    const closeBtn = e.target.closest("[data-action='close']");
    if (closeBtn) { closeAllDialogs(); }
  });
  // با کلیک روی هر لینک داخل منوی موبایل، منو بسته شود (پیش از هدایت به صفحه مقصد)
  $("#mobile-menu").addEventListener("click", (e) => { if (e.target.closest("a")) closeAllDialogs(); });

  /* ---------- Toast ---------- */
  function toast(msg) {
    const box = $("#toasts");
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>${msg}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .25s"; setTimeout(() => t.remove(), 260); }, 2600);
  }

  /* ---------- وضعیت ورود در سراسر سایت: آیکون هدر + نوار فوتر ---------- */
  function renderAuthUI() {
    const user = AUTH.currentUser();
    const link = $("#account-link");
    if (link) {
      link.classList.toggle("is-logged-in", !!user);
      link.setAttribute("aria-label", user ? `حساب کاربری (${user.name})` : "ورود / ثبت‌نام");
    }
    const band = $("#auth-band-content");
    if (band) {
      if (user) {
        band.innerHTML = `
          <div>
            <h2>سلام ${user.name} عزیز 👋</h2>
            <p>به حساب کاربری خود وارد شده‌اید. سفارش‌های خود را از این‌جا پیگیری کنید.</p>
          </div>
          <div class="auth-band__actions">
            <a class="btn btn--gold" href="account.html">
              حساب من
              <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
            </a>
            <button class="btn btn--outline-gold" type="button" data-action="logout">خروج از حساب</button>
          </div>`;
      } else {
        band.innerHTML = `
          <div>
            <h2>عضو خانواده نقش جهان شوید</h2>
            <p>برای ثبت سفارش، پیگیری ارسال و تسویه‌حساب سریع‌تر وارد حساب کاربری خود شوید</p>
          </div>
          <div class="auth-band__actions">
            <a class="btn btn--gold" href="account.html">
              ورود / ثبت‌نام
              <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
            </a>
          </div>`;
      }
    }
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-action='logout']")) {
      AUTH.logout();
      toast("از حساب کاربری خارج شدید.");
      renderAuthUI();
    }
  });


  const header = $("#site-header");
  const sentinel = $("#header-sentinel");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle("is-scrolled", !entry.isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  } else {
    window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 10));
  }

  /* ---------- نوار اعلان: بستن با یادآوری در همین بازدید ---------- */
  const announce = $("#announce");
  $("[data-action='announce-close']").addEventListener("click", () => {
    announce.classList.add("is-closed");
    try { sessionStorage.setItem("njk_announce_closed", "1"); } catch (e) {}
  });
  try { if (sessionStorage.getItem("njk_announce_closed") === "1") announce.classList.add("is-closed"); } catch (e) {}

  /* ---------- اسکرول نرم فقط برای لنگرهای داخل همین صفحه ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = $(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", id);
    }
  });

  /* ---------- صفحه حساب کاربری: ورود / ثبت‌نام ---------- */
  function toEnDigits(s) {
    return String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  }
  /* ---------- انتخاب استان و شهر (فقط از فهرست) ---------- */
  const faNorm = (x) => String(x).replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإآ]/g, "ا").replace(/ۀ/g, "ه")
    .replace(/[\u200c\u200f\u064b-\u0652\s\-]/g, "");
  function initCityPicker(prefix) {
    const data = window.IRAN_CITIES || {};
    const sel = $("#" + prefix + "-province"), input = $("#" + prefix + "-city"), list = $("#" + prefix + "-city-list");
    if (!sel || !input || !list) return null;
    const cities = {};
    Object.keys(data).sort((a, b) => a.localeCompare(b, "fa")).forEach((pv) => {
      cities[pv] = data[pv].split("،");
      sel.add(new Option(pv, pv));
    });
    let shown = [], active = -1;
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; };
    const exact = () => { const q = faNorm(input.value); return (cities[sel.value] || []).find((c) => faNorm(c) === q) || null; };
    function paint() {
      [...list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    }
    function choose(c) { input.value = c; close(); }
    function open() {
      const q = faNorm(input.value), all = cities[sel.value] || [];
      shown = (q ? all.filter((c) => faNorm(c).includes(q)).sort((a, b) => faNorm(b).startsWith(q) - faNorm(a).startsWith(q)) : all).slice(0, 8);
      list.innerHTML = shown.length
        ? shown.map((c, i) => `<li role="option" data-i="${i}">${esc(c)}</li>`).join("")
        : `<li class="is-empty">شهری با این نام در فهرست نیست</li>`;
      active = shown.length ? 0 : -1; paint();
      list.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    sel.addEventListener("change", () => { input.value = ""; input.disabled = !sel.value; close(); if (sel.value) input.focus(); });
    input.addEventListener("input", open);
    input.addEventListener("focus", () => { if (sel.value) open(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (list.hidden) open();
        if (shown.length) { active = (active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length; paint(); }
      } else if (e.key === "Enter" && !list.hidden) {
        e.preventDefault(); if (shown[active]) choose(shown[active]);
      } else if (e.key === "Escape") close();
    });
    list.addEventListener("mousedown", (e) => { // پیش از blur
      const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); choose(shown[+li.dataset.i]); }
    });
    input.addEventListener("blur", () => { close(); const c = exact(); if (c) input.value = c; });
    return {
      get() { const c = exact(); return sel.value && c ? { province: sel.value, city: c } : null; },
      set(pv, c) { if (cities[pv] && cities[pv].includes(c)) { sel.value = pv; input.disabled = false; input.value = c; } }
    };
  }

  /* سیاست رمز عبور (فقط برای ثبت‌نام): بیشتر از ۸ کاراکتر + حرف بزرگ و کوچک انگلیسی + یک نماد */
  const MIN_PASS = 9;
  function passwordProblem(pw) {
    const miss = [];
    if (pw.length < MIN_PASS) miss.push(`حداقل ${faDigits(MIN_PASS)} کاراکتر`);
    if (!/[a-z]/.test(pw)) miss.push("یک حرف کوچک انگلیسی");
    if (!/[A-Z]/.test(pw)) miss.push("یک حرف بزرگ انگلیسی");
    if (!/[^A-Za-z0-9\s]/.test(pw)) miss.push("یک نماد (مثل ! @ # $ %)");
    return miss.length ? "رمز عبور باید شامل این موارد باشد: " + miss.join("، ") + "." : "";
  }
  function isValidPhone(p) { return /^09\d{9}$/.test(p); }

  function initAccountPage() {
    const nextUrl = new URLSearchParams(location.search).get("next") || "index.html";
    const guestBox = $("#auth-guest");
    const profileBox = $("#auth-profile");

    function showProfile() {
      const u = AUTH.currentUser();
      if (!u) return;
      guestBox.hidden = true;
      profileBox.hidden = false;
      $("#profile-name").textContent = `${u.name} ${u.family}`;
      $("#profile-phone").textContent = u.phone;
      $("#profile-city").textContent = u.city ? (u.province ? u.province + "، " : "") + u.city : "—";
      $("#profile-address").textContent = u.address || "—";
      $("#profile-next").href = nextUrl;
    }
    if (AUTH.isLoggedIn()) { showProfile(); return; } // برای مهمان ادامه می‌دهیم

    // --- تب‌های ورود/ثبت‌نام ---
    function activateTab(name) {
      $$(".auth-tab").forEach(t => { const on = t.dataset.tab === name; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", String(on)); });
      $$(".auth-panel").forEach(p => p.classList.toggle("is-active", p.dataset.panel === name));
    }
    $$(".auth-tab").forEach(t => t.addEventListener("click", () => activateTab(t.dataset.tab)));
    $$("[data-goto-tab]").forEach(b => b.addEventListener("click", () => activateTab(b.dataset.gotoTab)));

    // --- نمایش/مخفی‌کردن رمز عبور ---
    $$("[data-action='toggle-pass']").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.previousElementSibling;
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.querySelector("use").setAttribute("href", showing ? "#i-eye" : "#i-eye-off");
      });
    });

    function showError(id, msg) { const el = $(id); el.textContent = msg; el.hidden = false; }
    function hideError(id) { $(id).hidden = true; }

    // --- پنل ورود ---
    $("#panel-login").addEventListener("submit", (e) => {
      e.preventDefault();
      hideError("#login-error");
      const phone = toEnDigits($("#login-phone").value.trim());
      const password = $("#login-password").value;
      if (!isValidPhone(phone)) { showError("#login-error", "شماره موبایل معتبر نیست (باید با ۰۹ شروع شود و ۱۱ رقم باشد)."); return; }
      const res = AUTH.login(phone, password);
      if (!res.ok) {
        showError("#login-error", res.reason === "notfound" ? "حسابی با این شماره ثبت نشده است. لطفاً ابتدا ثبت‌نام کنید." : "رمز عبور اشتباه است.");
        return;
      }
      toast(`${res.user.name} جان، خوش آمدید.`);
      renderAuthUI();
      location.href = nextUrl;
    });

    // --- پنل ثبت‌نام: گام‌ها ---
    let currentPhone = "";
    function goStep(step) { $$(".auth-step").forEach(s => s.classList.toggle("is-active", s.dataset.step === step)); }

    let countdownTimer = null;
    function startCountdown(seconds) {
      const el = $("#otp-countdown");
      const resend = $("#otp-resend");
      resend.hidden = true;
      clearInterval(countdownTimer);
      let left = seconds;
      const tick = () => {
        el.textContent = left > 0 ? `ارسال مجدد کد تا ${fa(left)} ثانیه دیگر` : "";
        if (left <= 0) { clearInterval(countdownTimer); resend.hidden = false; }
        left--;
      };
      tick();
      countdownTimer = setInterval(tick, 1000);
    }

    function requestOtp() {
      hideError("#signup-phone-error");
      const phone = toEnDigits($("#signup-phone").value.trim());
      if (!isValidPhone(phone)) { showError("#signup-phone-error", "شماره موبایل معتبر نیست (باید با ۰۹ شروع شود و ۱۱ رقم باشد)."); return; }
      if (AUTH.getUser() && AUTH.getUser().phone === phone) {
        showError("#signup-phone-error", "این شماره قبلاً ثبت‌نام کرده؛ از تب «ورود» استفاده کنید.");
        return;
      }
      currentPhone = phone;
      const code = AUTH.sendOtp(phone);
      $("#otp-demo-note").innerHTML = `چون این نسخه‌ی نمایشی بدون سرویس پیامک واقعی است، کد تایید همین‌جا نشان داده می‌شود:<strong dir="ltr">${code}</strong>`;
      $$(".otp-box").forEach(b => b.value = "");
      hideError("#otp-error");
      goStep("otp");
      startCountdown(120);
      setTimeout(() => $(".otp-box").focus(), 50);
    }
    $("[data-action='send-otp']").addEventListener("click", requestOtp);
    $("#otp-resend").addEventListener("click", requestOtp);

    // --- جعبه‌های کد تایید: پیشروی خودکار ---
    const otpBoxes = $$(".otp-box");
    otpBoxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        box.value = toEnDigits(box.value).replace(/\D/g, "").slice(0, 1);
        if (box.value && otpBoxes[i + 1]) otpBoxes[i + 1].focus();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && otpBoxes[i - 1]) otpBoxes[i - 1].focus();
      });
      box.addEventListener("paste", (e) => {
        const text = toEnDigits((e.clipboardData || window.clipboardData).getData("text")).replace(/\D/g, "");
        if (text.length) { e.preventDefault(); text.slice(0, 4).split("").forEach((ch, k) => { if (otpBoxes[k]) otpBoxes[k].value = ch; }); (otpBoxes[Math.min(text.length, 4) - 1] || otpBoxes[3]).focus(); }
      });
    });

    $("[data-action='verify-otp']").addEventListener("click", () => {
      hideError("#otp-error");
      const code = otpBoxes.map(b => b.value).join("");
      if (code.length < 4) { showError("#otp-error", "کد ۴ رقمی را کامل وارد کنید."); return; }
      const res = AUTH.verifyOtp(currentPhone, code);
      if (!res.ok) {
        showError("#otp-error", res.reason === "expired" ? "کد منقضی شده؛ دوباره درخواست دهید." : "کد وارد شده درست نیست.");
        return;
      }
      clearInterval(countdownTimer);
      goStep("profile");
      setTimeout(() => $("#signup-name").focus(), 50);
    });

    const cityPick = initCityPicker("signup");
    // --- گام ۳: تکمیل ثبت‌نام ---
    $("#panel-signup").addEventListener("submit", (e) => {
      e.preventDefault();
      hideError("#signup-error");
      const name = $("#signup-name").value.trim();
      const family = $("#signup-family").value.trim();
      const place = cityPick && cityPick.get();
      const address = $("#signup-address").value.trim();
      const password = $("#signup-password").value;
      const password2 = $("#signup-password2").value;
      if (!name || !family) { showError("#signup-error", "نام و نام خانوادگی را وارد کنید."); return; }
      if (!place) { showError("#signup-error", "استان را انتخاب کنید و شهر را از فهرست پیشنهادی برگزینید."); return; }
      if (!address) { showError("#signup-error", "آدرس را وارد کنید."); return; }
      const pwErr = passwordProblem(password);
      if (pwErr) { showError("#signup-error", pwErr); return; }
      if (password !== password2) { showError("#signup-error", "رمز عبور و تکرار آن یکسان نیستند."); return; }
      const user = AUTH.registerUser({ phone: currentPhone, name, family, province: place.province, city: place.city, address, password });
      toast(`ثبت‌نام شما تکمیل شد، ${user.name}!`);
      renderAuthUI();
      location.href = nextUrl;
    });
  }
  if (PAGE === "account") initAccountPage();

  /* ---------- صفحه تسویه‌حساب ---------- */
  function initCheckoutPage() {
    const formView = $("#checkout-form-view");
    const successView = $("#order-success-view");
    const emptyView = $("#empty-cart-view");

    if (cartCount() === 0) { formView.hidden = true; emptyView.hidden = false; return; }

    /* خرید بدون ثبت‌نام: آدرس دفعه‌ی قبل (فقط در همین مرورگر) یا اطلاعات حساب نمایشی را پیش‌فرض می‌گذاریم */
    const u = AUTH.currentUser(), sv = storage("njk_ship", null) || (u && { name: `${u.name} ${u.family}`.trim(), phone: u.phone, province: u.province, city: u.city, address: u.address }) || {};
    $("#co-name").value = sv.name || "";
    $("#co-phone").value = sv.phone || "";
    const cityPick = initCityPicker("co");
    if (cityPick && sv.province) cityPick.set(sv.province, sv.city);
    $("#co-address").value = sv.address || "";

    const deliveryDate = estimateDeliveryDate(3);
    $("#delivery-date").textContent = formatJalali(deliveryDate, true);

    // --- خلاصه سفارش ---
    const itemsList = $("#checkout-items");
    itemsList.innerHTML = "";
    Object.entries(state.cart).forEach(([id, qty]) => {
      const r = parseKey(id); if (!r) return;
      const p = r.p;
      const li = document.createElement("li");
      li.className = "line-item";
      li.innerHTML = `
        <div class="line-item__thumb">${productMedia(p, 80, 80)}</div>
        <div class="line-item__body">
          <div class="line-item__top">
            <div><p class="line-item__name">${p.name}</p><p class="line-item__weight">${weightLabel(r.g)} × ${fa(qty)}</p></div>
          </div>
          <div class="line-item__bottom">
            <span></span>
            <span class="line-item__price">${fa(unitPrice(p, r.g) * qty)} تومان</span>
          </div>
        </div>`;
      itemsList.appendChild(li);
    });
    const subtotal = cartSubtotal();
    const shipping = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : SHIP_COST;
    $("#co-subtotal").textContent = fa(subtotal) + " تومان";
    $("#co-shipping").textContent = shipping ? fa(shipping) + " تومان" : "رایگان";
    $("#co-total").textContent = fa(subtotal + shipping) + " تومان";

    $("#checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const errEl = $("#co-error");
      errEl.hidden = true;
      const name = $("#co-name").value.trim();
      const phone = toEnDigits($("#co-phone").value.trim());
      const place = cityPick && cityPick.get();
      const address = $("#co-address").value.trim();
      const showCheckoutError = (message, selector) => {
        errEl.textContent = message;
        errEl.hidden = false;
        $(selector).focus();
      };
      if (!name) { showCheckoutError("نام گیرنده را وارد کنید.", "#co-name"); return; }
      if (!isValidPhone(phone)) { showCheckoutError("شماره تماس معتبر نیست.", "#co-phone"); return; }
      if (!place) {
        const selector = $("#co-province").value ? "#co-city" : "#co-province";
        showCheckoutError("استان را انتخاب کنید و شهر را از فهرست پیشنهادی برگزینید.", selector);
        return;
      }
      if (!address) { showCheckoutError("آدرس کامل را وارد کنید.", "#co-address"); return; }

      /* ثبت واقعی سفارش در سرور؛ قیمت‌ها را سرور خودش دوباره محاسبه می‌کند */
      const btn = $("#checkout-form [type=submit]");
      const items = Object.entries(state.cart).map(([k, q]) => { const r = parseKey(k); return r && { id: r.p.id, g: r.g, q }; }).filter(Boolean);
      btn.disabled = true;
      fetch(window.njkApiUrl("api/order"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, phone, province: place.province, city: place.city, address, items }) })
        .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok && j.ok, j })))
        .catch(() => ({ ok: false, j: {} }))
        .then(({ ok, j }) => {
          btn.disabled = false;
          if (!ok) { errEl.textContent = j.error || "ثبت سفارش انجام نشد. اینترنت خود را بررسی کنید یا با فروشگاه تماس بگیرید."; errEl.hidden = false; return; }
          $("#order-number").textContent = j.code;
          save("njk_ship", { name, phone, province: place.province, city: place.city, address });
          save("njk_last_order", { code: j.code, phone });
          $("#order-track-link").href = "track.html?c=" + encodeURIComponent(j.code);
          $("#order-delivery-date").textContent = formatJalali(deliveryDate, true);
          state.cart = {};
          save("njk_cart_v2", state.cart);
          updateCounts();
          formView.hidden = true;
          successView.hidden = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast("سفارش شما ثبت شد!");
        });
    });
  }
  if (PAGE === "checkout") initCheckoutPage();

  /* =============================================================
     ارتقاها (همه سمت کاربر، بدون سرور و بدون وابستگی):
     ارتباط سریع، یادآور ضمانت در سبد، نظر خریداران، باشگاه مشتریان.
     شماره تلفن و تلگرام از لینک‌های فوتر خوانده می‌شود تا فقط یک جا ویرایش شود.
     ============================================================= */
  const CONTACT = (() => {
    const tel = $('.footer__contact a[href^="tel:"]'), tg = $('.footer .socials a[aria-label="تلگرام"]'), h = tg ? tg.getAttribute("href") : "";
    return { tel: tel ? tel.getAttribute("href") : "", telText: tel ? tel.textContent.trim() : "", tg: /^https:\/\/(t|telegram)\.me\/\S+$/i.test(h) ? h : "" };
  })();

  /* ---------- ارتباط سریع: دکمه‌ی گرد در گوشه‌ی صفحه (هاور در دسکتاپ، لمس در موبایل) ----------
     آیدی و لینک همه‌ی شبکه‌های اجتماعی + تلفن؛ هر کدام با آیکون و رنگ خودش */
  (function () {
    const tel = CONTACT.tel || "tel:+989028814429", telText = CONTACT.telText || "۰۹۰۲-۸۸۱-۴۴۲۹";
    const SOC = [
      ["eitaa",    "ایتا",    "@naqshe_jahan",        "https://eitaa.com/naqshe_jahan",           "eitaa.svg"],
      ["telegram", "تلگرام",  "@naqshe_jahan_nut",    "https://t.me/naqshe_jahan_nut",            "telegram.svg"],
      ["bale",     "بله",     "@NAQSHEJAHAN_Nuts",    "https://ble.ir/NAQSHEJAHAN_Nuts",          "bale.svg"],
      ["basalam",  "باسلام",  "khoshkbarnaghshejahan","https://basalam.com/khoshkbarnaghshejahan", "basalam.webp"]
    ];
    const row = (cls, href, ico, label, sub, ext, i) => `<a class="qc__btn ${cls}" style="--i:${i}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="qc__ico">${ico}</span><span class="qc__txt"><b>${label}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></a>`;
    const rows = SOC.map((x, i) => row("qc__btn--" + x[0], x[3], `<img src="assets/img/social/${x[4]}" width="28" height="28" alt="" loading="lazy" decoding="async">`, x[1], x[2], 1, i)).join("")
      + row("qc__btn--tel", tel, '<svg class="icon" aria-hidden="true"><use href="#i-phone"/></svg>', "تماس تلفنی", telText, 0, SOC.length);
    const w = document.createElement("div");
    w.className = "qc";
    w.innerHTML = `<div class="qc__list" id="qc-list" role="group" aria-label="راه‌های ارتباط با فروشگاه"></div><button class="qc__fab" type="button" aria-expanded="false" aria-controls="qc-list" aria-label="ارتباط سریع با فروشگاه"><svg class="icon" aria-hidden="true"><use href="#i-headset"/></svg></button>`;
    const fab = $(".qc__fab", w), ico = $("use", fab);
    /* آیکون‌ها فقط وقتی لیست اولین بار لمس/باز شد ساخته و دانلود می‌شوند (صفر بایت اضافه در بارگذاری صفحه) */
    let built = false;
    const build = () => { if (built) return; built = true; $(".qc__list", w).innerHTML = rows; };
    ["pointerenter", "focusin", "touchstart"].forEach((ev) => w.addEventListener(ev, build, { once: true, passive: true }));
    const setOpen = (o) => { if (o) build(); w.classList.toggle("is-open", o); fab.setAttribute("aria-expanded", String(o)); ico.setAttribute("href", o ? "#i-close" : "#i-headset"); };
    fab.addEventListener("click", () => setOpen(!w.classList.contains("is-open")));
    document.addEventListener("click", (e) => { if (!w.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && w.classList.contains("is-open")) { setOpen(false); fab.focus(); } });
    document.body.appendChild(w);
    let overlapFrame = 0;
    const syncQuickContact = () => {
      overlapFrame = 0;
      const fabRect = fab.getBoundingClientRect();
      const overlapsCard = $$(".product-card").some((card) => {
        const r = card.getBoundingClientRect();
        return r.left < fabRect.right && r.right > fabRect.left && r.top < fabRect.bottom && r.bottom > fabRect.top;
      });
      if (overlapsCard && w.classList.contains("is-open")) setOpen(false);
      w.classList.toggle("is-overlapping", overlapsCard);
    };
    const scheduleContactSync = () => {
      if (!overlapFrame) overlapFrame = requestAnimationFrame(syncQuickContact);
    };
    window.addEventListener("scroll", scheduleContactSync, { passive: true });
    window.addEventListener("resize", scheduleContactSync);
    $$(".product-grid").forEach((grid) => new MutationObserver(scheduleContactSync).observe(grid, { childList: true }));
    syncQuickContact();
  })();

  /* ---------- سبد خرید: یادآور شرایط ضمانت (متن همان «سوالات متداول» است) + یادآوری یک‌باره‌ی سبد در بازگشت ---------- */
  (function () {
    const tot = $("#cart-foot .totals");
    if (tot) tot.insertAdjacentHTML("afterend", `<p class="cart-trust"><svg class="icon icon--sm icon--gold" aria-hidden="true"><use href="#i-shield"/></svg><span>کالای آسیب‌دیده یا فاسد؟ تعویض یا بازگشت وجه. <a href="${PAGE === "home" ? "" : "index.html"}#guarantee" data-action="close">شرایط ضمانت</a></span></p>`);
    try {
      if (PAGE !== "checkout" && cartCount() && !sessionStorage.getItem("njk_cart_hint")) {
        sessionStorage.setItem("njk_cart_hint", "1");
        setTimeout(() => toast(`سبد خرید شما با ${fa(cartCount())} کالا منتظر شماست`), 1200);
      }
    } catch (e) {}
  })();

  /* ---------- نظر خریداران ----------
     نظرهای عمومی فقط از reviews.json می‌آیند (نظر واقعی و تأییدشده توسط فروشگاه): [{"n":"نام","r":5,"t":"متن","d":"تاریخ","p":"محصول"}]
     نظر تازه‌ی بازدیدکننده فقط در localStorage همان مرورگر می‌ماند و در امتیاز عمومی حساب نمی‌شود. */
  const MY_KEY = "njk_my_reviews_v1";
  /* نظرهای منتشرشده (reviews.json) برای بخش نظرات صفحه‌ی اصلی و «مشاهده سریع» محصول؛ فقط یک‌بار و هنگام نیاز بارگیری می‌شود.
     هر نظر می‌تواند "pid" (شناسه‌ی محصول) داشته باشد. "demo": true یعنی نمونه‌ی آزمایشی و با برچسب نمایش داده می‌شود. */
  const rvStars = (r) => [1, 2, 3, 4, 5].map(i => `<svg class="icon icon--fill${i > Math.round(r) ? " is-off" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("");
  const rvItem = (v, mi) => `<li class="rv${mi > -1 ? " rv--mine" : ""}"><div class="rv__head"><span class="rv__av" aria-hidden="true">${esc((v.n || "خ").charAt(0))}</span><div class="rv__who"><b>${esc(v.n || "خریدار")}</b><small>${esc(v.d)}${(v.p || (v.pid && (findProduct(v.pid) || {}).name)) ? (v.d ? " — " : "") + esc(v.p || findProduct(v.pid).name) : ""}</small></div>${v.demo ? '<span class="chip">نمونه آزمایشی</span>' : ""}<span class="stars-row" role="img" aria-label="امتیاز ${fa(v.r)} از ۵">${rvStars(v.r)}</span></div><p>${esc(v.t)}</p>${mi > -1 ? `<div class="rv__mine"><span class="chip">${v.s ? "ارسال شد؛ پس از بررسی منتشر می‌شود" : "فقط در این مرورگر ذخیره شده"}</span>${v.s ? "" : `<button class="link-btn" type="button" data-rv-send="${mi}">ارسال برای فروشگاه</button>`}</div>` : ""}</li>`;
  const rvClean = (a) => (Array.isArray(a) ? a : []).filter(v => v && v.t && v.r >= 1 && v.r <= 5).map(v => ({ n: String(v.n || "").slice(0, 30), r: Math.round(v.r), t: String(v.t).slice(0, 500), d: String(v.d || "").slice(0, 20), p: String(v.p || "").slice(0, 40), pid: String(v.pid || "").slice(0, 20), demo: v.demo === true }));
  let REVP = null;
  const loadReviews = () => REVP || (REVP = fetch(window.njkApiUrl("reviews.json")).then(r => (r.ok ? r.json() : [])).catch(() => []).then(rvClean));
  (function () {
    const box = $("#reviews"); if (!box) return;
    let pub = [], shown = 6, mine = storage(MY_KEY, []);
    if (!Array.isArray(mine)) mine = [];
    function renderPub() {
      const n = pub.length, avg = n ? pub.reduce((s, v) => s + v.r, 0) / n : 0;
      $("#rv-score").textContent = n ? avg.toLocaleString("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
      $("#rv-stars").innerHTML = n ? rvStars(avg) : "";
      $("#rv-count").textContent = n ? `بر اساس ${fa(n)} نظر ثبت‌شده${pub.some(v => v.demo) ? " (شامل نمونه‌ی آزمایشی)" : ""}` : "هنوز نظری منتشر نشده است. اولین نظر را شما بنویسید.";
      $("#rv-list").innerHTML = pub.slice(0, shown).map(v => rvItem(v, -1)).join("");
      $("#rv-more").hidden = n <= shown;
    }
    const renderMine = () => { $("#rv-mine").innerHTML = mine.map((v, i) => rvItem(v, i)).join(""); };
    let loaded = false;
    function load() {
      if (loaded) return; loaded = true;
      loadReviews().then(a => { pub = a; renderPub(); });
    }
    if ("IntersectionObserver" in window) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); load(); } }, { rootMargin: "600px" }).observe(box); else load();
    $("#rv-more").addEventListener("click", () => { shown += 6; renderPub(); });
    renderMine();
    $("#rv-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget, r = +((f.querySelector("input[name=rv-r]:checked") || {}).value || 0), t = $("#rv-text").value.trim(), err = $("#rv-err");
      const bad = !r ? "امتیاز خود را با انتخاب ستاره‌ها مشخص کنید." : t.length < 10 ? "متن نظر را بنویسید (دست‌کم ۱۰ حرف)." : "";
      err.hidden = !bad; err.textContent = bad;
      if (bad) return;
      mine = [{ n: $("#rv-name").value.trim().slice(0, 30), r, t: t.slice(0, 400), d: formatJalali(new Date()) }].concat(mine).slice(0, 5);
      save(MY_KEY, mine); f.reset(); renderMine();
      toast("نظر شما در همین مرورگر ذخیره شد");
      clubCheck();
      const en = mine[0]; /* ارسال برای بررسی؛ اگر سرور در دسترس نبود، نظر فقط محلی می‌ماند */
      fetch(window.njkApiUrl("api/review"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: en.n, rating: en.r, text: en.t }) })
        .then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.ok) { en.s = 1; save(MY_KEY, mine); renderMine(); toast("نظر شما ارسال شد و پس از بررسی منتشر می‌شود"); } }).catch(() => {});
    });
    /* بدون سرور، تنها راه رسیدن نظر به فروشگاه همین است: کپی متن + باز کردن تلگرام فروشگاه (اگر در فوتر تنظیم شده باشد) */
    $("#rv-mine").addEventListener("click", (e) => {
      const b = e.target.closest("[data-rv-send]"), v = b && mine[+b.dataset.rvSend];
      if (!v) return;
      const msg = `نظر خریدار درباره‌ی خشکبار نقش جهان\nامتیاز: ${fa(v.r)} از ۵\n${v.n ? "نام: " + v.n + "\n" : ""}${v.t}`;
      try { navigator.clipboard.writeText(msg).catch(() => {}); } catch (x) {}
      if (CONTACT.tg) { window.open(CONTACT.tg, "_blank", "noopener"); toast("متن نظر کپی شد؛ در تلگرام برای ما بفرستید"); }
      else toast("متن نظر کپی شد؛ از راه‌های تماس پایین صفحه برای ما بفرستید");
    });
  })();

  /* ---------- باشگاه مشتریان: پیشنهاد ویژه‌ی روز (از قیمت‌های واقعی) + نشان‌های وفاداری (فقط در مرورگر کاربر) ---------- */
  const CLUB_KEY = "njk_club_v1";
  const club = Object.assign({ d: [], v: [], b: [] }, storage(CLUB_KEY, null) || {});
  ["d", "v", "b"].forEach(k => { if (!Array.isArray(club[k])) club[k] = []; });
  const today = new Date().toISOString().slice(0, 10);
  if (!club.d.includes(today)) club.d = club.d.concat(today).slice(-10);
  const BADGES = [
    { id: "back", i: "i-star", t: "همراه همیشگی", d: "در ۳ روز مختلف به نقش جهان سر زده‌اید", n: 3, get: () => club.d.length },
    { id: "see", i: "i-eye", t: "کاوشگر طعم‌ها", d: "۵ محصول را از نزدیک دیده‌اید", n: 5, get: () => club.v.length },
    { id: "fav", i: "i-heart", t: "خوش‌سلیقه", d: "۳ محصول را به علاقه‌مندی‌ها افزوده‌اید", n: 3, get: () => state.wishlist.length },
    { id: "voice", i: "i-user", t: "صدای مشتری", d: "نظر خود را نوشته‌اید", n: 1, get: () => { const m = storage(MY_KEY, []); return Array.isArray(m) ? m.length : 0; } }
  ];
  function clubCheck() {
    BADGES.forEach(b => { if (!club.b.includes(b.id) && b.get() >= b.n) { club.b.push(b.id); toast(`نشان «${b.t}» برای شما باز شد`); } });
    save(CLUB_KEY, club); renderClub();
  }
  function clubView(id) { if (!club.v.includes(id)) { club.v = club.v.concat(id).slice(-30); clubCheck(); } }
  function renderClub() {
    const ul = $("#club-badges"); if (!ul) return;
    ul.innerHTML = BADGES.map(b => {
      const on = club.b.includes(b.id), have = Math.min(b.get(), b.n);
      return `<li class="cb${on ? " is-on" : ""}"><span class="cb__ico"><svg class="icon" aria-hidden="true"><use href="#${b.i}"/></svg></span><div><h3>${b.t}</h3><p>${b.d}</p>${on ? '<span class="cb__done"><svg class="icon icon--sm" aria-hidden="true"><use href="#i-check"/></svg>باز شد</span>' : `<div class="cb__bar" role="progressbar" aria-label="${b.t}" aria-valuemin="0" aria-valuemax="${b.n}" aria-valuenow="${have}"><i style="width:${have / b.n * 100}%"></i></div><small>${fa(have)} از ${fa(b.n)}</small>`}</div></li>`;
    }).join("");
  }
  /* پیشنهادهای ویژه: همه‌ی محصولات دارای قیمت قدیمی (از قیمت‌های واقعی)، با فلش، سوایپ و تعویض خودکار.
     فاصله‌ی تعویض خودکار (میلی‌ثانیه) را همین‌جا عوض کنید. */
  (function () {
    const host = $("#club-offer"); if (!host) return;
    const SLIDE_MS = 8000;
    const list = PRODUCTS.filter(p => p.price != null && p.old && p.old > p.price), n = list.length;
    if (!n) { host.remove(); return; }
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, canHover = matchMedia("(hover: hover)").matches;
    let cur = Math.floor(Date.now() / 864e5) % n, holdUntil = 0, onScreen = false;
    host.innerHTML = `<div class="club__slide"></div>${n > 1 ? `<div class="club__ctl"><div class="club__nav"><button type="button" data-o="-1" aria-label="پیشنهاد قبلی"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button><button type="button" data-o="1" aria-label="پیشنهاد بعدی"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button></div><span class="club__count"></span></div>` : ""}`;
    const slide = $(".club__slide", host), count = $(".club__count", host);
    function paint() {
      const p = list[cur], g = defG(p), x = (INFOD && INFOD[p.id]) || {};
      const desc = x.desc || `${CATEGORY_LABEL[p.cat]}؛ موجود در وزن‌های ${weightsOf(p).map(w => w.label).reverse().join("، ")}.`;
      slide.innerHTML = `<div class="club__media">${productMedia(p, 132, 132)}</div><div class="club__txt"><p class="club__tag">پیشنهاد ویژه</p><h3>${esc(p.name)}</h3><p class="club__desc">${esc(desc)}</p><p class="club__sub">${weightLabel(g)}</p><div class="club__price">${oldPriceHTML(p, g)}<span class="price-now"><b>${fa(unitPrice(p, g))}</b><span>تومان</span></span></div><div class="club__act"><button class="btn btn--primary btn--sm" type="button" data-offer="add">افزودن به سبد</button><button class="btn btn--ghost btn--sm" type="button" data-offer="view">جزئیات محصول</button></div></div>`;
      if (count) count.textContent = `${fa(cur + 1)} از ${fa(n)}`;
    }
    function go(i) {
      const next = (i + n) % n;
      if (calm) { cur = next; paint(); return; }
      slide.classList.add("is-out");
      setTimeout(() => { cur = next; paint(); slide.classList.remove("is-out"); }, 180);
    }
    paint();
    host.hidden = false;
    host.addEventListener("click", (e) => {
      const nv = e.target.closest("[data-o]");
      if (nv) { holdUntil = Date.now() + 20000; go(cur + +nv.dataset.o); return; }
      const b = e.target.closest("[data-offer]"); if (!b) return;
      holdUntil = Date.now() + 20000;
      const p = list[cur];
      if (b.dataset.offer === "view") openQuickView(p.id);
      else if (addToCart(p.id, defG(p), 1)) toast(`«${p.name}» به سبد خرید افزوده شد`);
    });
    /* سوایپ در موبایل: کشیدن به چپ = بعدی (جهت راست‌به‌چپ) */
    let sx = null;
    host.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    host.addEventListener("touchend", (e) => {
      if (sx == null || n < 2) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 45) { holdUntil = Date.now() + 20000; go(cur + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
    /* توضیحات محصول از product-info.json؛ فقط وقتی این بخش نزدیک صفحه می‌شود بارگیری می‌شود */
    const sec = $("#club");
    if ("IntersectionObserver" in window && sec) new IntersectionObserver((es) => {
      onScreen = es[0].isIntersecting;
      if (onScreen && !INFOD) loadInfo().then(paint);
    }, { rootMargin: "300px" }).observe(sec); else { onScreen = true; loadInfo().then(paint); }
    if (!calm && n > 1) setInterval(() => {
      if (!onScreen || document.hidden || Date.now() < holdUntil) return;
      if (canHover && host.matches(":hover")) return;
      if (host.contains(document.activeElement)) return;
      go(cur + 1);
    }, SLIDE_MS);
  })();
  clubCheck();

  renderCart();
  renderWishlist();
  updateCounts();
  renderAuthUI();
}

/* بارگذاری قیمت‌ها از products.json.
   درخواست را loader.js همان اول صفحه شروع کرده (window.__njkProducts)؛ اینجا فقط از همان استفاده می‌شود.
   اگر تا ۱٫۵ ثانیه نرسید، با آخرین قیمت‌های ذخیره‌شده یا داده‌ی داخلی ادامه می‌دهیم. */
(function () {
  const KEY = "njk_prices_v1", CKEY = "njk_cats_v1";
  let done = false, t, timeout;
  const GRID = document.querySelector("#product-grid");
  const good = (l) => Array.isArray(l) && l.length > 0; // آرایه‌ی خالی یا خراب = بارگذاری ناموفق
  const showLoading = () => {
    if (!GRID) return;
    GRID.innerHTML = Array.from({ length: 8 }, () => `
      <li class="product-skeleton" aria-hidden="true">
        <div class="product-skeleton__media"></div>
        <div class="product-skeleton__line product-skeleton__line--short"></div>
        <div class="product-skeleton__line"></div>
        <div class="product-skeleton__line product-skeleton__line--price"></div>
      </li>`).join("");
  };
  showLoading();
  const goodC = (c) => !!c && Array.isArray(c.cats);     // فایل دسته‌ها: {"cats":[...]}
  const lastKnown = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
  const lastCats = () => { try { const c = JSON.parse(localStorage.getItem(CKEY) || "null"); return goodC(c) ? c : null; } catch (e) { return null; } };
  /* اگر محصولات به هیچ شکلی (نه از شبکه، نه از آخرین نسخه‌ی ذخیره‌شده) نرسید، پیام روشن نشان بده، نه «محصولی یافت نشد» */
  function loadError() {
    document.querySelectorAll("[data-count]").forEach((e) => { e.textContent = ""; });
    const g = document.querySelector("#product-grid"); if (!g) return;
    g.innerHTML = `<li class="no-results"><p class="no-results__msg">${location.protocol === "file:" ? "این سایت را باید از آدرس اینترنتی (یا یک وب‌سرور محلی) باز کنید؛ باز کردن مستقیمِ فایل، محصولات را بارگذاری نمی‌کند." : "بارگذاری محصولات انجام نشد. اتصال اینترنت را بررسی کنید و مجدداً تلاش کنید."}</p><button type="button" class="btn btn--primary">تلاش مجدد</button></li>`;
    g.querySelector("button").addEventListener("click", () => location.reload());
  }
  const go = (list, cats) => {
    if (done) return; done = true; clearTimeout(t); clearTimeout(timeout);
    boot(list, cats);
    if (!good(list)) loadError();
    window.__njkBooted = true;
    document.dispatchEvent(new Event("njk:booted"));
  };
  t = setTimeout(() => { const l = lastKnown(); if (good(l)) go(l, lastCats()); }, 1500); // بدون کش قبلی، منتظر خود فایل می‌مانیم
  timeout = setTimeout(() => { if (!done) go([], lastCats()); }, 10000);
  /* آدرس‌های ثابت اجازه می‌دهند کش مرورگر و کش لبه پاسخ‌های عمومی را نگه دارند. */
  const req = window.__njkProducts ||
    fetch(window.njkApiUrl("products.json")).then((r) => (r.ok ? r.json() : null));
  const creq = window.__njkCats ||
    fetch("categories.json").then((r) => (r.ok ? r.json() : null), () => null);
  const fallback = () => (good(lastKnown()) ? lastKnown() : []);
  Promise.all([req, creq]).then(([list, cats]) => {
    if (good(list)) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
    if (goodC(cats)) { try { localStorage.setItem(CKEY, JSON.stringify(cats)); } catch (e) {} }
    go(good(list) ? list : fallback(), goodC(cats) ? cats : lastCats());
  }, () => go(fallback(), lastCats()));
})();

/* آکاردئون سوالات متداول: هر بار فقط یک پاسخ باز می‌ماند */
(function () {
  const items = document.querySelectorAll(".faq__item");
  if (!items.length) return;
  const set = (it, open) => {
    it.classList.toggle("is-open", open);
    it.querySelector(".faq__q").setAttribute("aria-expanded", open);
  };
  items.forEach((it) => it.querySelector(".faq__q").addEventListener("click", () => {
    const willOpen = !it.classList.contains("is-open");
    items.forEach((o) => set(o, o === it && willOpen));
  }));
})();

/* بازخورد زنده‌ی رمز عبور در ثبت‌نام: رنگ حلقه، آیکون قفل و چک‌لیست شرایط. اعتبارسنجی نهایی همچنان با passwordProblem است. */
(function () {
  var pw = document.querySelector("#signup-password"), pw2 = document.querySelector("#signup-password2");
  if (!pw || !pw2) return;
  var box = pw.closest(".field__box"), box2 = pw2.closest(".field__box"), msg = document.querySelector("#pw-match");
  var chips = document.querySelectorAll("#pw-rules [data-rule]");
  var tests = {
    len: function (v) { return v.length > 8; },
    lower: function (v) { return /[a-z]/.test(v); },
    upper: function (v) { return /[A-Z]/.test(v); },
    sym: function (v) { return /[^A-Za-z0-9\s]/.test(v); }
  };
  var t1 = false, t2 = false;
  function render() {
    var v = pw.value, v2 = pw2.value, ok = true;
    chips.forEach(function (c) {
      var m = tests[c.dataset.rule](v);
      if (!m) ok = false;
      c.classList.toggle("is-met", m);
      c.classList.toggle("is-miss", !m && t1);
    });
    box.classList.toggle("is-good", ok);
    box.classList.toggle("is-bad", !ok && t1);
    pw.setAttribute("aria-invalid", !ok && t1);
    var same = v !== "" && v === v2;
    box2.classList.toggle("is-good", same);
    box2.classList.toggle("is-bad", !same && t2);
    pw2.setAttribute("aria-invalid", !same && t2);
    msg.hidden = !(same || (t2 && v2 !== ""));
    msg.classList.toggle("is-ok", same);
    msg.textContent = same ? "رمز عبور و تکرار آن یکسان است." : "رمز عبور و تکرار آن یکسان نیستند.";
  }
  pw.addEventListener("input", render);
  pw2.addEventListener("input", render);
  pw.addEventListener("focus", function () { t1 = true; render(); });
  pw2.addEventListener("focus", function () { t2 = true; render(); });
  if (pw.form) pw.form.addEventListener("submit", function () { t1 = t2 = true; render(); });
})();

/* انیمیشن تایپ در placeholder فیلد رمز عبور ثبت‌نام: فقط متن را عوض می‌کند (بدون عنصر یا CSS اضافه) و با setTimeout پیش می‌رود. */
(function () {
  var pw = document.querySelector("#signup-password");
  if (!pw) return;
  var S = ["رمزی بسازید که فقط خودتان بدانید", "بیشتر از ۸ کاراکتر انتخاب کنید", "امنیت حساب شما مهم است"];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { pw.placeholder = S[0]; return; }
  var s = 0, i = 0, del = false, t;
  function tick() {
    if (document.hidden || !pw.offsetParent) { t = setTimeout(tick, 500); return; }
    var w = S[s], d = 70;
    if (!del) {
      pw.placeholder = w.slice(0, ++i);
      if (i === w.length) { del = true; d = 1600; }
    } else {
      pw.placeholder = w.slice(0, --i);
      d = 35;
      if (!i) { del = false; s = (s + 1) % S.length; d = 400; }
    }
    t = setTimeout(tick, d);
  }
  pw.addEventListener("focus", function () { clearTimeout(t); pw.placeholder = ""; });
  pw.addEventListener("blur", function () { if (!pw.value) { i = 0; del = false; tick(); } });
  tick();
})();

