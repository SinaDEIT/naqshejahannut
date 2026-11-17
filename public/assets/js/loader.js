/* پیش‌بارگذاری سبک داده‌های فروشگاه؛ نمایش صفحه به این درخواست‌ها وابسته نیست. */
(function () {
  "use strict";

  // Public Railway API origin; set this after creating the Railway service.
  window.NJK_API_BASE = window.NJK_API_BASE || "";
  window.njkApiUrl = function (path) {
    return new URL("/" + String(path).replace(/^\/+/, ""), window.NJK_API_BASE || location.origin).href;
  };

  var page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
  var hasApp = /^(index|shop|checkout|account|pistachio|mixed|nokhodchi|almond|walnut|hazelnut|raisin|date|fruit|legumes|seeds|honey)$/.test(page);

  if (!hasApp || !window.fetch) return;

  try {
    window.__njkProducts = fetch(window.njkApiUrl("products.json"))
      .then(function (r) { return r.ok ? r.json() : null; });
    window.__njkCats = fetch("categories.json")
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  } catch (e) {}
})();
