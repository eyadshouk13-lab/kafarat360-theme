/* KAFARAT 360 - custom JS for Salla (Raed Twig).
   Every feature starts only if its container is on the page, so one file serves all pages:
   [data-k360="finder"]      tire search: by size / by car / by name, results link straight to the product
   [data-k360="collections"] shop by collection, with a product strip
   [data-k360="tabs"]        categories / best sellers switch (best sellers = the Salla section right after)
   [data-k360="garage"]      My Garage: the customer's cars saved in this browser (localStorage)
   [data-k360="shop"]        all products with filters: size, type, brand, model, country, collection
   product page              package table (1 / 2 / 4 tires) under the price
   product cards             animated ribbon
   Data: products.json and cars.json on jsDelivr (built from the store's real product data). */
(function () {
  "use strict";

  var DATA = "https://cdn.jsdelivr.net/gh/eyadshouk13-lab/kafarat360-theme@cb42a32d2c0f1bb1934170b44cbf275ca10f5156/data/";
  var IMG = "https://raw.githubusercontent.com/eyadshouk13-lab/kafarat360-images/d5004e9/";
  var TYPES = { car: "سيارات ركاب", suv: "SUV ودفع رباعي", truck: "نقل خفيف" };
  var COLLECTIONS = [
    { id: "sport", ar: "سبورت", desc: "ثبات على السرعات العالية واستجابة دقيقة", test: function (p) { return /PILOT SPORT|P ?ZERO|POTENZA|EAGLE F1|SPORTCONTACT|VENTUS S1|ADVAN|PS4|SPORT MAXX/i.test(p.n); } },
    { id: "comfort", ar: "كومفورت", desc: "هدوء وراحة في كل مشوار", test: function (p) { return /PRIMACY|TURANZA|CINTURATO|ECOCONTACT|EFFICIENTGRIP|PREMIUMCONTACT|ECOPIA|BLUEARTH|VENTUS PRIME|ASSURANCE/i.test(p.n); } },
    { id: "luxury", ar: "فخم", desc: "أعلى فئات الإطارات للسيارات الفاخرة", test: function (p) { return price(p) >= 1200; } },
    { id: "suv", ar: "SUV", desc: "إطارات سيارات الدفع الرباعي والكروس أوفر", test: function (p) { return p.t === "suv"; } },
    { id: "offroad", ar: "أوف رود", desc: "متانة للبر والطرق الوعرة", test: function (p) { return /A\/T|M\/T|ALL TERRAIN|KO2|WRANGLER|AT PRO|AT3|MT\b/i.test(p.n); } },
    { id: "runflat", ar: "رن فليت", desc: "تكمل القيادة حتى بعد الثقب", test: function (p) { return p.f === 1; } },
    { id: "value", ar: "اقتصادي", desc: "جودة موثوقة بأفضل سعر", test: function (p) { return price(p) < 450; } }
  ];

  /* ---------- helpers ---------- */
  var loaders = {};
  function load(name) {
    if (!loaders[name]) loaders[name] = fetch(DATA + name).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return loaders[name];
  }
  function price(p) { return p.s && p.s < p.pr ? p.s : p.pr; }
  function money(n) { return Math.round(n).toLocaleString("ar-SA") + " ر.س"; }
  function sizeOf(p) { return p.w + (p.p ? "/" + p.p : "") + "R" + p.r; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function base() { return (window.salla && salla.url && salla.url.get) ? salla.url.get("") : "/"; }
  function productUrl(p) { return base().replace(/\/?$/, "/") + "k360/p" + p.i; }
  function uniq(list) { return list.filter(function (v, i) { return v !== "" && v != null && list.indexOf(v) === i; }); }
  function byNum(a, b) { return a - b; }
  function opts(list, ph, sel) {
    return '<option value="">' + esc(ph) + "</option>" + list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? " selected" : "") + ">" + esc(v) + "</option>";
    }).join("");
  }
  var LOGOS = {};
  function card(p) { return siteCard(p, LOGOS); }
  function grid(list, limit) {
    if (!list.length) return '<p class="k360-empty">ما لقينا إطارات بهذا الاختيار. جرّب مقاس أو ماركة ثانية.</p>';
    return '<div class="grid k360-grid">' + list.slice(0, limit || list.length).map(card).join("") + "</div>";
  }
  function fail(el) { el.innerHTML = '<p class="k360-empty">تعذّر تحميل البيانات. <a href="' + base() + '">حدّث الصفحة</a></p>'; }

  /* ---------- shop (all products + filters) ---------- */
  var shop = { el: null, data: null, f: {}, shown: 24 };
  function shopApply(filters) {
    shop.f = filters || {};
    shop.shown = 24;
    if (shop.el) { shopRender(); shop.el.closest("section, .s-block") .scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  window.k360Shop = shopApply;

  function shopFiltered() {
    var f = shop.f, col = COLLECTIONS.filter(function (c) { return c.id === f.col; })[0];
    var q = (f.q || "").toLowerCase().trim();
    var list = shop.data.filter(function (p) {
      if (f.w && p.w !== +f.w) return false;
      if (f.p && p.p !== +f.p) return false;
      if (f.r && p.r !== +f.r) return false;
      if (f.t && p.t !== f.t) return false;
      if (f.b && p.b !== f.b) return false;
      if (f.m && p.m !== f.m) return false;
      if (f.c && p.c !== f.c) return false;
      if (col && !col.test(p)) return false;
      if (q && (p.n + " " + p.b + " " + p.m + " " + sizeOf(p)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (f.sort === "asc") list.sort(function (a, b) { return price(a) - price(b); });
    else if (f.sort === "desc") list.sort(function (a, b) { return price(b) - price(a); });
    else if (f.sort === "off") list.sort(function (a, b) { return (b.s ? b.pr - b.s : 0) / b.pr - (a.s ? a.pr - a.s : 0) / a.pr; });
    return list;
  }

  function shopRender() {
    var d = shop.data, f = shop.f;
    var inW = d.filter(function (p) { return !f.w || p.w === +f.w; });
    var inWP = inW.filter(function (p) { return !f.p || p.p === +f.p; });
    var inB = d.filter(function (p) { return !f.b || p.b === f.b; });
    var list = shopFiltered();
    shop.el.innerHTML =
      '<div class="k360-shop">' +
      '<details class="k360-shop__filters" open><summary>الفلاتر</summary>' +
      '<label>المقاس</label><div class="k360-row3">' +
      '<select data-f="w" aria-label="العرض">' + opts(uniq(d.map(function (p) { return p.w; })).sort(byNum), "العرض", f.w) + "</select>" +
      '<select data-f="p" aria-label="الارتفاع">' + opts(uniq(inW.map(function (p) { return p.p; })).sort(byNum), "الارتفاع", f.p) + "</select>" +
      '<select data-f="r" aria-label="الجنط">' + opts(uniq(inWP.map(function (p) { return p.r; })).sort(byNum), "الجنط", f.r) + "</select></div>" +
      '<label>الفئة</label><select data-f="t">' + '<option value="">الكل</option>' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (f.t === k ? " selected" : "") + ">" + TYPES[k] + "</option>"; }).join("") + "</select>" +
      '<label>الكولكشن</label><select data-f="col"><option value="">الكل</option>' + COLLECTIONS.map(function (c) { return '<option value="' + c.id + '"' + (f.col === c.id ? " selected" : "") + ">" + c.ar + "</option>"; }).join("") + "</select>" +
      '<label>العلامة التجارية</label><select data-f="b">' + opts(uniq(d.map(function (p) { return p.b; })).sort(), "كل الماركات", f.b) + "</select>" +
      '<label>الموديل</label><select data-f="m">' + opts(uniq(inB.map(function (p) { return p.m; })).sort(), "كل الموديلات", f.m) + "</select>" +
      '<label>بلد الصناعة</label><select data-f="c">' + opts(uniq(d.map(function (p) { return p.c; })).sort(), "كل البلدان", f.c) + "</select>" +
      '<label>ترتيب</label><select data-f="sort"><option value="">الافتراضي</option><option value="asc"' + (f.sort === "asc" ? " selected" : "") + '>السعر: من الأقل</option><option value="desc"' + (f.sort === "desc" ? " selected" : "") + '>السعر: من الأعلى</option><option value="off"' + (f.sort === "off" ? " selected" : "") + ">أعلى خصم</option></select>" +
      '<button type="button" class="k360-btn k360-btn--line" data-reset>مسح الفلاتر</button>' +
      "</details>" +
      '<div class="k360-shop__main"><p class="k360-shop__count">' + list.length.toLocaleString("ar-SA") + " إطار" + (f.q ? " · بحث: " + esc(f.q) : "") + "</p>" +
      grid(list, shop.shown) +
      (list.length > shop.shown ? '<button type="button" class="k360-btn k360-btn--primary k360-more" data-more>عرض المزيد</button>' : "") +
      "</div></div>";
    if (window.innerWidth < 768) { var det = shop.el.querySelector("details"); if (det && !shop.keepOpen) det.open = false; }
  }

  function initShop(el) {
    shop.el = el;
    el.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-f"); if (!k) return;
      shop.f[k] = e.target.value;
      if (k === "w") { shop.f.p = ""; shop.f.r = ""; }
      if (k === "p") shop.f.r = "";
      if (k === "b") shop.f.m = "";
      shop.shown = 24; shop.keepOpen = true; shopRender();
    });
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-more]")) { shop.shown += 24; shop.keepOpen = true; shopRender(); }
      if (e.target.closest("[data-reset]")) { shop.f = {}; shop.shown = 24; shop.keepOpen = true; shopRender(); }
    });
    load("products.json").then(function (d) { shop.data = d; shopRender(); }).catch(function () { fail(el); });
  }

  /* ---------- finder (website markup: tabs + tire guide + 3 steps) ---------- */
  var TIRE_SVG = "<svg viewBox=\"0 14 340 352\"><defs><radialGradient id=\"tgTire\" cx=\"50%\" cy=\"100%\" r=\"75%\"><stop offset=\".55\" stop-color=\"#2a2a2a\"/><stop offset=\".8\" stop-color=\"#151515\"/><stop offset=\"1\" stop-color=\"#050505\"/></radialGradient><linearGradient id=\"tgShine\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\".5\" stop-color=\"#fff\" stop-opacity=\".12\"/><stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient><radialGradient id=\"tgRim\" cx=\"35%\" cy=\"25%\" r=\"85%\"><stop offset=\"0\" stop-color=\"#ffffff\"/><stop offset=\".5\" stop-color=\"#c3c9cf\"/><stop offset=\"1\" stop-color=\"#7c858e\"/></radialGradient><linearGradient id=\"tgGloss\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".35\"/><stop offset=\".35\" stop-color=\"#fff\" stop-opacity=\"0\"/></linearGradient><linearGradient id=\"tgSpoke\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#8d969e\"/><stop offset=\".5\" stop-color=\"#f4f6f8\"/><stop offset=\"1\" stop-color=\"#8d969e\"/></linearGradient><path id=\"tg-arc\" d=\"M42,190 A128,128 0 0,1 298,190\"/><path id=\"tg-arc2\" d=\"M54,190 A116,116 0 0,1 286,190\"/><linearGradient id=\"tgEmb\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#8a8f94\"/><stop offset=\"1\" stop-color=\"#4a4f54\"/></linearGradient></defs><circle cx=\"170\" cy=\"190\" r=\"170\" fill=\"url(#tgTire)\"/><g stroke=\"#0a0a0a\" stroke-width=\"5\" stroke-linecap=\"round\"><line x1=\"338.0\" y1=\"190.0\" x2=\"322.0\" y2=\"190.0\"/><line x1=\"337.6\" y1=\"201.7\" x2=\"321.6\" y2=\"200.6\"/><line x1=\"336.4\" y1=\"213.4\" x2=\"320.5\" y2=\"211.2\"/><line x1=\"334.3\" y1=\"224.9\" x2=\"318.7\" y2=\"221.6\"/><line x1=\"331.5\" y1=\"236.3\" x2=\"316.1\" y2=\"231.9\"/><line x1=\"327.9\" y1=\"247.5\" x2=\"312.8\" y2=\"242.0\"/><line x1=\"323.5\" y1=\"258.3\" x2=\"308.9\" y2=\"251.8\"/><line x1=\"318.3\" y1=\"268.9\" x2=\"304.2\" y2=\"261.4\"/><line x1=\"312.5\" y1=\"279.0\" x2=\"298.9\" y2=\"270.5\"/><line x1=\"305.9\" y1=\"288.7\" x2=\"293.0\" y2=\"279.3\"/><line x1=\"298.7\" y1=\"298.0\" x2=\"286.4\" y2=\"287.7\"/><line x1=\"290.8\" y1=\"306.7\" x2=\"279.3\" y2=\"295.6\"/><line x1=\"282.4\" y1=\"314.8\" x2=\"271.7\" y2=\"303.0\"/><line x1=\"273.4\" y1=\"322.4\" x2=\"263.6\" y2=\"309.8\"/><line x1=\"263.9\" y1=\"329.3\" x2=\"255.0\" y2=\"316.0\"/><line x1=\"254.0\" y1=\"335.5\" x2=\"246.0\" y2=\"321.6\"/><line x1=\"243.6\" y1=\"341.0\" x2=\"236.6\" y2=\"326.6\"/><line x1=\"232.9\" y1=\"345.8\" x2=\"226.9\" y2=\"330.9\"/><line x1=\"221.9\" y1=\"349.8\" x2=\"217.0\" y2=\"334.6\"/><line x1=\"210.6\" y1=\"353.0\" x2=\"206.8\" y2=\"337.5\"/><line x1=\"199.2\" y1=\"355.4\" x2=\"196.4\" y2=\"339.7\"/><line x1=\"187.6\" y1=\"357.1\" x2=\"185.9\" y2=\"341.2\"/><line x1=\"175.9\" y1=\"357.9\" x2=\"175.3\" y2=\"341.9\"/><line x1=\"164.1\" y1=\"357.9\" x2=\"164.7\" y2=\"341.9\"/><line x1=\"152.4\" y1=\"357.1\" x2=\"154.1\" y2=\"341.2\"/><line x1=\"140.8\" y1=\"355.4\" x2=\"143.6\" y2=\"339.7\"/><line x1=\"129.4\" y1=\"353.0\" x2=\"133.2\" y2=\"337.5\"/><line x1=\"118.1\" y1=\"349.8\" x2=\"123.0\" y2=\"334.6\"/><line x1=\"107.1\" y1=\"345.8\" x2=\"113.1\" y2=\"330.9\"/><line x1=\"96.4\" y1=\"341.0\" x2=\"103.4\" y2=\"326.6\"/><line x1=\"86.0\" y1=\"335.5\" x2=\"94.0\" y2=\"321.6\"/><line x1=\"76.1\" y1=\"329.3\" x2=\"85.0\" y2=\"316.0\"/><line x1=\"66.6\" y1=\"322.4\" x2=\"76.4\" y2=\"309.8\"/><line x1=\"57.6\" y1=\"314.8\" x2=\"68.3\" y2=\"303.0\"/><line x1=\"49.2\" y1=\"306.7\" x2=\"60.7\" y2=\"295.6\"/><line x1=\"41.3\" y1=\"298.0\" x2=\"53.6\" y2=\"287.7\"/><line x1=\"34.1\" y1=\"288.7\" x2=\"47.0\" y2=\"279.3\"/><line x1=\"27.5\" y1=\"279.0\" x2=\"41.1\" y2=\"270.5\"/><line x1=\"21.7\" y1=\"268.9\" x2=\"35.8\" y2=\"261.4\"/><line x1=\"16.5\" y1=\"258.3\" x2=\"31.1\" y2=\"251.8\"/><line x1=\"12.1\" y1=\"247.5\" x2=\"27.2\" y2=\"242.0\"/><line x1=\"8.5\" y1=\"236.3\" x2=\"23.9\" y2=\"231.9\"/><line x1=\"5.7\" y1=\"224.9\" x2=\"21.3\" y2=\"221.6\"/><line x1=\"3.6\" y1=\"213.4\" x2=\"19.5\" y2=\"211.2\"/><line x1=\"2.4\" y1=\"201.7\" x2=\"18.4\" y2=\"200.6\"/><line x1=\"2.0\" y1=\"190.0\" x2=\"18.0\" y2=\"190.0\"/><line x1=\"2.4\" y1=\"178.3\" x2=\"18.4\" y2=\"179.4\"/><line x1=\"3.6\" y1=\"166.6\" x2=\"19.5\" y2=\"168.8\"/><line x1=\"5.7\" y1=\"155.1\" x2=\"21.3\" y2=\"158.4\"/><line x1=\"8.5\" y1=\"143.7\" x2=\"23.9\" y2=\"148.1\"/><line x1=\"12.1\" y1=\"132.5\" x2=\"27.2\" y2=\"138.0\"/><line x1=\"16.5\" y1=\"121.7\" x2=\"31.1\" y2=\"128.2\"/><line x1=\"21.7\" y1=\"111.1\" x2=\"35.8\" y2=\"118.6\"/><line x1=\"27.5\" y1=\"101.0\" x2=\"41.1\" y2=\"109.5\"/><line x1=\"34.1\" y1=\"91.3\" x2=\"47.0\" y2=\"100.7\"/><line x1=\"41.3\" y1=\"82.0\" x2=\"53.6\" y2=\"92.3\"/><line x1=\"49.2\" y1=\"73.3\" x2=\"60.7\" y2=\"84.4\"/><line x1=\"57.6\" y1=\"65.2\" x2=\"68.3\" y2=\"77.0\"/><line x1=\"66.6\" y1=\"57.6\" x2=\"76.4\" y2=\"70.2\"/><line x1=\"76.1\" y1=\"50.7\" x2=\"85.0\" y2=\"64.0\"/><line x1=\"86.0\" y1=\"44.5\" x2=\"94.0\" y2=\"58.4\"/><line x1=\"96.4\" y1=\"39.0\" x2=\"103.4\" y2=\"53.4\"/><line x1=\"107.1\" y1=\"34.2\" x2=\"113.1\" y2=\"49.1\"/><line x1=\"118.1\" y1=\"30.2\" x2=\"123.0\" y2=\"45.4\"/><line x1=\"129.4\" y1=\"27.0\" x2=\"133.2\" y2=\"42.5\"/><line x1=\"140.8\" y1=\"24.6\" x2=\"143.6\" y2=\"40.3\"/><line x1=\"152.4\" y1=\"22.9\" x2=\"154.1\" y2=\"38.8\"/><line x1=\"164.1\" y1=\"22.1\" x2=\"164.7\" y2=\"38.1\"/><line x1=\"175.9\" y1=\"22.1\" x2=\"175.3\" y2=\"38.1\"/><line x1=\"187.6\" y1=\"22.9\" x2=\"185.9\" y2=\"38.8\"/><line x1=\"199.2\" y1=\"24.6\" x2=\"196.4\" y2=\"40.3\"/><line x1=\"210.6\" y1=\"27.0\" x2=\"206.8\" y2=\"42.5\"/><line x1=\"221.9\" y1=\"30.2\" x2=\"217.0\" y2=\"45.4\"/><line x1=\"232.9\" y1=\"34.2\" x2=\"226.9\" y2=\"49.1\"/><line x1=\"243.6\" y1=\"39.0\" x2=\"236.6\" y2=\"53.4\"/><line x1=\"254.0\" y1=\"44.5\" x2=\"246.0\" y2=\"58.4\"/><line x1=\"263.9\" y1=\"50.7\" x2=\"255.0\" y2=\"64.0\"/><line x1=\"273.4\" y1=\"57.6\" x2=\"263.6\" y2=\"70.2\"/><line x1=\"282.4\" y1=\"65.2\" x2=\"271.7\" y2=\"77.0\"/><line x1=\"290.8\" y1=\"73.3\" x2=\"279.3\" y2=\"84.4\"/><line x1=\"298.7\" y1=\"82.0\" x2=\"286.4\" y2=\"92.3\"/><line x1=\"305.9\" y1=\"91.3\" x2=\"293.0\" y2=\"100.7\"/><line x1=\"312.5\" y1=\"101.0\" x2=\"298.9\" y2=\"109.5\"/><line x1=\"318.3\" y1=\"111.1\" x2=\"304.2\" y2=\"118.6\"/><line x1=\"323.5\" y1=\"121.7\" x2=\"308.9\" y2=\"128.2\"/><line x1=\"327.9\" y1=\"132.5\" x2=\"312.8\" y2=\"138.0\"/><line x1=\"331.5\" y1=\"143.7\" x2=\"316.1\" y2=\"148.1\"/><line x1=\"334.3\" y1=\"155.1\" x2=\"318.7\" y2=\"158.4\"/><line x1=\"336.4\" y1=\"166.6\" x2=\"320.5\" y2=\"168.8\"/><line x1=\"337.6\" y1=\"178.3\" x2=\"321.6\" y2=\"179.4\"/></g><circle cx=\"170\" cy=\"190\" r=\"150\" fill=\"none\" stroke=\"#333\" stroke-width=\"1.5\"/><circle cx=\"170\" cy=\"190\" r=\"106\" fill=\"none\" stroke=\"#3a3a3a\" stroke-width=\"2\"/><path d=\"M5,160 A170,170 0 0,1 335,160\" fill=\"none\" stroke=\"url(#tgShine)\" stroke-width=\"16\"/><text direction=\"ltr\" unicode-bidi=\"bidi-override\" font-family=\"Arial Black,Arial\" font-weight=\"900\" font-size=\"24\" fill=\"#fff\" letter-spacing=\"2\"><textPath href=\"#tg-arc\" startOffset=\"50%\" text-anchor=\"middle\"><tspan id=\"tgW\">205</tspan>/<tspan id=\"tgH\">55</tspan> R<tspan id=\"tgR\">16</tspan></textPath></text><circle cx=\"170\" cy=\"190\" r=\"100\" fill=\"url(#tgRim)\"/><circle cx=\"170\" cy=\"190\" r=\"94\" fill=\"#1c1f22\"/><circle cx=\"170\" cy=\"190\" r=\"88\" fill=\"none\" stroke=\"#2c3035\" stroke-width=\"6\"/><g fill=\"url(#tgSpoke)\" stroke=\"#6b737b\" stroke-width=\"1\"><path d=\"M159,160 L150,104 Q170,96 190,104 L181,160 Z\" transform=\"rotate(0 170 190)\"/><path d=\"M159,160 L150,104 Q170,96 190,104 L181,160 Z\" transform=\"rotate(72 170 190)\"/><path d=\"M159,160 L150,104 Q170,96 190,104 L181,160 Z\" transform=\"rotate(144 170 190)\"/><path d=\"M159,160 L150,104 Q170,96 190,104 L181,160 Z\" transform=\"rotate(216 170 190)\"/><path d=\"M159,160 L150,104 Q170,96 190,104 L181,160 Z\" transform=\"rotate(288 170 190)\"/></g><circle cx=\"170\" cy=\"190\" r=\"97\" fill=\"none\" stroke=\"#d7dce0\" stroke-width=\"5\"/><circle cx=\"170\" cy=\"190\" r=\"99\" fill=\"none\" stroke=\"url(#tgGloss)\" stroke-width=\"4\"/><path d=\"M90,135 A97,97 0 0,1 190,94\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".25\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><circle cx=\"170\" cy=\"190\" r=\"45.9\" fill=\"#fff\" stroke=\"#d7dce0\" stroke-width=\"2\"/><circle cx=\"170\" cy=\"190\" r=\"44.3\" fill=\"none\" stroke=\"#7B3FE4\" stroke-width=\"3\"/><g stroke=\"#7B3FE4\" stroke-width=\"2.6\" stroke-linecap=\"round\"><line x1=\"170.0\" y1=\"148.2\" x2=\"170.0\" y2=\"154.7\"/><line x1=\"177.3\" y1=\"148.8\" x2=\"176.6\" y2=\"152.9\"/><line x1=\"184.3\" y1=\"150.7\" x2=\"182.9\" y2=\"154.6\"/><line x1=\"190.9\" y1=\"153.8\" x2=\"188.9\" y2=\"157.3\"/><line x1=\"196.9\" y1=\"158.0\" x2=\"194.2\" y2=\"161.1\"/><line x1=\"202.0\" y1=\"163.1\" x2=\"198.9\" y2=\"165.8\"/><line x1=\"206.2\" y1=\"169.1\" x2=\"202.7\" y2=\"171.1\"/><line x1=\"209.3\" y1=\"175.7\" x2=\"205.4\" y2=\"177.1\"/><line x1=\"211.2\" y1=\"182.7\" x2=\"207.1\" y2=\"183.4\"/><line x1=\"211.8\" y1=\"190.0\" x2=\"205.3\" y2=\"190.0\"/><line x1=\"211.2\" y1=\"197.3\" x2=\"207.1\" y2=\"196.6\"/><line x1=\"209.3\" y1=\"204.3\" x2=\"205.4\" y2=\"202.9\"/><line x1=\"206.2\" y1=\"210.9\" x2=\"202.7\" y2=\"208.9\"/><line x1=\"202.0\" y1=\"216.9\" x2=\"198.9\" y2=\"214.2\"/><line x1=\"196.9\" y1=\"222.0\" x2=\"194.2\" y2=\"218.9\"/><line x1=\"190.9\" y1=\"226.2\" x2=\"188.9\" y2=\"222.7\"/><line x1=\"184.3\" y1=\"229.3\" x2=\"182.9\" y2=\"225.4\"/><line x1=\"177.3\" y1=\"231.2\" x2=\"176.6\" y2=\"227.1\"/><line x1=\"170.0\" y1=\"231.8\" x2=\"170.0\" y2=\"225.3\"/><line x1=\"162.7\" y1=\"231.2\" x2=\"163.4\" y2=\"227.1\"/><line x1=\"155.7\" y1=\"229.3\" x2=\"157.1\" y2=\"225.4\"/><line x1=\"149.1\" y1=\"226.2\" x2=\"151.1\" y2=\"222.7\"/><line x1=\"143.1\" y1=\"222.0\" x2=\"145.8\" y2=\"218.9\"/><line x1=\"138.0\" y1=\"216.9\" x2=\"141.1\" y2=\"214.2\"/><line x1=\"133.8\" y1=\"210.9\" x2=\"137.3\" y2=\"208.9\"/><line x1=\"130.7\" y1=\"204.3\" x2=\"134.6\" y2=\"202.9\"/><line x1=\"128.8\" y1=\"197.3\" x2=\"132.9\" y2=\"196.6\"/><line x1=\"128.2\" y1=\"190.0\" x2=\"134.7\" y2=\"190.0\"/><line x1=\"128.8\" y1=\"182.7\" x2=\"132.9\" y2=\"183.4\"/><line x1=\"130.7\" y1=\"175.7\" x2=\"134.6\" y2=\"177.1\"/><line x1=\"133.8\" y1=\"169.1\" x2=\"137.3\" y2=\"171.1\"/><line x1=\"138.0\" y1=\"163.1\" x2=\"141.1\" y2=\"165.8\"/><line x1=\"143.1\" y1=\"158.0\" x2=\"145.8\" y2=\"161.1\"/><line x1=\"149.1\" y1=\"153.8\" x2=\"151.1\" y2=\"157.3\"/><line x1=\"155.7\" y1=\"150.7\" x2=\"157.1\" y2=\"154.6\"/><line x1=\"162.7\" y1=\"148.8\" x2=\"163.4\" y2=\"152.9\"/></g><circle cx=\"170\" cy=\"190\" r=\"29.5\" fill=\"#7B3FE4\"/><text x=\"170\" y=\"199\" text-anchor=\"middle\" direction=\"ltr\" font-family=\"Arial Black,Arial\" font-weight=\"900\" font-size=\"25\" letter-spacing=\"-1\" fill=\"#fff\">360</text></svg>";
  function initFinder(el) {
    Promise.all([load("products.json"), load("cars.json")]).then(function (res) {
      var d = res[0], cars = res[1], have = {};
      d.forEach(function (p) { have[sizeOf(p)] = (have[sizeOf(p)] || 0) + 1; });
      var widths = uniq(d.map(function (p) { return p.w; })).sort(byNum);
      el.innerHTML =
        '<div class="finder-box">' +
        '<div class="f-tabs"><button type="button" class="on" data-ft="size">بالمقاس</button><button type="button" data-ft="car">بنوع السيارة</button><button type="button" data-ft="name">بالاسم</button></div>' +
        '<form class="f-pane step-search" data-pane="size">' +
        '<div class="tire-guide" aria-hidden="true">' + TIRE_SVG + '<span class="pin p1">1</span><span class="pin p2">2</span><span class="pin p3">3</span></div>' +
        '<div class="step"><label><i>1</i> العرض</label><select data-s="w">' + opts(widths, "اختر العرض") + "</select></div>" +
        '<div class="step"><label><i>2</i> الارتفاع</label><select data-s="p" disabled>' + opts([], "اختر الارتفاع") + "</select></div>" +
        '<div class="step"><label><i>3</i> مقاس الجنط</label><select data-s="r" disabled>' + opts([], "اختر الجنط") + "</select></div>" +
        '<button type="submit" class="btn btn-primary step-go" disabled>عرض النتائج</button></form>' +
        '<form class="f-pane size-search" data-pane="car" hidden>' +
        '<div class="ss-field"><label>الشركة المصنّعة</label><select data-c="make"><option value="">اختر الشركة</option>' + Object.keys(cars).map(function (k) { return '<option value="' + k + '">' + esc(cars[k].ar) + " — " + esc(cars[k].en) + "</option>"; }).join("") + "</select></div>" +
        '<div class="ss-field"><label>الموديل</label><select data-c="model" disabled><option value="">اختر الموديل</option></select></div>' +
        '<div class="ss-field"><label>المقاسات المناسبة</label><div class="f-sizes" data-sizes>اختر سيارتك أولاً</div></div>' +
        '<p class="k360-hint">مقاسات شائعة لهذا الموديل. تأكد من المقاس المكتوب على جنب إطارك قبل الطلب.</p></form>' +
        '<form class="f-pane name-search" data-pane="name" hidden><input data-q placeholder="اكتب اسم الإطار أو الماركة أو المقاس… مثال: ميشلان، PRIMACY، 265/65R17" required><button class="btn btn-primary" type="submit">بحث</button></form>' +
        "</div>" +
        '<div class="k360-finder__res" data-res></div>';
      var box = el.querySelector(".finder-box"), resEl = el.querySelector("[data-res]");
      var sW = box.querySelector('[data-s="w"]'), sP = box.querySelector('[data-s="p"]'), sR = box.querySelector('[data-s="r"]'), go = box.querySelector(".step-go");
      var mk = box.querySelector('[data-c="make"]'), md = box.querySelector('[data-c="model"]'), szs = box.querySelector("[data-sizes]");
      function show(list, filters, label) {
        resEl.innerHTML = '<p class="k360-shop__count">' + list.length.toLocaleString("ar-SA") + " إطار مناسب" + (label ? " · " + esc(label) : "") + "</p>" + grid(list, 8) +
          (list.length > 8 ? '<button type="button" class="k360-btn k360-btn--primary k360-more" data-all>عرض كل النتائج</button>' : "");
        resEl._f = filters;
      }
      function sorted(list) { return list.sort(function (a, b) { return price(a) - price(b); }); }
      function upd() {
        var W = +sW.value, P = sP.value === "" ? null : +sP.value;
        var inW = d.filter(function (p) { return p.w === W; });
        if (sW.value && sP.disabled) { sP.innerHTML = opts(uniq(inW.map(function (p) { return p.p; })).sort(byNum), "اختر الارتفاع"); }
        sP.disabled = !sW.value;
        var inWP = inW.filter(function (p) { return P === null || p.p === P; });
        if (sP.value && sR.disabled) { sR.innerHTML = opts(uniq(inWP.map(function (p) { return p.r; })).sort(byNum), "اختر الجنط"); }
        sR.disabled = !sP.value;
        go.disabled = !(sW.value && sP.value && sR.value);
        var t = box.querySelector("#tgW"), h = box.querySelector("#tgH"), r = box.querySelector("#tgR");
        if (t) t.textContent = sW.value || "205"; if (h) h.textContent = sP.value || "55"; if (r) r.textContent = sR.value || "16";
        box.querySelectorAll(".pin").forEach(function (pin, k) { pin.classList.toggle("done", !![sW, sP, sR][k].value); });
      }
      sW.addEventListener("change", function () { sP.disabled = true; sP.value = ""; sR.disabled = true; sR.value = ""; upd(); });
      sP.addEventListener("change", function () { sR.disabled = true; sR.value = ""; upd(); });
      sR.addEventListener("change", upd);
      box.querySelector('[data-pane="size"]').addEventListener("submit", function (e) {
        e.preventDefault();
        var f = { w: sW.value, p: sP.value, r: sR.value };
        show(sorted(d.filter(function (p) { return p.w === +f.w && p.p === +f.p && p.r === +f.r; })), f, f.w + "/" + f.p + "R" + f.r);
      });
      mk.addEventListener("change", function () {
        var c = cars[mk.value];
        md.innerHTML = '<option value="">اختر الموديل</option>' + (c ? Object.keys(c.models).map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + " — " + esc(c.models[m].en) + "</option>"; }).join("") : "");
        md.disabled = !c; szs.textContent = "اختر الموديل";
      });
      md.addEventListener("change", function () {
        var c = cars[mk.value], m = c && c.models[md.value];
        szs.innerHTML = m ? m.sizes.map(function (z) { var n = have[z] || 0; return n ? '<button type="button" data-size="' + z + '">' + z + " <small>(" + n.toLocaleString("ar-SA") + ")</small></button>" : '<span class="is-out">' + z + " · غير متوفر</span>"; }).join("") : "اختر الموديل";
      });
      szs.addEventListener("click", function (e) {
        var b = e.target.closest("[data-size]"); if (!b) return;
        var z = b.getAttribute("data-size"), m = z.match(/^(\d+)\/?(\d*)R(\d+)$/);
        szs.querySelectorAll("[data-size]").forEach(function (x) { x.classList.toggle("on", x === b); });
        if (m) show(sorted(d.filter(function (p) { return sizeOf(p) === z; })), { w: m[1], p: m[2] || "0", r: m[3] }, z);
      });
      box.querySelector('[data-pane="name"]').addEventListener("submit", function (e) {
        e.preventDefault();
        var q = box.querySelector("[data-q]").value.toLowerCase().trim(); if (q.length < 2) return;
        show(sorted(d.filter(function (p) { return (p.n + " " + p.b + " " + p.m + " " + sizeOf(p)).toLowerCase().indexOf(q) >= 0; })), { q: q }, q);
      });
      box.querySelector(".f-tabs").addEventListener("click", function (e) {
        var b = e.target.closest("[data-ft]"); if (!b) return;
        box.querySelectorAll(".f-tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
        box.querySelectorAll(".f-pane").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== b.getAttribute("data-ft"); });
        resEl.innerHTML = "";
      });
      resEl.addEventListener("click", function (e) {
        if (!e.target.closest("[data-all]")) return;
        window.location.href = pageUrl("shop", resEl._f || {});
      });
      upd();
    }).catch(function () { fail(el); });
  }

  /* ---------- collections (website markup: 3D stage + info + strip) ---------- */
  function initCollections(el) {
    load("products.json").then(function (d) {
      var cols = COLLECTIONS.map(function (c) {
        var items = d.filter(c.test).sort(function (a, b) { return price(b) - price(a); });
        return { c: c, items: items, cover: items[0] };
      }).filter(function (x) { return x.items.length; });
      var i = 0;
      el.innerHTML =
        '<div class="col-stage">' +
        '<button type="button" class="col-arrow col-prev" aria-label="السابق">›</button>' +
        '<div class="col-track">' + cols.map(function (x, k) { return '<div class="col-item" data-k="' + k + '"><span class="col-pill">' + x.c.ar + '</span><img src="' + IMG + esc(x.cover.im) + '" alt="' + x.c.ar + '"></div>'; }).join("") + "</div>" +
        '<button type="button" class="col-arrow col-next" aria-label="التالي">‹</button>' +
        '<div class="col-hint">◉ اسحب لتتنقّل</div></div>' +
        '<div class="col-info"><h3 data-name></h3><p data-desc></p></div>' +
        '<div class="col-strip-h"><b>منتجات الكولكشن</b><a class="btn btn-primary" data-shopcol>تسوّق الكولكشن كامل</a></div>' +
        '<div class="col-strip" data-strip></div>';
      var items = [].slice.call(el.querySelectorAll(".col-item"));
      function showCol(n) {
        i = (n + cols.length) % cols.length;
        items.forEach(function (it, k) { var dd = k - i; if (dd > cols.length / 2) dd -= cols.length; if (dd < -cols.length / 2) dd += cols.length; it.dataset.pos = Math.abs(dd) > 1 ? "far" : dd; });
        var x = cols[i];
        el.querySelector("[data-name]").textContent = "كولكشن " + x.c.ar;
        el.querySelector("[data-desc]").textContent = x.c.desc + " — " + x.items.length.toLocaleString("ar-SA") + " إطار";
        el.querySelector("[data-shopcol]").setAttribute("data-col", x.c.id);
        el.querySelector("[data-strip]").innerHTML = x.items.slice(0, 10).map(function (p) {
          return '<a class="col-p" href="' + productUrl(p) + '"><img src="' + IMG + esc(p.im) + '" alt="" loading="lazy"><small>' + esc(p.b) + "</small><b>" + sizeOf(p) + "</b><span>" + money(price(p)) + (p.s && p.s < p.pr ? " <s>" + money(p.pr) + "</s>" : "") + "</span></a>";
        }).join("");
      }
      items.forEach(function (it) { it.addEventListener("click", function () { showCol(+it.dataset.k); }); });
      el.querySelector(".col-prev").addEventListener("click", function () { showCol(i - 1); });
      el.querySelector(".col-next").addEventListener("click", function () { showCol(i + 1); });
      el.querySelector("[data-shopcol]").addEventListener("click", function (e) {
        e.preventDefault(); var id = e.currentTarget.getAttribute("data-col");
        window.location.href = pageUrl("shop", { col: id });
      });
      var x0 = null, st = el.querySelector(".col-stage");
      st.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      st.addEventListener("pointerup", function (e) { if (x0 === null) return; var dx = e.clientX - x0; if (Math.abs(dx) > 40) showCol(i + (dx > 0 ? 1 : -1)); x0 = null; });
      showCol(0);
    }).catch(function () { fail(el); });
  }

  /* ---------- brand strip (website markup) ---------- */
  var LOGO = "https://raw.githubusercontent.com/eyadshouk13-lab/kafarat360-theme/cb42a32d2c0f1bb1934170b44cbf275ca10f5156/";
  function brandUrl(b) { return base().replace(/\/?$/, "/") + "b/brand-" + b.i; }
  function initBrands(el) {
    load("brands.json").then(function (bs) {
      el.innerHTML = bs.map(function (b) {
        var logo = b.logo ? '<img src="' + LOGO + esc(b.logo) + '" alt="' + esc(b.ar) + '" loading="lazy">' : "<b>" + esc(b.en || b.ar) + "</b>";
        return '<a class="brand" href="' + brandUrl(b) + '"><div class="bl">' + logo + "</div><b>" + esc(b.ar) + '</b><small>' + b.n.toLocaleString("ar-SA") + ' إطار</small><span class="pill-live">تسوّق ' + esc(b.ar) + "</span></a>";
      }).join("");
    }).catch(function () { fail(el); });
  }

  /* ---------- category bar under the store header (all pages) ---------- */
  function initNav() {
    if (document.querySelector(".k360-nav")) return;
    var header = document.querySelector(".store-header"); if (!header) return;
    var home = base().replace(/\/?$/, "/");
    var links = [[home, "الصفحة الرئيسية", ""], [pageUrl("shop"), "جميع المنتجات", "shop"], [pageUrl("best"), "الأكثر مبيعاً", "best"],
      [home + "b/brand-167120911", "بريجستون", ""], [home + "#k360-garage", "&#x1F3E0; ماي جراش", ""], [pageUrl("cats"), "جميع التصنيفات", "cats"],
      [pageUrl("brands"), "العلامات التجارية", "brands"], [home + "#k360-finder", "ابحث بالمقاس", ""]];
    var cur = new URLSearchParams(location.search).get("k360") || "";
    var here = location.href.replace(/[?#].*$/, "").replace(/\/?$/, "/");
    var nav = document.createElement("nav");
    nav.className = "k360-site k360-nav";
    nav.setAttribute("aria-label", "التصنيفات");
    nav.innerHTML = '<div class="nav"><div class="wrap">' + links.map(function (l, k) { var on = cur ? l[2] === cur : (k === 0 && here === home); return '<a href="' + l[0] + '"' + (on ? ' class="active"' : "") + ">" + l[1] + "</a>"; }).join("") + "</div></div>";
    header.parentNode.insertBefore(nav, header.nextSibling);
  }

  /* ---------- categories / best sellers switch ---------- */
  function initTabs(el) {
    var host = el.closest(".s-block--bundle-html-content") || el.closest(".s-block");
    var next = host && host.nextElementSibling;
    var bar = el.querySelector(".k360-tabsbar"), cats = el.querySelector("[data-panel='cats']");
    if (!bar) return;
    function show(which) {
      bar.querySelectorAll("button").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-tab") === which); });
      if (cats) cats.hidden = which !== "cats";
      if (next) next.style.display = which === "best" ? "" : "none";
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) show(b.getAttribute("data-tab")); });
    el.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cat]"); if (!c) return;
      e.preventDefault();
      var v = c.getAttribute("data-cat"), f = TYPES[v] ? { t: v } : { col: v };
      window.location.href = pageUrl("shop", f);
    });
    show("cats");
  }

  /* ---------- my garage ---------- */
  function initGarage(el) {
    var KEY = "k360-garage";
    function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
    function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
    Promise.all([load("cars.json"), load("products.json")]).then(function (res) {
      var cars = res[0], d = res[1], st = { make: "", model: "" };
      var sizes = uniq(d.map(sizeOf)).sort();
      function render(msg) {
        var list = read(), mk = cars[st.make], md = mk && mk.models[st.model];
        el.innerHTML =
          (list.length ? '<div class="k360-garage__list">' + list.map(function (c, i) {
            return '<div class="k360-garage__car"><b>' + esc(c.name) + "</b><span>" + esc(c.size) + (c.year ? " · " + esc(c.year) : "") + "</span>" +
              '<button type="button" class="k360-btn k360-btn--primary" data-go="' + i + '">اعرض الإطارات المناسبة</button>' +
              '<button type="button" class="k360-btn k360-btn--line" data-del="' + i + '">حذف</button></div>';
          }).join("") + "</div>" : '<p class="k360-hint">ما عندك سيارات محفوظة. أضف سيارتك مرة وحدة، وتلقى إطاراتها كل ما رجعت.</p>') +
          '<form class="k360-garage__form" data-form>' +
          '<select data-g="make" aria-label="الشركة"><option value="">الشركة</option>' + Object.keys(cars).map(function (k) { return '<option value="' + k + '"' + (st.make === k ? " selected" : "") + ">" + esc(cars[k].ar) + "</option>"; }).join("") + "</select>" +
          '<select data-g="model" aria-label="الموديل"' + (mk ? "" : " disabled") + '><option value="">الموديل</option>' + (mk ? Object.keys(mk.models).map(function (k) { return '<option value="' + esc(k) + '"' + (st.model === k ? " selected" : "") + ">" + esc(k) + "</option>"; }).join("") : "") + "</select>" +
          '<input name="year" inputmode="numeric" maxlength="4" placeholder="سنة الصنع (اختياري)" aria-label="سنة الصنع">' +
          '<select name="size" aria-label="مقاس الإطار" required><option value="">مقاس الإطار</option>' + (md ? md.sizes.filter(function (z) { return sizes.indexOf(z) >= 0; }).map(function (z) { return '<option value="' + z + '">' + z + " (شائع لهذا الموديل)</option>"; }).join("") : "") + sizes.map(function (z) { return '<option value="' + z + '">' + z + "</option>"; }).join("") + "</select>" +
          '<button class="k360-btn k360-btn--primary" type="submit">احفظ سيارتي</button></form>' +
          (msg ? '<p class="k360-hint">' + msg + "</p>" : "") +
          '<p class="k360-hint">تنحفظ سياراتك في هذا الجهاز فقط.</p>';
      }
      el.addEventListener("change", function (e) {
        var k = e.target.getAttribute("data-g"); if (!k) return;
        st[k] = e.target.value; if (k === "make") st.model = ""; render();
      });
      el.addEventListener("submit", function (e) {
        e.preventDefault();
        var fm = e.target, size = fm.size.value; if (!size) return;
        var mk = cars[st.make], name = mk ? mk.ar + (st.model ? " " + st.model : "") : "سيارتي";
        var list = read(); list.push({ name: name, size: size, year: fm.year.value.replace(/\D/g, "").slice(0, 4) });
        render(save(list) ? "انحفظت سيارتك ✓" : "المتصفح ما يسمح بالحفظ.");
      });
      el.addEventListener("click", function (e) {
        var g = e.target.closest("[data-go]"), x = e.target.closest("[data-del]"), list = read();
        if (g) { var c = list[+g.getAttribute("data-go")], m = c && c.size.match(/^(\d+)\/?(\d*)R(\d+)$/); if (m) { var f = { w: m[1], p: m[2] || "0", r: m[3] }; window.location.href = pageUrl("shop", f); } }
        if (x) { list.splice(+x.getAttribute("data-del"), 1); save(list); render(); }
      });
      render();
    }).catch(function () { fail(el); });
  }

  /* ---------- product page: package table ---------- */
  function initPackages() {
    var cfg = window.salla && salla.config;
    if (!cfg || cfg.get("page.slug") !== "product.single" || document.querySelector(".k360-pd")) return;
    var id = cfg.get("page.id");
    var form = document.querySelector("form.product-form"), qty = document.querySelector('input[name="quantity"]');
    if (!id || !form || !qty) return;
    Promise.all([load("products.json"), load("brands.json")]).then(function (res) {
      var p = res[0].filter(function (x) { return x.i === id; })[0]; if (!p || document.querySelector(".k360-pd")) return;
      var u = price(p), off = p.s && p.s < p.pr, box = document.createElement("div");
      box.className = "k360-site k360-pd";
      function pk(n, title, sub, hot) {
        return '<label class="pd-pkg' + (hot ? " hot" : "") + '"><input type="radio" name="k360pkg" value="' + n + '">' + (hot ? "<i>الأكثر مبيعاً</i>" : "") +
          '<span class="pkg-ic">' + (n === 2 ? "&#x1F6DE;&#x1F6DE;" : "&#x1F6DE;&#x1F6DE;&#x1F6DE;&#x1F6DE;") + "</span><span><b>" + title + "</b><small>" + sub + "</small></span><em>" + money(u * n) +
          (off ? '<s style="display:block;font-size:12px;color:var(--muted);font-weight:400">' + money(p.pr * n) + "</s>" : "") + "</em></label>";
      }
      box.innerHTML =
        '<div class="pd-top"><span class="tag">' + esc(TYPES[p.t] || "") + '</span><span class="tag green">&#x1F6E1;&#xFE0F; الضمان: ' + (p.g ? p.g + " سنوات" : "الوكيل") + "</span>" + (p.f ? '<span class="tag">Run Flat</span>' : "") + "</div>" +
        '<div class="kv"><div><small>الموديل</small><b>' + esc(p.m) + "</b></div><div><small>سنة الإنتاج</small><b>" + (p.y ? "تاريخ " + p.y : "-") + "</b></div><div><small>مصنوع في</small><b>" + esc(p.c || "-") + "</b></div><div><small>المقاس</small><b dir=\"ltr\">" + sizeOf(p) + "</b></div></div>" +
        '<div class="pd-pkgs"><b>اختر الباقة</b><div class="pd-pkg-grid">' + pk(2, "باقة الكفرين", "للأمام أو الخلف", false) + pk(4, "باقة الـ 4 كفرات", "طقم كامل للسيارة", true) + "</div>" +
        '<div class="buy-row" style="margin-top:12px"><div class="total">الإجمالي: <b data-total></b></div></div></div>' +
        '<div class="ship-box"><div>&#x1F69A; <b>الشحن والتوصيل</b><small>توصيل لجميع مدن المملكة</small></div><div>&#x1F527; <b>التركيب مع الترصيص عند البيت</b><small>فني متنقل يجيك لموقعك</small></div><div>&#x1F468;&#x200D;&#x1F527; <b>دعم الخبراء 24 ساعة</b><small>طوال أيام الأسبوع</small></div></div>';
      var radios = [].slice.call(box.querySelectorAll('input[name="k360pkg"]')), tot = box.querySelector("[data-total]");
      function paint() {
        var n = Math.max(1, +qty.value || 1);
        tot.textContent = money(u * n);
        radios.forEach(function (r) { r.checked = +r.value === n; });
      }
      function setQty(n) {
        qty.value = n; ["input", "change", "keyup"].forEach(function (ev) { qty.dispatchEvent(new Event(ev, { bubbles: true })); });
        paint();
      }
      radios.forEach(function (r) { r.addEventListener("change", function () { setQty(+r.value); }); });
      qty.addEventListener("input", paint); qty.addEventListener("change", paint);
      var qi = document.querySelector("salla-quantity-input"); if (qi) { qi.addEventListener("click", function () { setTimeout(paint, 120); }); }
      form.parentNode.insertBefore(box, form);
      paint();
    }).catch(function () {});
  }

  /* ---------- product card ribbon ---------- */
  function addRibbon(cardEl) {
    var box = cardEl.querySelector(".s-product-card-image");
    if (!box || box.querySelector(".k360-rib")) return;
    var promo = cardEl.querySelector(".s-product-card-promotion-title");
    var m = promo && promo.textContent.match(/([0-9٠-٩]+)\s*%/);
    var msg = m ? "خصم حصري " + m[1] + "% ✦ توصيل وتركيب عند باب بيتك" : "توصيل وتركيب عند باب بيتك ✦ ضمان الوكيل";
    var seg = ""; for (var i = 0; i < 4; i++) seg += "<span>" + msg + "</span><i>✦</i>";
    var dv = document.createElement("div");
    dv.className = "k360-rib" + (m ? "" : " k360-rib--alt"); dv.setAttribute("aria-hidden", "true");
    dv.innerHTML = '<div class="k360-rib__track"><div>' + seg + "</div><div>" + seg + "</div></div>";
    box.appendChild(dv);
  }

  /* ---------- full pages on top of Salla's search page: search?q=360&k360=shop|best|cats|brands ---------- */
  var PAGES = { shop: "جميع المنتجات", best: "الأكثر مبيعاً", cats: "جميع التصنيفات", brands: "العلامات التجارية" };
  var CATS = [
    { id: "car", name: "إطارات سيارات ركاب", desc: "سيدان وهاتشباك", icon: "cat-icons/car.webp" },
    { id: "suv", name: "إطارات SUV ودفع رباعي", desc: "جيب وكروس أوفر", icon: "cat-icons/suv.webp" },
    { id: "truck", name: "إطارات نقل خفيف", desc: "بيك أب وفانات", icon: "cat-icons/truck.webp" },
    { id: "oils", name: "زيوت وفلاتر", desc: "باقات تغيير الزيت", icon: "cat-icons/oils.svg", soon: true },
    { id: "batteries", name: "البطاريات", desc: "تركيب في موقعك", icon: "cat-icons/batteries.svg", soon: true },
    { id: "roadside", name: "المساعدة على الطريق", desc: "بنشر وإطار احتياطي", icon: "cat-icons/roadside.svg", soon: true }
  ];
  function pageUrl(name, params) {
    var u = base().replace(/\/?$/, "/") + "search?q=360&k360=" + name;
    Object.keys(params || {}).forEach(function (k) { if (params[k] !== "" && params[k] != null) u += "&" + k + "=" + encodeURIComponent(params[k]); });
    return u;
  }
  window.k360Page = pageUrl;

  function siteCard(p, logos) {
    var off = p.s && p.s < p.pr ? Math.round((1 - p.s / p.pr) * 100) : 0, u = price(p), url = productUrl(p);
    var msg = off ? "خصم حصري " + off + "% ✦ توصيل وتركيب عند باب بيتك" : "توصيل وتركيب عند باب بيتك ✦ ضمان الوكيل";
    var seg = ""; for (var i = 0; i < 4; i++) seg += "<span>" + msg + "</span><i>✦</i>";
    var logo = logos[p.bi];
    return '<article class="card">' +
      (off ? '<span class="badge-off">خصم ' + off + "%</span>" : (p.f ? '<span class="badge-tag">Run Flat</span>' : "")) +
      '<a href="' + url + '" class="card-img"><div class="card-rib' + (off ? "" : " alt") + '"><div class="rib-track"><div>' + seg + '</div><div aria-hidden="true">' + seg + "</div></div></div>" +
      '<img loading="lazy" src="' + IMG + esc(p.im) + '" alt="' + esc(p.b + " " + p.m) + '"></a>' +
      '<div class="card-body">' +
      '<div class="card-brand">' + (logo ? '<img src="' + LOGO + esc(logo) + '" alt="">' : "") + "<span>" + esc(p.b) + "</span></div>" +
      '<a href="' + url + '" class="card-title">' + sizeOf(p) + " " + esc(p.b) + " " + esc(p.m) + "</a>" +
      '<div class="card-meta"><span>🛡️ ضمان ' + (p.g ? p.g + " سنوات" : "الوكيل") + "</span><span>" + esc(p.c || "") + (p.y ? " · " + p.y : "") + "</span></div>" +
      '<div class="price"><b>' + money(u) + "</b>" + (off ? "<s>" + money(p.pr) + "</s>" : "") + "<small>للإطار</small></div>" +
      '<div class="pkgs">' +
      '<button type="button" class="pkg" data-add="' + p.i + '" data-q="2"><span class="pkg-t">باقة كفرين</span><b>' + money(u * 2) + "</b>" + (off ? "<s>" + money(p.pr * 2) + "</s>" : "") + "<small>🛒 أضف</small></button>" +
      '<button type="button" class="pkg hot" data-add="' + p.i + '" data-q="4"><i>مجموعة كاملة</i><span class="pkg-t">باقة 4 كفرات</span><b>' + money(u * 4) + "</b>" + (off ? "<s>" + money(p.pr * 4) + "</s>" : "") + "<small>🛒 أضف</small></button>" +
      "</div></div></article>";
  }

  function addToCart(id, q, btn) {
    if (!(window.salla && salla.cart && salla.cart.addItem)) { window.location.href = base().replace(/\/?$/, "/") + "k360/p" + id; return; }
    if (btn) btn.disabled = true;
    salla.cart.addItem({ id: id, quantity: q }).catch(function () { window.location.href = base().replace(/\/?$/, "/") + "k360/p" + id; })
      .then(function () { if (btn) btn.disabled = false; });
  }

  function renderShopPage(body, q) {
    Promise.all([load("products.json"), load("brands.json")]).then(function (res) {
      var d = res[0], logos = {};
      res[1].forEach(function (b) { if (b.logo) logos[b.i] = b.logo; });
      var st = { w: q.get("w") || "", p: q.get("p") || "", r: q.get("r") || "", q: (q.get("q2") || "").toLowerCase(), col: q.get("col") || "", sort: "", shown: 24,
        t: {}, b: {}, m: {}, c: {}, y: {} };
      if (q.get("t")) st.t[q.get("t")] = 1; if (q.get("b")) st.b[q.get("b")] = 1;
      function keys(o) { return Object.keys(o).filter(function (k) { return o[k]; }); }
      function chk(key, items) { return items.map(function (it) { return '<label class="chk"><input type="checkbox" data-k="' + key + '" value="' + esc(it[0]) + '"' + (st[key][it[0]] ? " checked" : "") + "> " + esc(it[1]) + "</label>"; }).join(""); }
      function list() {
        var col = COLLECTIONS.filter(function (c) { return c.id === st.col; })[0];
        var T = keys(st.t), B = keys(st.b), M = keys(st.m), C = keys(st.c), Y = keys(st.y);
        var out = d.filter(function (p) {
          return (!st.w || p.w === +st.w) && (!st.p || p.p === +st.p) && (!st.r || p.r === +st.r) &&
            (!T.length || T.indexOf(p.t) >= 0) && (!B.length || B.indexOf(p.b) >= 0) && (!M.length || M.indexOf(p.m) >= 0) &&
            (!C.length || C.indexOf(p.c) >= 0) && (!Y.length || Y.indexOf(String(p.y)) >= 0) && (!col || col.test(p)) &&
            (!st.q || (p.n + " " + p.b + " " + p.m + " " + sizeOf(p)).toLowerCase().indexOf(st.q) >= 0);
        });
        if (st.sort === "pa") out.sort(function (a, b) { return price(a) - price(b); });
        if (st.sort === "pd") out.sort(function (a, b) { return price(b) - price(a); });
        if (st.sort === "new") out.sort(function (a, b) { return (b.y || 0) - (a.y || 0); });
        return out;
      }
      function count(arr, f) { var m = {}; arr.forEach(function (p) { var k = f(p); if (k) m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }); }
      function render() {
        var inW = d.filter(function (p) { return !st.w || p.w === +st.w; }), inWP = inW.filter(function (p) { return !st.p || p.p === +st.p; });
        var B = keys(st.b), modelsFrom = B.length ? d.filter(function (p) { return B.indexOf(p.b) >= 0; }) : d;
        var res = list(), col = COLLECTIONS.filter(function (c) { return c.id === st.col; })[0];
        body.innerHTML = '<div class="listing">' +
          '<button type="button" class="flt-toggle" data-tgl>☰ الفلاتر والمقاسات</button>' +
          '<aside class="filters' + (st.open ? " open" : "") + '">' +
          "<h4>المقاس</h4>" +
          '<select data-f="w">' + opts(uniq(d.map(function (p) { return p.w; })).sort(byNum), "العرض", st.w) + "</select>" +
          '<select data-f="p">' + opts(uniq(inW.map(function (p) { return p.p; })).sort(byNum), "الارتفاع", st.p) + "</select>" +
          '<select data-f="r">' + opts(uniq(inWP.map(function (p) { return p.r; })).sort(byNum), "الجنط", st.r) + "</select>" +
          "<h4>الفئة</h4><div>" + chk("t", Object.keys(TYPES).map(function (k) { return [k, "إطارات " + TYPES[k]]; })) + "</div>" +
          '<h4>العلامة التجارية</h4><div class="chk-list">' + chk("b", count(d, function (p) { return p.b; }).map(function (x) { return [x, x]; })) + "</div>" +
          '<h4>الموديل</h4><div class="chk-list">' + chk("m", count(modelsFrom, function (p) { return p.m; }).slice(0, 60).map(function (x) { return [x, x]; })) + "</div>" +
          '<h4>بلد الصنع</h4><div class="chk-list">' + chk("c", count(d, function (p) { return p.c; }).map(function (x) { return [x, x]; })) + "</div>" +
          "<h4>سنة الصنع</h4><div>" + chk("y", uniq(d.map(function (p) { return p.y ? String(p.y) : ""; })).sort().reverse().map(function (x) { return [x, x]; })) + "</div>" +
          '<button type="button" class="btn btn-dark" style="width:100%;margin-top:12px" data-reset>مسح الفلاتر</button>' +
          "</aside><div>" +
          '<div class="toolbar"><b>' + res.length.toLocaleString("ar-SA") + " منتج" + (col ? " · كولكشن " + col.ar : "") + (st.q ? " · " + esc(st.q) : "") + "</b>" +
          '<select data-sort><option value="">الترتيب: الافتراضي</option><option value="pa"' + (st.sort === "pa" ? " selected" : "") + '>السعر: الأقل أولاً</option><option value="pd"' + (st.sort === "pd" ? " selected" : "") + '>السعر: الأعلى أولاً</option><option value="new"' + (st.sort === "new" ? " selected" : "") + ">الأحدث صنعاً</option></select></div>" +
          (res.length ? '<div class="grid">' + res.slice(0, st.shown).map(function (p) { return siteCard(p, logos); }).join("") + "</div>" : '<p class="k360-empty">ما لقينا إطارات بهذا الاختيار.</p>') +
          (res.length > st.shown ? '<button type="button" class="btn btn-primary k360-more" data-more>عرض المزيد</button>' : "") +
          "</div></div>";
      }
      body.addEventListener("change", function (e) {
        var t = e.target, k = t.getAttribute("data-k"), f = t.getAttribute("data-f");
        if (k) { st[k][t.value] = t.checked ? 1 : 0; if (k === "b") st.m = {}; }
        if (f) { st[f] = t.value; if (f === "w") { st.p = ""; st.r = ""; } if (f === "p") st.r = ""; }
        if (t.hasAttribute("data-sort")) st.sort = t.value;
        st.shown = 24; render();
      });
      body.addEventListener("click", function (e) {
                if (e.target.closest("[data-more]")) { st.shown += 24; render(); }
        if (e.target.closest("[data-reset]")) { st = { w: "", p: "", r: "", q: "", col: "", sort: "", shown: 24, t: {}, b: {}, m: {}, c: {}, y: {} }; render(); }
        if (e.target.closest("[data-tgl]")) { st.open = !st.open; render(); }
      });
      render();
    }).catch(function () { fail(body); });
  }

  function renderCatsPage(body) {
    var I = LOGO;
    body.innerHTML = '<div class="cats">' + CATS.map(function (c) {
      var inner = (c.soon ? '<span class="pill-soon abs">قريباً</span>' : "") + '<img src="' + I + c.icon + '" alt="' + c.name + '"><b>' + c.name + "</b><small>" + c.desc + "</small>";
      return c.soon ? '<div class="cat soon">' + inner + "</div>" : '<a class="cat" href="' + pageUrl("shop", { t: c.id, title: c.name }) + '">' + inner + "</a>";
    }).join("") + "</div>" +
      '<div class="sec-head" style="margin-top:32px"><h2>تسوّق حسب <span>الكولكشن</span></h2></div>' +
      '<div class="k360-chips">' + COLLECTIONS.map(function (c) { return '<a class="k360-chip" href="' + pageUrl("shop", { col: c.id, title: "كولكشن " + c.ar }) + '">' + c.ar + "</a>"; }).join("") + "</div>";
  }

  function initPage() {
    var q = new URLSearchParams(location.search), name = q.get("k360");
    if (!name || !PAGES[name] || document.querySelector(".k360-page")) return;
    var main = document.querySelector("main"); if (!main) return;
    [].forEach.call(main.children, function (c) { if (!/SALLA-HOOK/i.test(c.tagName)) c.style.display = "none"; });
    var title = q.get("title") || PAGES[name];
    var page = document.createElement("div");
    page.className = "k360-site k360-page";
    page.innerHTML = '<div class="page-head"><div class="wrap"><div class="crumbs"><a href="' + base() + '">الرئيسية</a> / <span>' + esc(title) + "</span></div><h1>" + esc(title) + "</h1></div></div>" +
      '<div class="wrap" style="padding:24px 16px 40px" data-page-body></div>';
    main.insertBefore(page, main.firstChild);
    document.title = title + " | كفرات 360";
    var body = page.querySelector("[data-page-body]");
    if (name === "shop") renderShopPage(body, q);
    if (name === "cats") renderCatsPage(body);
    if (name === "brands") body.innerHTML = '<div class="brands" data-k360="brands"></div>';
    if (name === "best") body.innerHTML = '<salla-products-list source="sales" source-value="[]"></salla-products-list>';
  }


  /* ---------- Salla product cards everywhere: website-style body (brand, meta, price, 2 / 4 tire packages) ---------- */
  var cardData = null;
  function cardInfo(cb) {
    if (cardData) return cb(cardData);
    Promise.all([load("products.json"), load("brands.json")]).then(function (res) {
      var m = {}, logos = {};
      res[0].forEach(function (p) { m[p.i] = p; });
      res[1].forEach(function (b) { if (b.logo) logos[b.i] = b.logo; });
      cardData = { m: m, logos: logos }; cb(cardData);
    }).catch(function () {});
  }
  function enhanceCard(cardEl) {
    if (cardEl.getAttribute("data-k360-cx")) return;
    var id = +cardEl.id; if (!id) return;
    cardEl.setAttribute("data-k360-cx", "1");
    cardInfo(function (D) {
      var p = D.m[id], content = cardEl.querySelector(".s-product-card-content"); if (!p || !content) return;
      var off = p.s && p.s < p.pr ? 1 : 0, u = price(p), logo = D.logos[p.bi];
      var box = document.createElement("div");
      box.className = "k360-site k360-cx";
      box.innerHTML =
        '<div class="card-brand">' + (logo ? '<img src="' + LOGO + esc(logo) + '" alt="">' : "") + "<span>" + esc(p.b) + "</span></div>" +
        '<div class="card-meta"><span>&#x1F6E1;&#xFE0F; ضمان ' + (p.g ? p.g + " سنوات" : "الوكيل") + "</span><span>" + esc(p.c || "") + (p.y ? " · " + p.y : "") + "</span></div>" +
        '<div class="price"><b>' + money(u) + "</b>" + (off ? "<s>" + money(p.pr) + "</s>" : "") + "<small>للإطار</small></div>" +
        '<div class="pkgs">' +
        '<button type="button" class="pkg" data-add="' + id + '" data-q="2"><span class="pkg-t">باقة كفرين</span><b>' + money(u * 2) + "</b>" + (off ? "<s>" + money(p.pr * 2) + "</s>" : "") + "<small>&#x1F6D2; أضف</small></button>" +
        '<button type="button" class="pkg hot" data-add="' + id + '" data-q="4"><i>مجموعة كاملة</i><span class="pkg-t">باقة 4 كفرات</span><b>' + money(u * 4) + "</b>" + (off ? "<s>" + money(p.pr * 4) + "</s>" : "") + "<small>&#x1F6D2; أضف</small></button></div>";
      content.appendChild(box);
      cardEl.classList.add("k360-has-pk");
    });
  }

  /* ---------- start ---------- */
  var INIT = { finder: initFinder, collections: initCollections, tabs: initTabs, garage: initGarage, shop: initShop, brands: initBrands };
  function scan() {
    initPage();
    document.querySelectorAll("[data-k360]:not([data-k360-on])").forEach(function (el) {
      var fn = INIT[el.getAttribute("data-k360")]; if (!fn) return;
      el.setAttribute("data-k360-on", "1"); fn(el);
    });
    var cards = document.querySelectorAll(".s-product-card-entry");
    for (var i = 0; i < cards.length; i++) { addRibbon(cards[i]); enhanceCard(cards[i]); }
    initPackages();
    initNav();
  }
  var queued = false;
  function queue() { if (queued) return; queued = true; setTimeout(function () { queued = false; scan(); }, 150); }
  function start() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-add]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      addToCart(+b.getAttribute("data-add"), +b.getAttribute("data-q"), b);
    }, true);
    load("brands.json").then(function (bs) { bs.forEach(function (x) { if (x.logo) LOGOS[x.i] = x.logo; }); }).catch(function () {}).then(scan);

    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    if (location.hash === "#k360-shop") setTimeout(function () { var s = document.getElementById("k360-shop"); if (s) s.scrollIntoView(); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
