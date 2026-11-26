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

  var DATA = "https://cdn.jsdelivr.net/gh/eyadshouk13-lab/kafarat360-theme@e7c1e33f20ca7352199d185905fec633191ef94b/data/";
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
      (shop.el.getAttribute("data-home") === "top" && !Object.keys(f).some(function (k) { return f[k]; })
        ? '<div class="k360-shop__main k360-shop__top"><div data-k360="top"></div></div></div>'
        : '<div class="k360-shop__main"><p class="k360-shop__count">' + list.length.toLocaleString("ar-SA") + " إطار" + (f.q ? " · بحث: " + esc(f.q) : "") + "</p>" +
          grid(list, shop.shown) +
          (list.length > shop.shown ? '<button type="button" class="k360-btn k360-btn--primary k360-more" data-more>عرض المزيد</button>' : "") +
          "</div></div>");
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
  var LOGO = "https://raw.githubusercontent.com/eyadshouk13-lab/kafarat360-theme/e7c1e33f20ca7352199d185905fec633191ef94b/";
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
    var links = [[home, "الصفحة الرئيسية", ""], [pageUrl("offers"), "&#x1F525; العروض", "offers"], [pageUrl("shop"), "جميع المنتجات", "shop"], [pageUrl("best"), "الأكثر مبيعاً", "best"],
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

  /* ---------- shared store links: footer + mobile drawer (Salla returns no menus) ---------- */
  var CITIES = [["riyadh", "الرياض"], ["jeddah", "جدة"], ["makkah", "مكة المكرمة"], ["dammam", "الدمام"], ["khobar", "الخبر"], ["ahsa", "الأحساء"], ["yanbu", "ينبع"], ["abha", "أبها"], ["hail", "حائل"]];
  function cityUrl(c) { return pageUrl("city", { c: c[0], title: "الإطارات في " + c[1] }); }
  function siteLinks() {
    var home = base().replace(/\/?$/, "/");
    var l = function (n, t) { return [pageUrl(n), t]; };
    return {
      shop: [[home, "الصفحة الرئيسية"], l("offers", "العروض"), l("shop", "جميع المنتجات"), l("best", "الأكثر مبيعاً"), l("cats", "جميع التصنيفات"), l("brands", "العلامات التجارية"), [home + "#k360-finder", "ابحث بالمقاس"], [home + "#k360-garage", "ماي جراش"]],
      about: [l("why", "من نحن")],
      areas: CITIES.map(function (c) { return [cityUrl(c), "الإطارات في " + c[1]]; }),
      cats: [[pageUrl("shop", { t: "car", title: TYPES.car }), "إطارات " + TYPES.car], [pageUrl("shop", { t: "suv", title: TYPES.suv }), "إطارات " + TYPES.suv], [pageUrl("shop", { t: "truck", title: TYPES.truck }), "إطارات " + TYPES.truck], [pageUrl("offers"), "عروض الإطارات"]],
      help: [l("sizes", "كيف تقرأ مقاس الإطار"), l("delivery", "التسليم والتركيب"), l("warranty", "ضمان الإطارات"), l("returns", "الإرجاع واسترداد المبلغ"), l("privacy", "سياسة الخصوصية"), l("terms", "الشروط والأحكام"), l("support", "خدمة العملاء")]
    };
  }

  function initFooter() {
    var f = document.querySelector(".store-footer"); if (!f || f.querySelector(".k360-foot")) return;
    var L = siteLinks();
    var pay = [].map.call(f.querySelectorAll(".s-payments-list img, [class*=payment] img"), function (i) { return i.getAttribute("src"); }).filter(Boolean);
    var grp = function (id, title, arr) { return '<details class="k360-foot__grp" data-g="' + id + '"><summary>' + title + "</summary><ul>" + arr.map(function (x) { return '<li><a href="' + x[0] + '">' + x[1] + "</a></li>"; }).join("") + "</ul></details>"; };
    var box = document.createElement("div");
    box.className = "k360-foot";
    box.innerHTML =
      '<div class="k360-foot__cta"><div><b>محتار في مقاس إطار سيارتك؟</b><span>فريقنا يساعدك تختار المناسب قبل الطلب.</span></div>' +
      '<div class="k360-foot__ctab"><a class="k360-fbtn k360-fbtn--call" href="tel:' + PHONE + '">اتصل بنا</a><a class="k360-fbtn k360-fbtn--wa" href="https://wa.me/' + PHONE.replace(/\D/g, "") + '" target="_blank" rel="noopener">واتساب</a></div></div>' +
      '<div class="k360-foot__in">' +
      '<div class="k360-foot__brand"><b>كفرات 360</b><p>إطارات أصلية بتواريخ جديدة من أشهر الماركات العالمية، توصيل وتركيب عند باب بيتك في كل مدن المملكة.</p></div>' +
      grp("about", "شركتنا", L.about) + grp("cats", "الإطارات", L.cats) + grp("areas", "مجالات الخدمة", L.areas) +
      '<details class="k360-foot__grp" data-g="brands"><summary>الماركات لدينا</summary><ul data-foot-brands><li><a href="' + pageUrl("brands") + '">كل الماركات</a></li></ul></details>' +
      grp("help", "المساعدة والمشورة", L.help) +
      '<details class="k360-foot__grp" data-g="contact"><summary>تواصل معنا</summary><ul><li><a href="tel:' + PHONE + '" dir="ltr">' + PHONE + '</a></li><li><a href="' + pageUrl("support") + '">خدمة العملاء</a></li></ul></details>' +
      "</div>" +
      '<div class="k360-foot__pay"><span>ادفع بثقة عبر</span>' + pay.map(function (s) { return '<img src="' + s + '" alt="" loading="lazy">'; }).join("") +
      BNPL_IMGS + "</div>" +
      '<div class="k360-foot__bar"><span>السجل التجاري 7040763810</span><span>&copy; ' + new Date().getFullYear() + " كفرات 360. جميع الحقوق محفوظة.</span></div>";
    Array.prototype.forEach.call(f.children, function (c) { c.style.display = "none"; });
    f.appendChild(box);
    if (window.innerWidth >= 768) [].forEach.call(box.querySelectorAll("details"), function (d) { d.open = true; });
    load("brands.json").then(function (bs) {
      var ul = box.querySelector("[data-foot-brands]"); if (!ul) return;
      ul.innerHTML = bs.filter(function (b) { return b.n > 0; }).sort(function (a, b) { return b.n - a.n; }).map(function (b) { return '<li><a href="' + pageUrl("shop", { b: b.ar, title: "إطارات " + b.ar }) + '">إطارات ' + esc(b.ar) + "</a></li>"; }).join("") + '<li><a href="' + pageUrl("brands") + '">كل الماركات</a></li>';
    }).catch(function () {});
  }
  function initDrawer() {
    var ul = document.querySelector(".mm-ocd .main-menu"); if (!ul || ul.children.length) return;
    ul.innerHTML = siteLinks().shop.map(function (l) { return '<li><a href="' + l[0] + '">' + l[1] + "</a></li>"; }).join("");
  }

  /* ---------- hero video: hide YouTube's own pause mark, never stay paused ---------- */
  function initHeroVideo() {
    var f = document.querySelector(".k360-hero__over iframe");
    if (!f || f.getAttribute("data-k360-yt")) return;
    f.setAttribute("data-k360-yt", "1");
    var box = f.parentElement; box.classList.add("is-wait");
    if (!/enablejsapi=1/.test(f.src)) f.src = f.src + "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
    function boot() {
      try {
        var pl = new YT.Player(f, { events: {
          onReady: function (e) { try { e.target.mute(); e.target.playVideo(); } catch (_) {} },
          onStateChange: function (e) {
            if (e.data === 1) box.classList.remove("is-wait");
            if (e.data === 0) { try { e.target.seekTo(0, true); e.target.playVideo(); } catch (_) {} }
            else if (e.data === 2 || e.data === 5) { try { e.target.playVideo(); } catch (_) {} }
          }
        } });
        /* watchdog: if the clip ever stops, start it again */
        setInterval(function () {
          try {
            var st = pl.getPlayerState && pl.getPlayerState();
            if (st === 0) { pl.seekTo(0, true); pl.playVideo(); }
            else if (st === 2 || st === 5 || st === -1) pl.playVideo();
          } catch (_) {}
        }, 1500);
      } catch (_) { box.classList.remove("is-wait"); }
    }
    if (window.YT && YT.Player) boot();
    else {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); boot(); };
      var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    }
    setTimeout(function () { box.classList.remove("is-wait"); }, 9000);
  }

  /* ---------- offer slider under the hero: autoplay, dots, swipe ---------- */
  function initSlider(el) {
    var rail = el.querySelector(".k360-ofr__rail"), dots = el.querySelector("[data-dots]"); if (!rail || !dots) return;
    var slides = rail.children, n = slides.length, i = 0, timer = null, sx = null, swiped = false; if (n < 2) return;
    dots.innerHTML = [].map.call(slides, function (_, k) { return '<button type="button" aria-label="' + (k + 1) + '"></button>'; }).join("");
    function go(k) {
      i = (k + n) % n; rail.style.transform = "translateX(" + (-i * 100) + "%)";
      [].forEach.call(dots.children, function (d, j) { d.classList.toggle("is-on", j === i); });
    }
    function play() { clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 5500); }
    dots.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; go([].indexOf.call(dots.children, b)); play(); });
    var view = el.querySelector(".k360-ofr__view");
    view.addEventListener("pointerdown", function (e) { sx = e.clientX; clearInterval(timer); });
    view.addEventListener("pointerup", function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { swiped = true; setTimeout(function () { swiped = false; }, 80); go(i + (dx < 0 ? 1 : -1)); }
      play();
    });
    view.addEventListener("pointercancel", function () { sx = null; play(); });
    view.addEventListener("click", function (e) { if (swiped) e.preventDefault(); }, true);
    go(0); play();
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
          '<span class="pkg-ic">' + (n === 2 ? "&#x1F6DE;&#x1F6DE;" : "&#x1F6DE;&#x1F6DE;&#x1F6DE;&#x1F6DE;") + "</span><span><b>" + title + "</b><small>" + (n === 4 && offerOn() ? "اشترِ 3 والرابع مجاناً" : sub) + "</small></span><em>" + money(tiresCost(u, n)) +
          (off || (n === 4 && offerOn()) ? '<s style="display:block;font-size:12px;color:var(--muted);font-weight:400">' + money(p.pr * n) + "</s>" : "") + "</em></label>";
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
        tot.textContent = money(tiresCost(u, n));
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

  /* ---------- moving ribbon on the product page image ---------- */
  function initPageRibbon() {
    var cfg = window.salla && salla.config;
    if (!cfg || cfg.get("page.slug") !== "product.single") return;
    var slider = document.querySelector("salla-slider.details-slider"); if (!slider || slider.querySelector(".k360-rib")) return;
    var box = slider.querySelector(".swiper") || slider;
    var promo = document.querySelector(".product-single .s-product-card-promotion-title, .main-content [class*=promotion-title]");
    var m = promo && promo.textContent.match(/([0-9٠-٩]+)\s*%/);
    var msg = m ? "خصم حصري " + m[1] + "% ✦ ضمان الوكيل" : "إطارات أصلية ✦ ضمان الوكيل";
    var seg = ""; for (var i = 0; i < 4; i++) seg += "<span>" + msg + "</span><i>✦</i>";
    var dv = document.createElement("div");
    dv.className = "k360-rib k360-rib--pd" + (m ? "" : " k360-rib--alt"); dv.setAttribute("aria-hidden", "true");
    dv.innerHTML = '<div class="k360-rib__track"><div>' + seg + "</div><div>" + seg + "</div></div>";
    if (getComputedStyle(box).position === "static") box.style.position = "relative";
    box.appendChild(dv);
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
  /* ---------- Black Friday offer: buy 3, get the 4th free ----------
     Shown to customers only when OFFERS_LIVE is true (or while previewing with ?offers=1).
     The matching "buy 3 get 1 free" special offer must exist in Salla, otherwise the cart charges 4 tires. */
  var OFFERS_LIVE = true;
  function offerOn() {
    try {
      if (/[?&]offers=1(&|$)/.test(location.search)) sessionStorage.setItem("k360-offers", "1");
      if (/[?&]offers=0(&|$)/.test(location.search)) sessionStorage.removeItem("k360-offers");
      return OFFERS_LIVE || sessionStorage.getItem("k360-offers") === "1";
    } catch (e) { return OFFERS_LIVE; }
  }
  var PAYLOGO = "https://cdn.jsdelivr.net/gh/eyadshouk13-lab/kafarat360-theme@3c0415ceb5f9e34ac6ece8b5bd6d55cc5a8d85ee/pay/";
  var BNPL_IMGS = '<img class="k360-bn tabby" src="' + PAYLOGO + 'tabby.svg" alt="Tabby" loading="lazy"><img class="k360-bn tamara" src="' + PAYLOGO + 'tamara.svg" alt="Tamara" loading="lazy"><img class="k360-bn mispay" src="' + PAYLOGO + 'mispay.png" alt="MISpay" loading="lazy">';
  var BNPL = '<div class="k360-bnpl"><span>قسّطها مع</span>' + BNPL_IMGS + "</div>";
  function tiresCost(u, n) { return offerOn() ? u * (n - Math.floor(n / 4)) : u * n; }
  function pk4(p, u, id) {
    var on = offerOn(), off = p.s && p.s < p.pr, was = on ? p.pr * 4 : (off ? p.pr * 4 : 0);
    return '<button type="button" class="pkg hot" data-add="' + id + '" data-q="4"><i>' + (on ? "اشترِ 3 والرابع مجاناً" : "مجموعة كاملة") + '</i><span class="pkg-t">باقة 4 كفرات</span><b>' + money(tiresCost(u, 4)) + "</b>" + (was ? "<s>" + money(was) + "</s>" : "") + "<small>&#x1F6D2; أضف</small></button>";
  }

  var PAGES = { offers: "عروض الجمعة البيضاء", shop: "جميع المنتجات", best: "الأكثر مبيعاً", cats: "جميع التصنيفات", brands: "العلامات التجارية",
    areas: "مجالات الخدمة", city: "الإطارات في مدينتك", why: "من نحن", delivery: "التسليم والتركيب", warranty: "ضمان الإطارات", returns: "الإرجاع واسترداد المبلغ",
    privacy: "سياسة الخصوصية", terms: "الشروط والأحكام", support: "خدمة العملاء", sizes: "كيف تقرأ مقاس الإطار" };
  var PHONE = "+966555023836";
  var INFO = {
    why: '<div class="k360-about">' +
      '<section class="ab-hero"><span class="ab-tag">من نحن</span><h2>كفرات 360… متجر متخصص بالإطارات فقط</h2>' +
      '<p>نجمع لك الإطارات الأصلية من أشهر الماركات العالمية في مكان واحد، بتواريخ إنتاج حديثة وأسعار واضحة، ونوصّلها ونركّبها عند باب بيتك في كل مدن المملكة.</p>' +
      '<div class="ab-btns"><a class="k360-btn k360-btn--primary" href="@finder">ابحث عن كفرات سيارتك</a><a class="k360-btn k360-btn--ghost" href="@shop">تسوّق الآن</a></div></section>' +
      '<section class="ab-stats"><div><b data-st="tires">850+</b><span>إطار متوفر</span></div><div><b data-st="brands">23</b><span>علامة تجارية</span></div><div><b>كل المدن</b><span>توصيل وتركيب</span></div><div><b>الوكيل</b><span>ضمان معتمد</span></div></section>' +
      '<section><h3>رسالتنا</h3><p>شراء الإطارات كان يعني البحث عن المقاس، ثم مقارنة الأسعار، ثم الذهاب للتركيب. في كفرات 360 اختصرنا كل هذا في خطوة واحدة: تختار إطارك، وندفع معك بسهولة، وفريقنا يوصّله ويركّبه عندك.</p></section>' +
      '<section><h3>ماذا نقدّم لك</h3><div class="ab-grid">' +
      '<div class="ab-card"><i>&#9881;</i><b>إطارات أصلية</b><p>ماركات عالمية موثوقة لسيارات الركاب والـ SUV والدفع الرباعي، بتواريخ إنتاج حديثة.</p></div>' +
      '<div class="ab-card"><i>&#128666;</i><b>توصيل وتركيب</b><p>نصلك أينما كنت في المملكة، ونركّب الإطارات عند باب بيتك.</p></div>' +
      '<div class="ab-card"><i>&#128737;</i><b>ضمان الوكيل</b><p>إطاراتنا تُباع بضمان الوكيل، وتظهر مدة الضمان في صفحة كل منتج.</p></div>' +
      '<div class="ab-card"><i>&#128179;</i><b>دفع مرن</b><p>ادفع إلكترونياً أو قسّط مشترياتك مع شركات التقسيط الشريكة.</p></div>' +
      '</div></section>' +
      '<section><h3>كيف نعمل</h3><ol class="ab-steps"><li><b>اختر المقاس</b><span>بحث بمقاس الإطار أو بنوع سيارتك.</span></li><li><b>قارن واختر</b><span>أسعار وخصومات الباقات أمامك بوضوح.</span></li><li><b>أتمم الطلب</b><span>دفع آمن وطرق متعددة.</span></li><li><b>نوصّل ونركّب</b><span>عند باب بيتك وفي الموعد المتفق عليه.</span></li></ol></section>' +
      '<section><h3>وعدنا لك</h3><ul class="ab-list"><li>أسعار واضحة بدون رسوم مخفية.</li><li>إطارات أصلية من مصادر معتمدة.</li><li>مساعدة حقيقية في اختيار المقاس المناسب لسيارتك.</li><li>فريق يرد عليك ويتابع طلبك حتى التركيب.</li></ul></section>' +
      '<section class="ab-info"><h3>بيانات المتجر</h3><dl><dt>الاسم التجاري</dt><dd>كفرات 360</dd><dt>السجل التجاري</dt><dd>7040763810</dd><dt>الدولة</dt><dd>المملكة العربية السعودية</dd><dt>للتواصل</dt><dd dir="ltr"><a href="tel:' + PHONE + '">' + PHONE + '</a></dd></dl></section>' +
      '<section class="ab-cta"><b>جاهز تغيّر كفرات سيارتك؟</b><a class="k360-btn k360-btn--primary" href="@shop">تصفّح الإطارات</a></section></div>',
    delivery: '<h2>الإطارات توصلك وين ما تبغى</h2><p>سهّلنا عليك شراء الإطارات من البداية إلى التركيب:</p><ol>' +
      '<li><b>تسوّق من متجرنا</b><br>ابحث عن إطارك بين أكثر من 850 إطاراً من 25 ماركة عالمية.</li>' +
      '<li><b>اختر المقاس الصحيح</b><br>استخدم خاصية البحث بالمقاس أو بنوع السيارة، ثم أضف الإطارات إلى السلة (كفرين أو 4 كفرات).</li>' +
      '<li><b>ادفع بأمان</b><br>أتمم الطلب وادفع إلكترونياً عبر طرق الدفع المتاحة في المتجر.</li>' +
      '<li><b>حدد التوصيل والتركيب</b><br>نوصّل إطاراتك ونركّبها عند باب بيتك في كل مدن المملكة.</li>' +
      '<li><b>انطلق</b><br>ركّب، واستمتع برحلة آمنة.</li></ol><p>عندك سؤال؟ تواصل معنا عبر صفحة <a href="@support">خدمة العملاء</a>.</p>',
    warranty: '<h2>ضمان الإطارات</h2><h3>ما هو الضمان؟</h3><p>هو التزام من الجهة المصنِّعة أو الوكيل بإصلاح أو استبدال المنتج إذا ظهر فيه عيب في المواد أو التصنيع خلال مدة محددة.</p>' +
      '<h3>ضمان الوكيل</h3><p>إطاراتنا تُباع بضمان الوكيل، وتظهر مدة الضمان في صفحة كل منتج.</p>' +
      '<h3>ماذا يشمل؟</h3><p>العيوب التي تقع ضمن مسؤولية المصنِّع، مثل جودة التصنيع أو المواد الخام.</p>' +
      '<h3>ماذا لا يشمل؟</h3><p>الأضرار الناتجة عن سوء الصيانة، أو حالة السيارة الميكانيكية، أو الحوادث، أو القيادة بإطار بلا ضغط هواء، أو التلف المتعمد.</p>' +
      '<h3>إثبات الشراء</h3><p>احتفظ بفاتورة الشراء، وتاريخ إنتاج الإطار مطبوع على جدار الإطار (رمز DOT).</p><p>للاستفادة من الضمان تواصل معنا عبر <a href="@support">خدمة العملاء</a>.</p>',
    returns: '<h2>الإرجاع واسترداد المبلغ</h2><p>إذا لاحظت خطأً في طلبك أو رغبت في إرجاعه، أبلغ خدمة العملاء وسنساعدك بأسرع وقت.</p>' +
      '<h3>شروط الإرجاع</h3><ul><li>يُقبل طلب الإرجاع خلال 7 أيام من استلام الطلب.</li><li>يجب أن يكون الإطار سليماً، غير مستخدم، وغير مركّب على السيارة.</li><li>لا يمكن إرجاع الإطارات بعد تركيبها، لذا تأكد من المقاس والمواصفات قبل التركيب.</li></ul>' +
      '<h3>الاسترداد</h3><p>يُعاد المبلغ بنفس طريقة الدفع بعد فحص المنتج المرتجع. رسوم التوصيل والتركيب غير مستردة إذا تمت الخدمة.</p>' +
      '<h3>منتج خاطئ أو تالف</h3><p>إذا وصلك منتج مختلف عن طلبك أو تالف، تواصل معنا فوراً مع صورة للمنتج وسنرتب الاستبدال.</p>' +
      '<h3>إلغاء الطلب من طرفنا</h3><p>نحتفظ بحق إلغاء الطلب في حال وجود خطأ في السعر أو في المعلومات المعروضة أو عدم توفر المخزون، وسنتواصل معك ونعيد لك المبلغ كاملاً.</p>',
    privacy: '<h2>سياسة الخصوصية</h2><p>نحترم خصوصيتك في كفرات 360، وتوضح هذه السياسة كيف نتعامل مع بياناتك الشخصية.</p>' +
      '<h3>البيانات التي نجمعها</h3><p>الاسم، رقم الجوال، البريد الإلكتروني، عنوان التوصيل، وبيانات الطلبات، إضافة إلى بيانات التصفح عبر ملفات تعريف الارتباط.</p>' +
      '<h3>كيف نستخدمها</h3><ul><li>معالجة طلباتك وتوصيلها وتركيبها.</li><li>التواصل معك بخصوص الطلب والدعم.</li><li>تحسين تجربتك في المتجر.</li></ul>' +
      '<h3>مشاركة البيانات</h3><p>لا نبيع بياناتك. نشاركها فقط مع الجهات اللازمة لإتمام طلبك، مثل شركات الشحن ومزودي الدفع ومنصة سلة التي يعمل عليها المتجر.</p>' +
      '<h3>حماية البيانات</h3><p>نتخذ إجراءات مناسبة لحماية بياناتك، ولا نخزّن بيانات بطاقاتك الدفع لدينا.</p>' +
      '<h3>حقوقك</h3><p>يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها وفق نظام حماية البيانات الشخصية في المملكة العربية السعودية، عبر التواصل معنا.</p>',
    terms: '<h2>الشروط والأحكام</h2><p>باستخدامك متجر كفرات 360 فإنك توافق على الشروط التالية.</p>' +
      '<h3>الطلبات والأسعار</h3><p>الأسعار بالريال السعودي وقد تتغير دون إشعار مسبق. يتم تأكيد الطلب بعد إتمام الدفع، ونحتفظ بحق إلغاء أي طلب في حال وجود خطأ في السعر أو توفر المنتج.</p>' +
      '<h3>اختيار المقاس</h3><p>مسؤولية التأكد من مقاس ومواصفات الإطار المناسبة لسيارتك تقع على العميل، ونحن جاهزون لمساعدتك قبل الشراء.</p>' +
      '<h3>الدفع</h3><p>تتم المدفوعات إلكترونياً عبر طرق الدفع المتاحة في المتجر.</p>' +
      '<h3>التوصيل والتركيب</h3><p>نوصّل ونركّب في كل مدن المملكة وفق ما تحدده عند إتمام الطلب. التفاصيل في صفحة <a href="@delivery">التسليم والتركيب</a>.</p>' +
      '<h3>الضمان والإرجاع</h3><p>تسري <a href="@warranty">سياسة الضمان</a> و<a href="@returns">سياسة الإرجاع</a> على جميع الطلبات.</p>' +
      '<h3>الملكية الفكرية</h3><p>جميع محتويات المتجر من شعارات وصور ونصوص مملوكة لكفرات 360 أو لأصحاب العلامات التجارية، ولا يجوز نسخها دون إذن.</p>' +
      '<h3>حدود المسؤولية</h3><p>لا نتحمل مسؤولية الأضرار غير المباشرة الناتجة عن استخدام المتجر، وفق ما يسمح به النظام.</p>' +
      '<h3>النظام المطبق</h3><p>تخضع هذه الشروط لأنظمة المملكة العربية السعودية.</p>',
    support: '<h2>خدمة العملاء</h2><p>فريقنا جاهز لمساعدتك في اختيار الإطارات والمقاس والطلبات.</p><h3>اتصل بنا</h3><p><a href="tel:' + PHONE + '" dir="ltr">' + PHONE + '</a></p><p>السجل التجاري: 7040763810</p>',
    sizes: '<h2>كيف تقرأ مقاس الإطار</h2><p>تجد على جدار الإطار رقماً مثل <b dir="ltr">205/55R16</b>:</p><ul><li><b>205</b>: عرض الإطار بالملم.</li><li><b>55</b>: ارتفاع الجدار كنسبة مئوية من العرض.</li><li><b>R</b>: نوع البناء (راديال).</li><li><b>16</b>: قطر الجنط بالإنش.</li></ul><p>وغالباً بعده رقم حمل وحرف سرعة مثل <b dir="ltr">91V</b>. تستطيع أيضاً البحث بنوع سيارتك أو باسم الإطار من <a href="@finder">باحث المقاس</a>.</p>'
  };
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
      pk4(p, u, p.i) +
      "</div>" + BNPL + "</div></article>";
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

  /* ---------- Black Friday moving bar above the header ---------- */
  function initOfferBar() {
    if (!offerOn() || document.querySelector(".k360-bar")) return;
    var header = document.querySelector(".store-header"); if (!header) return;
    var msgs = ["الجمعة البيضاء &#x2726; اشترِ 3 كفرات واحصل على الرابع مجاناً", "عروض الجمعة البيضاء على إطارات الماركات العالمية", "توصيل وتركيب عند باب بيتك في كل مدن المملكة", "ضمان الوكيل على الإطارات"];
    var seg = msgs.map(function (m) { return "<span>" + m + "</span>"; }).join("<i>&#x2726;</i>") + "<i>&#x2726;</i>";
    var bar = document.createElement("a");
    bar.className = "k360-bar"; bar.href = pageUrl("offers");
    bar.innerHTML = '<div class="k360-bar__track"><div>' + seg + seg + '</div><div aria-hidden="true">' + seg + seg + "</div></div>";
    header.parentNode.insertBefore(bar, header);
    document.body.classList.add("k360-has-bar");
  }

  /* ---------- offers page: every offer + the products it covers ---------- */
  function renderOffersPage(body) {
    var on = offerOn();
    body.innerHTML = '<p class="k360-hint">جارٍ تحميل العروض…</p>';
    cardInfo(function (D) {
      var all = Object.keys(D.m).map(function (k) { return D.m[k]; });
      var disc = all.filter(function (p) { return p.s && p.s < p.pr; }).sort(function (a, b) { return (b.pr - b.s) / b.pr - (a.pr - a.s) / a.pr; });
      var max = disc.length ? Math.round((1 - disc[0].s / disc[0].pr) * 100) : 0;
      var offers = [];
      if (on) offers.push({ id: "bf", big: "3 + 1", t: "اشترِ 3 واحصل على 1 مجاناً", d: "اطلب طقم 4 كفرات وادفع ثمن 3 فقط." });
      if (disc.length) offers.push({ id: "disc", big: "حتى " + max + "%", t: "خصومات على " + disc.length.toLocaleString("ar-SA") + " إطار", d: "أسعار مخفضة على إطارات مختارة من الماركات العالمية." });
      var st = { tab: on ? "bf" : "disc", shown: 24 };
      function render() {
        var list = st.tab === "disc" ? disc : all;
        body.innerHTML = '<div class="k360-offers">' + offers.map(function (o) {
          return '<button type="button" class="k360-offer' + (st.tab === o.id ? " is-on" : "") + '" data-o="' + o.id + '"><b>' + o.big + "</b><span><strong>" + o.t + "</strong><small>" + o.d + "</small></span></button>";
        }).join("") + "</div>" +
          '<p class="k360-shop__count">' + list.length.toLocaleString("ar-SA") + " إطار" + (st.tab === "bf" ? " ضمن عرض 3 + 1" : " بخصم") + "</p>" +
          '<div class="grid">' + list.slice(0, st.shown).map(function (p) { return siteCard(p, D.logos); }).join("") + "</div>" +
          (list.length > st.shown ? '<button type="button" class="btn btn-primary k360-more" data-more>عرض المزيد</button>' : "");
      }
      body.onclick = function (e) {
        var o = e.target.closest("[data-o]"); if (o) { st.tab = o.getAttribute("data-o"); st.shown = 24; render(); }
        if (e.target.closest("[data-more]")) { st.shown += 24; render(); }
      };
      if (!offers.length) { body.innerHTML = '<p class="k360-empty">لا توجد عروض حالياً.</p>'; return; }
      render();
    });
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
    if (name === "offers") renderOffersPage(body);
    if (name === "shop") renderShopPage(body, q);
    if (name === "cats") renderCatsPage(body);
    if (name === "brands") body.innerHTML = '<div class="brands" data-k360="brands"></div>';
    if (name === "areas") body.innerHTML = '<div class="k360-about"><section><p>اطلب إطاراتك من كفرات 360 وركّبها في مراكز الخدمة المعتمدة المنتشرة في مدن المملكة. اختر مدينتك لترى مراكز التركيب فيها وتحصل على الاتجاهات، وإذا مدينتك غير مذكورة تواصل معنا.</p></section>' +
      '<div class="ar-grid">' + CITIES.map(function (c) { return '<a class="ar-card" href="' + cityUrl(c) + '"><b>الإطارات في ' + c[1] + "</b><span>مراكز التركيب &larr;</span></a>"; }).join("") + "</div>" +
      CITIES.map(function (c) { return BR[c[0]] ? "<section><h3>مراكز الخدمة والتركيب في " + c[1] + "</h3>" + brCards(BR[c[0]]) + "</section>" : ""; }).join("") + "</div>";
    if (name === "city") renderCityPage(body, q.get("c"));
    if (name === "best") body.innerHTML = '<salla-products-list source="sales" source-value="[]"></salla-products-list>';
    if (INFO[name]) body.innerHTML = '<article class="k360-doc">' + INFO[name].replace(/href="@(\w+)"/g, function (m, n) { return 'href="' + (n === "finder" ? base().replace(/\/?$/, "/") + "#k360-finder" : pageUrl(n)) + '"'; }) + "</article>";
    if (name === "why") load("brands.json").then(function (bs) {
      var live = bs.filter(function (b) { return b.n > 0; }), sum = live.reduce(function (a, b) { return a + b.n; }, 0);
      var t = body.querySelector('[data-st="tires"]'), n = body.querySelector('[data-st="brands"]');
      if (t) t.textContent = (Math.floor(sum / 50) * 50).toLocaleString("ar-SA") + "+";
      if (n) n.textContent = live.length.toLocaleString("ar-SA");
    }).catch(function () {});
  }

  /* ---------- service areas: one page per city ---------- */
  var GM = "https://www.google.com/maps?q=";
  var BR = {
    riyadh: [["ميشلان", "الرياض – العليا", GM + "24.6881519,46.6872255"], ["بريجستون", "الرياض – الملز", GM + "24.6940456,46.7286636"], ["بريجستون", "الرياض – الربيع", GM + "24.8062754,46.6713686"]],
    jeddah: [["ميشلان", "جدة – فرع 01", GM + encodeURIComponent("مركز الثريا العالمية التجاريه للإطارات، طريق مكة القديم، جدة 22335")], ["بريجستون", "جدة – فرع 02", GM + "21.5301408,39.1843234"]],
    makkah: [["بريجستون", "مكة المكرمة – فرع 01", GM + "21.3916258,39.8126863"]],
    dammam: [["ميشلان", "الدمام – فرع 01", GM + "26.421924591064453,50.08843231201172"], ["بريجستون", "الدمام – فرع 02", GM + encodeURIComponent("6501 طريق عثمان بن عفان، حي البادية، الدمام 32243")]],
    khobar: [["ميشلان", "الخبر – فرع 01", GM + "26.34339,50.19569"], ["ميشلان", "الخبر – فرع 02", GM + "26.34327,50.19661"], ["فايرستون", "الخبر – فرع 03", GM + "26.3500383,50.1933356"]],
    ahsa: [["فرع الأحساء", "الأحساء – فرع 01", "https://www.google.com/maps?cid=15094289712075048423"]],
    yanbu: [["بريجستون", "ينبع – فرع 01", GM + "24.0727628,38.1070446"]],
    abha: [["بريجستون", "أبها – فرع 01", GM + "18.2564326,42.6329635"]],
    hail: [["بريجستون", "حائل – فرع 01", GM + "27.4900556,41.7079103"]]
  };
  function brCards(list) {
    return '<div class="br-grid">' + list.map(function (b) {
      return '<div class="br-card"><span class="br-tag">' + esc(b[0]) + "</span><b>" + esc(b[1]) + '</b><a class="k360-btn k360-btn--ghost" href="' + b[2] + '" target="_blank" rel="noopener">&#128205; الاتجاهات</a></div>';
    }).join("") + "</div>";
  }
  var CITYIMG = "https://cdn.jsdelivr.net/gh/eyadshouk13-lab/kafarat360-theme@ffa568665dfe712671551af83632e935f6a32ede/city/";
  var CITYCR = {
    riyadh: ["B.alotaby", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Riyadh_Skyline.jpg"],
    jeddah: ["Joseph Azrak", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Jeddah_Corniche_at_night.jpg"],
    makkah: ["King Eliot", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Clock_Tower_Makkah_2.jpg"],
    dammam: ["King Eliot", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Dammam_Corniche.jpg"],
    khobar: ["Francisco Anzola", "CC BY 2.0", "https://commons.wikimedia.org/wiki/File:Al_Khobar_Corniche_(12482233074).jpg"],
    ahsa: ["Ondřej Havelka", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Al-Qarah_Mountain,_Saudi_Arabia.jpg"],
    yanbu: ["Richard Mortel", "CC BY 2.0", "https://commons.wikimedia.org/wiki/File:General_view_of_Yanbu_al-Nakhl,_Saudi_Arabia_(1).jpg"],
    abha: ["Basheer Olakara", "CC BY 2.0", "https://commons.wikimedia.org/wiki/File:Green_Mountain_-_Abha,_Saudi_Arabia_(6702611457).jpg"],
    hail: ["Pointedstick", "CC0", "https://commons.wikimedia.org/wiki/File:Hail_heritage.jpg"]
  };
  var CITY_SIZES = ["265/70 R17", "215/55 R17", "235/45 R18", "285/50 R20", "245/45 R20", "255/50 R20", "275/60 R20", "235/55 R18", "215/60 R16", "195/65 R15", "265/65 R18", "265/65 R17"];
  function renderCityPage(body, slug) {
    var c = null; CITIES.forEach(function (x) { if (x[0] === slug) c = x; });
    if (!c) { body.innerHTML = '<p>المدينة غير موجودة. <a href="' + pageUrl("areas") + '">كل مجالات الخدمة</a></p>'; return; }
    var n = c[1], home = base().replace(/\/?$/, "/");
    document.title = "شراء إطارات في " + n + " | مراكز تركيب معتمدة | كفرات 360";
    var faq = [
      ["أين أشتري إطارات أصلية في " + n + "؟", "تقدّم كفرات 360 إطارات أصلية في " + n + " من ماركات موثوقة مثل ميشلان وبريجستون وكونتيننتال وجوديير وبيريللي وكومهو وغيرها. اطلب من المتجر ونوصّل ونركّب عند بابك."],
      ["كيف يتم الاستلام والتركيب في " + n + "؟", "بعد إتمام طلبك نتواصل معك ونوجّهك إلى مركز الخدمة الأنسب لك في " + n + " لتركيب إطاراتك."],
      ["أين أركّب إطاراتي في " + n + "؟", "في مراكز الخدمة والتركيب المعتمدة المذكورة في هذه الصفحة، مع زر الاتجاهات لكل مركز."],
      ["كيف أعرف المقاس المناسب؟", 'مقاس الإطار مكتوب على جدار الإطار الحالي، مثل 265/70 R17. ابحث بالمقاس في المتجر، أو راجع <a href="' + pageUrl("sizes") + '">دليل قراءة المقاس</a>، أو تواصل معنا ونساعدك.'],
      ["هل الإطارات مضمونة؟", "نعم، تُباع إطاراتنا بضمان الوكيل، وتظهر مدة الضمان في صفحة كل منتج. التفاصيل في صفحة <a href=\"" + pageUrl("warranty") + '">ضمان الإطارات</a>.']
    ];
    body.innerHTML = '<div class="k360-about">' +
      '<section class="ab-hero ct" style="background-image:url(' + CITYIMG + slug + '.webp)"><span class="ab-tag">' + n + '</span><h2>اشترِ إطارات في ' + n + '… وركّبها في مركز خدمة قريب</h2><p>إطارات أصلية من أشهر الماركات العالمية، وتركيب احترافي في مراكز الخدمة المعتمدة في ' + n + '.</p>' +
      '<div class="ab-btns"><a class="k360-btn k360-btn--primary" href="' + home + '#k360-finder">ابحث بمقاس سيارتك</a><a class="k360-btn k360-btn--ghost" href="' + pageUrl("shop") + '">تسوّق الإطارات</a></div>' +
      (CITYCR[slug] && CITYCR[slug][1] !== "CC0" ? '<small class="ab-credit">صورة: <a href="' + CITYCR[slug][2] + '" target="_blank" rel="noopener">' + esc(CITYCR[slug][0]) + "</a> · " + CITYCR[slug][1] + " · Wikimedia Commons</small>" : "") + "</section>" +
      '<section><div class="ab-grid"><div class="ab-card"><i>&#128722;</i><b>اطلب أونلاين</b><p>اختر مقاسك وأتمم الطلب من المتجر بسهولة.</p></div><div class="ab-card"><i>&#9881;</i><b>تركيب في مراكز الخدمة</b><p>نوجّهك إلى مركز خدمة معتمد قريب منك في ' + n + '.</p></div><div class="ab-card"><i>&#128737;</i><b>إطارات أصلية</b><p>ضمان الوكيل وتواريخ إنتاج حديثة.</p></div><div class="ab-card"><i>&#128172;</i><b>دعم في اختيار المقاس</b><p>فريقنا يساعدك تختار المناسب لسيارتك.</p></div></div></section>' +
      (BR[slug] ? '<section><h3>مراكز الخدمة والتركيب في ' + n + "</h3><p>بعد الشراء نوجّهك إلى أقرب مركز خدمة لتركيب إطاراتك.</p>" + brCards(BR[slug]) + "</section>" : "") +
      '<section><h3>ماركات الإطارات المتوفرة في ' + n + '</h3><div class="brands" data-k360="brands"></div></section>' +
      '<section><h3>مقاسات شائعة في ' + n + '</h3><p>تبحث عن مقاس معيّن؟ هذه أكثر المقاسات طلباً، سواء لسيارة سيدان أو SUV أو بيك آب.</p><div class="ar-sizes">' +
      CITY_SIZES.map(function (s) { return '<a href="' + home + "search?q=" + encodeURIComponent(s) + '">' + s + "</a>"; }).join("") + "</div></section>" +
      '<section><h3>أسئلة شائعة عن الإطارات في ' + n + '</h3><div class="ar-faq">' + faq.map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div></section>" +
      '<section class="ab-cta"><b>جاهز تغيّر كفرات سيارتك في ' + n + '؟</b><a class="k360-btn k360-btn--primary" href="' + pageUrl("shop") + '">تصفّح الإطارات</a></section></div>';
  }

  /* ---------- brand pages (b/brand-<id>): banner + history of the brand above Salla's product list ---------- */
  var BINFO = {
    Michelin: { c: "فرنسا", y: "1889", t: "ريادة في الأمان والعمر الطويل", s: "تأسست ميشلان عام 1889 في مدينة كليرمون فيران الفرنسية. ابتكرت الإطار الراديال عام 1946 وغيّرت به صناعة الإطارات، وهي معروفة بالتوازن بين التماسك على الطريق وطول العمر وتوفير الوقود.", f: ["الإطار الراديال: 1946", "المقر: كليرمون فيران، فرنسا", "الشخصية الشهيرة: بيبندوم (رجل ميشلان)"] },
    Bridgestone: { c: "اليابان", y: "1931", t: "أكبر مصنّع للإطارات في العالم", s: "أسس شوجيرو إيشيباشي بريجستون عام 1931 في اليابان، واسم الشركة مأخوذ من اسمه (إيشي = حجر، باشي = جسر). تقدّم إطارات لسيارات الركاب والـ SUV والشاحنات بخبرة عالمية.", f: ["التأسيس: 1931، كورومي، اليابان", "تملك علامة فايرستون", "إطارات للركاب والـ SUV والشاحنات"] },
    Pirelli: { c: "إيطاليا", y: "1872", t: "أداء رياضي بروح إيطالية", s: "تأسست بيريللي في ميلانو عام 1872 على يد جيوفاني باتيستا بيريللي. اشتهرت بإطارات الأداء العالي، وهي المورّد الحصري لإطارات بطولة الفورمولا 1 منذ 2011.", f: ["التأسيس: 1872، ميلانو", "مورّد إطارات الفورمولا 1 منذ 2011", "خط الأداء الشهير: P Zero"] },
    Continental: { c: "ألمانيا", y: "1871", t: "هندسة ألمانية للأمان", s: "تأسست كونتيننتال عام 1871 في مدينة هانوفر الألمانية. تُعرف بهندسة الإطارات التي تركّز على التحكم والفرملة القصيرة على الطرق المبللة والجافة.", f: ["التأسيس: 1871، هانوفر، ألمانيا", "تركيز على مسافة الفرملة والثبات", "إطارات لسيارات الركاب والـ SUV"] },
    Goodyear: { c: "أمريكا", y: "1898", t: "أكثر من قرن على الطريق", s: "تأسست جوديير عام 1898 في مدينة أكرون بولاية أوهايو، وسُمّيت تكريماً لتشارلز جوديير مخترع عملية فلكنة المطاط. تقدّم إطارات متنوعة تجمع الراحة والمتانة.", f: ["التأسيس: 1898، أكرون، أوهايو", "سُمّيت تكريماً لمخترع فلكنة المطاط", "إطارات للركاب والـ SUV"] },
    Firestone: { c: "أمريكا", y: "1900", t: "علامة أمريكية عريقة", s: "أسس هارفي فايرستون الشركة عام 1900 في أكرون بولاية أوهايو. تنتمي اليوم إلى مجموعة بريجستون، وتقدّم إطارات عملية بسعر مناسب.", f: ["التأسيس: 1900، أكرون، أوهايو", "ضمن مجموعة بريجستون", "خيار عملي للاستخدام اليومي"] },
    Nexen: { c: "كوريا الجنوبية", y: "1942", t: "راحة وهدوء بجودة كورية", s: "تأسست نيكسن في كوريا الجنوبية عام 1942، وتنتشر إطاراتها في أسواق عديدة. تُعرف بهدوء القيادة والأسعار التنافسية.", f: ["التأسيس: 1942، كوريا الجنوبية", "تملك علامة رودستون", "هدوء وراحة في القيادة"] },
    Roadstone: { c: "كوريا الجنوبية", y: "", t: "قيمة جيدة بسعر مناسب", s: "رودستون علامة إطارات تابعة لشركة نيكسن الكورية، وتقدّم خيارات عملية للسيارات اليومية.", f: ["تابعة لشركة نيكسن", "بلد المنشأ: كوريا الجنوبية", "خيار اقتصادي للاستخدام اليومي"] },
    Kumho: { c: "كوريا الجنوبية", y: "1960", t: "إطارات كورية بأداء متوازن", s: "تأسست كومهو في كوريا الجنوبية عام 1960، وتقدّم إطارات لسيارات الركاب والـ SUV بأداء متوازن وسعر تنافسي.", f: ["التأسيس: 1960، كوريا الجنوبية", "أداء متوازن وسعر تنافسي", "إطارات للركاب والـ SUV"] },
    Toyo: { c: "اليابان", y: "1945", t: "خبرة يابانية في إطارات الـ SUV", s: "تأسست تويو في اليابان عام 1945، وتشتهر بإطارات الـ SUV والدفع الرباعي والأداء.", f: ["التأسيس: 1945، اليابان", "تخصص في الـ SUV والدفع الرباعي", "معروفة بخط Open Country"] },
    Yokohama: { c: "اليابان", y: "1917", t: "جودة يابانية منذ 1917", s: "تأسست يوكوهاما عام 1917 في اليابان، وتقدّم إطارات تجمع الأداء والمتانة، وهي حاضرة في سباقات السيارات حول العالم.", f: ["التأسيس: 1917، اليابان", "حضور في رياضة السيارات", "إطارات للركاب والأداء"] },
    BFGoodrich: { c: "أمريكا", y: "1870", t: "الاختيار الأول لعشاق الطرق الوعرة", s: "تأسست بي إف جودريتش عام 1870 على يد بنجامين فرانكلين جودريتش، وتُعرف بإطارات الطرق الوعرة والـ SUV وسباقات الصحراء. تتبع اليوم مجموعة ميشلان.", f: ["التأسيس: 1870، أمريكا", "تتبع مجموعة ميشلان", "تخصص في الطرق الوعرة والـ 4×4"] },
    Linglong: { c: "الصين", y: "1975", t: "قيمة ممتازة مقابل السعر", s: "تأسست لينغ لونغ في الصين عام 1975، وتقدّم إطارات لسيارات الركاب والـ SUV بأسعار تنافسية وجودة مقبولة للاستخدام اليومي.", f: ["التأسيس: 1975، الصين", "أسعار تنافسية", "إطارات للركاب والـ SUV"] },
    Giti: { c: "سنغافورة", y: "1951", t: "علامة عالمية بأسعار مناسبة", s: "تأسست جيتي عام 1951 في سنغافورة، وتقدّم إطارات لسيارات الركاب والـ SUV بأسعار مناسبة.", f: ["التأسيس: 1951، سنغافورة", "إطارات للركاب والـ SUV", "خيار اقتصادي موثوق"] }
  };
  function initBrandPage() {
    var m = /\/b\/brand-(\d+)/.exec(location.pathname); if (!m || document.querySelector(".k360-bhead")) return;
    var main = document.querySelector("main"); if (!main) return;
    var box = main.querySelector(".container"); if (!box) return;
    load("brands.json").then(function (bs) {
      var b = null; bs.forEach(function (x) { if (String(x.i) === m[1]) b = x; });
      if (!b || document.querySelector(".k360-bhead")) return;
      var d = BINFO[b.en] || { c: "", y: "", t: "علامة إطارات متوفرة لدينا", s: esc(b.ar) + " علامة إطارات متوفرة في كفرات 360، وتُباع بضمان الوكيل مع توصيل وتركيب عند باب بيتك في كل مدن المملكة.", f: ["ضمان الوكيل", "توصيل وتركيب في كل المدن", "إمكانية التقسيط"] };
      var chips = (d.c ? "<span>&#128205; " + d.c + "</span>" : "") + (d.y ? "<span>&#128197; منذ " + d.y + "</span>" : "") + "<span>" + b.n.toLocaleString("ar-SA") + " إطار لدينا</span>";
      var el = document.createElement("section");
      el.className = "k360-site k360-bhead";
      el.innerHTML = '<div class="bh-banner"><div class="bh-logo">' + (b.logo ? '<img src="' + LOGO + esc(b.logo) + '" alt="' + esc(b.ar) + '">' : "<b>" + esc(b.en) + "</b>") + "</div>" +
        '<div class="bh-txt"><small>' + esc(b.en) + "</small><h2>" + esc(b.ar) + "</h2><p>" + d.t + '</p><div class="bh-chips">' + chips + "</div></div></div>" +
        '<div class="bh-body"><div class="bh-story"><h3>عن ' + esc(b.ar) + "</h3><p>" + d.s + '</p></div><ul class="bh-facts">' + d.f.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
      box.parentNode.insertBefore(el, box);
    }).catch(function () {});
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
        pk4(p, u, id) + "</div>" + BNPL;
      content.appendChild(box);
      cardEl.classList.add("k360-has-pk");
    });
  }

  /* ---------- home: most used tires (3 brand chips, 6 tires each) ---------- */
  var TOP_BRANDS = [1009381646, 167120911, 901275145]; /* Michelin, Bridgestone, Continental */
  function initTop(el) {
    Promise.all([load("products.json"), load("brands.json")]).then(function (res) {
      var ps = res[0], bs = res[1], logos = {}, byId = {};
      bs.forEach(function (b) { byId[b.i] = b; if (b.logo) logos[b.i] = b.logo; });
      var chips = TOP_BRANDS.map(function (id) { return byId[id]; }).filter(Boolean);
      var others = bs.filter(function (b) { return b.n > 0 && TOP_BRANDS.indexOf(b.i) < 0; }).sort(function (a, b) { return b.n - a.n; });
      var common = {}; CITY_SIZES.forEach(function (s) { common[s.replace(/\s/g, "")] = 1; });
      function pick(id, n) {
        var list = ps.filter(function (p) { return p.bi === id; });
        list.sort(function (a, b) { return (common[sizeOf(b)] ? 1 : 0) - (common[sizeOf(a)] ? 1 : 0) || (b.s && b.s < b.pr ? 1 : 0) - (a.s && a.s < a.pr ? 1 : 0); });
        return list.slice(0, n);
      }
      function hot() {
        var cols = chips.map(function (b) { return pick(b.i, 4); }), out = [];
        for (var i = 0; i < 4; i++) cols.forEach(function (c) { if (c[i]) out.push(c[i]); });
        return out.slice(0, 10);
      }
      el.innerHTML = '<div class="top-chips"></div><div class="top-all" hidden></div><div class="top-grid"></div><div class="top-more"></div>';
      var bar = el.querySelector(".top-chips"), all = el.querySelector(".top-all"), grid = el.querySelector(".top-grid"), more = el.querySelector(".top-more");
      var logoOf = function (b) { return b.logo ? '<img src="' + LOGO + esc(b.logo) + '" alt="' + esc(b.ar) + '">' : esc(b.en); };
      bar.innerHTML = '<button type="button" class="top-chip top-hot is-on" data-b="hot"><b>&#9733; الأكثر استخداماً</b></button>' +
        chips.map(function (b) { return '<button type="button" class="top-chip" data-b="' + b.i + '"><span>' + logoOf(b) + "</span><b>" + esc(b.ar) + "</b></button>"; }).join("") +
        '<button type="button" class="top-chip top-all-btn" aria-expanded="false"><b>كل الماركات &#9662;</b></button>';
      all.innerHTML = others.map(function (b) { return '<button type="button" class="top-mini" data-b="' + b.i + '"><span>' + logoOf(b) + "</span><b>" + esc(b.ar) + "</b></button>"; }).join("");
      function show(key) {
        var list = key === "hot" ? hot() : pick(+key, 10);
        grid.innerHTML = list.map(function (p) { return siteCard(p, logos); }).join("");
        more.innerHTML = key === "hot" ? '<a class="k360-btn k360-btn--ghost" href="' + pageUrl("shop") + '">عرض كل المنتجات</a>' : '<a class="k360-btn k360-btn--ghost" href="' + brandUrl(byId[+key]) + '">عرض كل إطارات ' + esc(byId[+key].ar) + "</a>";
        [].forEach.call(el.querySelectorAll("[data-b]"), function (x) { x.classList.toggle("is-on", x.getAttribute("data-b") === String(key)); });
      }
      el.addEventListener("click", function (e) {
        var t = e.target.closest(".top-all-btn");
        if (t) { all.hidden = !all.hidden; t.setAttribute("aria-expanded", String(!all.hidden)); t.classList.toggle("is-on", !all.hidden); return; }
        var c = e.target.closest("[data-b]"); if (!c) return;
        show(c.getAttribute("data-b"));
      });
      show("hot");
    }).catch(function () { fail(el); });
  }

  /* ---------- home: Saudi map with the cities we serve ---------- */
  var MAP_OUTLINE = [[34.95, 29.35], [36.1, 29.2], [37.3, 30.0], [38.0, 30.6], [38.8, 31.9], [40.0, 31.9], [41.0, 31.2], [42.1, 31.1], [44.7, 29.2], [46.5, 29.1], [47.5, 28.5], [48.4, 28.5], [48.8, 27.7], [49.6, 27.0], [50.1, 26.4], [50.2, 25.8], [50.8, 25.3], [51.6, 24.3], [52.6, 23.0], [55.2, 22.7], [55.7, 22.0], [55.0, 20.0], [52.0, 19.0], [48.0, 18.2], [44.5, 17.4], [43.2, 16.7], [42.6, 16.9], [41.8, 18.5], [41.1, 19.5], [40.2, 20.6], [39.2, 21.5], [38.5, 23.0], [38.0, 24.1], [36.8, 25.5], [35.7, 27.3]];
  /* approximate administrative regions (shared border nodes so they tile the country) */
  var MN = { P0: [34.95, 29.35], P1: [36.1, 29.2], P2: [37.3, 30.0], P3: [38.0, 30.6], P4: [38.8, 31.9], P5: [40.0, 31.9], P6: [41.0, 31.2], P7: [42.1, 31.1], P8: [44.7, 29.2], P9: [46.5, 29.1], P10: [47.5, 28.5], P11: [48.4, 28.5], P12: [48.8, 27.7], P13: [49.6, 27.0], P14: [50.1, 26.4], P15: [50.2, 25.8], P16: [50.8, 25.3], P17: [51.6, 24.3], P18: [52.6, 23.0], P19: [55.2, 22.7], P20: [55.7, 22.0], P21: [55.0, 20.0], P22: [52.0, 19.0], P23: [48.0, 18.2], P24: [44.5, 17.4], P25: [43.2, 16.7], P26: [42.6, 16.9], P27: [41.8, 18.5], P28: [41.1, 19.5], P29: [40.2, 20.6], P30: [39.2, 21.5], P31: [38.5, 23.0], P32: [38.0, 24.1], P33: [36.8, 25.5], P34: [35.7, 27.3],
    N1: [46.0, 28.4], N2: [45.0, 27.4], N3: [38.0, 29.5], H1: [38.9, 28.3], H2: [42.0, 28.3], H3: [43.5, 27.6], H4: [43.3, 26.4], H5: [41.5, 26.4], H6: [38.9, 26.4], T1: [37.9, 25.9],
    R1: [45.2, 26.5], R2: [45.3, 25.4], R3: [43.0, 25.4], M1: [42.3, 24.0], M2: [40.8, 23.2], M3: [39.2, 23.2], Rs4: [43.5, 22.5], A1: [43.2, 21.0], A2: [41.6, 19.9], Rs3: [44.5, 20.0], Rs2: [46.0, 19.9], S1: [44.0, 18.6], S2: [42.9, 17.5],
    E0: [46.9, 27.7], E1: [47.4, 25.5], E2: [48.6, 23.3], E3: [48.4, 21.0], N4: [47.0, 18.9] };
  var MAP_REG = [
    ["tabuk", "تبوك", 0, ["P33", "P34", "P0", "P1", "P2", "N3", "H1", "H6", "T1"], [37.4, 28.2]],
    ["north", "الحدود الشمالية والجوف", 0, ["P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "N1", "N2", "H3", "H2", "H1", "N3"], [41.3, 30.0]],
    ["hail", "حائل", 1, ["H1", "H2", "H3", "H4", "H5", "H6"], [40.4, 27.0]],
    ["qassim", "القصيم", 0, ["H5", "H4", "H3", "N2", "R1", "R2", "R3"], [43.7, 26.0]],
    ["madinah", "المدينة المنورة", 1, ["P33", "T1", "H6", "H5", "R3", "M1", "M2", "M3", "P31", "P32"], [40.2, 24.7]],
    ["makkah", "منطقة مكة", 1, ["P31", "M3", "M2", "M1", "Rs4", "A1", "A2", "P28", "P29", "P30"], [41.6, 22.2]],
    ["riyadh", "منطقة الرياض", 1, ["R3", "R2", "R1", "N2", "N1", "E0", "E1", "E2", "E3", "Rs2", "Rs3", "Rs4", "M1"], [45.2, 23.1]],
    ["east", "المنطقة الشرقية", 1, ["P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22", "P23", "N4", "Rs2", "E3", "E2", "E1", "E0", "N1"], [51.2, 21.4]],
    ["asir", "عسير", 1, ["P28", "A2", "A1", "Rs3", "S1", "S2", "P27"], [43.1, 19.5]],
    ["jazan", "جازان", 0, ["P27", "S2", "P25", "P26"], [42.7, 17.3]],
    ["najran", "نجران", 0, ["S1", "Rs3", "Rs2", "N4", "P23", "P24", "P25", "S2"], [46.0, 18.3]]
  ];
  var MAP_CITIES = [["riyadh", "الرياض", 46.72, 24.71, 0, -12], ["jeddah", "جدة", 39.17, 21.54, -14, 24], ["makkah", "مكة المكرمة", 39.83, 21.39, 58, 4], ["dammam", "الدمام", 50.1, 26.43, 8, -14], ["khobar", "الخبر", 50.21, 26.28, 24, 22], ["ahsa", "الأحساء", 49.59, 25.38, -44, 6], ["yanbu", "ينبع", 38.06, 24.09, -10, -12], ["abha", "أبها", 42.5, 18.22, 0, 22], ["hail", "حائل", 41.69, 27.52, 0, -12]];
  var MAP_GROUPS = [["المنطقة الغربية", ["jeddah", "makkah", "yanbu"]], ["المنطقة الوسطى", ["riyadh", "hail"]], ["المنطقة الشرقية", ["dammam", "khobar", "ahsa"]], ["المنطقة الجنوبية", ["abha"]]];
  function initMap(el) {
    var X = function (lon) { return ((lon - 34.5) * 27.9).toFixed(1); }, Y = function (lat) { return ((32 - lat) * 30.6).toFixed(1); };
    var pt = function (p) { return X(p[0]) + "," + Y(p[1]); };
    var out = MAP_OUTLINE.map(pt).join(" ");
    var regs = MAP_REG.map(function (r) {
      return '<polygon points="' + r[3].map(function (k) { return pt(MN[k]); }).join(" ") + '" class="mp-reg-poly' + (r[2] ? " is-svc" : "") + '"/>';
    }).join("");
    var names = MAP_REG.map(function (r) { return '<text x="' + X(r[4][0]) + '" y="' + Y(r[4][1]) + '" class="mp-rname" text-anchor="middle">' + r[1] + "</text>"; }).join("");
    var byKey = {}; CITIES.forEach(function (c) { byKey[c[0]] = c; });
    var pins = MAP_CITIES.map(function (m) {
      var c = byKey[m[0]], x = X(m[2]), y = Y(m[3]);
      return '<a href="' + cityUrl(c) + '" class="mp-pin"><circle cx="' + x + '" cy="' + y + '" r="14" class="mp-pulse"/><circle cx="' + x + '" cy="' + y + '" r="6" class="mp-dot"/><text x="' + (+x + m[4]) + '" y="' + (+y + m[5]) + '" text-anchor="middle">' + m[1] + "</text></a>";
    }).join("");
    el.innerHTML = '<div class="mp-wrap"><div><svg viewBox="0 0 600 490" class="mp-svg" role="img" aria-label="خريطة مناطق وحدود مدن الخدمة">' + regs + '<polygon points="' + out + '" class="mp-border"/>' + names + pins + '</svg><p class="mp-note">حدود المناطق تقريبية. المناطق الملوّنة تصلها خدماتنا.</p></div>' +
      '<div class="mp-list">' + MAP_GROUPS.map(function (r) {
        return '<div class="mp-reg"><b>' + r[0] + "</b>" + r[1].map(function (k) { return '<a href="' + cityUrl(byKey[k]) + '">&#128205; ' + byKey[k][1] + "</a>"; }).join("") + "</div>";
      }).join("") + "</div></div>";
  }

  /* ---------- start ---------- */
  var INIT = { slider: initSlider, finder: initFinder, collections: initCollections, tabs: initTabs, garage: initGarage, shop: initShop, brands: initBrands, top: initTop, map: initMap };
  function scan() {
    initPage();
    initBrandPage();
    document.querySelectorAll("[data-k360]:not([data-k360-on])").forEach(function (el) {
      var fn = INIT[el.getAttribute("data-k360")]; if (!fn) return;
      el.setAttribute("data-k360-on", "1"); fn(el);
    });
    var cards = document.querySelectorAll(".s-product-card-entry");
    for (var i = 0; i < cards.length; i++) { addRibbon(cards[i]); enhanceCard(cards[i]); }
    initPackages();
    initPageRibbon();
    initNav();
    initFooter();
    initDrawer();
    initOfferBar();
    initHeroVideo();
  }
  var queued = false;
  function queue() { if (queued) return; queued = true; setTimeout(function () { queued = false; scan(); }, 150); }
  function start() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-add]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      addToCart(+b.getAttribute("data-add"), +b.getAttribute("data-q"), b);
    }, true);
    /* header turns solid dark once the page is scrolled, so the menu stays readable */
    var onScroll = function () { document.body.classList.toggle("k360-scrolled", (window.pageYOffset || document.documentElement.scrollTop) > 40); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    var selPkg = function (e) {
      var b = e.target.closest && e.target.closest(".pkgs .pkg"); if (!b) return;
      [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle("sel", x === b); });
    };
    document.addEventListener("pointerover", selPkg); document.addEventListener("pointerdown", selPkg); document.addEventListener("focusin", selPkg);
    load("brands.json").then(function (bs) { bs.forEach(function (x) { if (x.logo) LOGOS[x.i] = x.logo; }); }).catch(function () {}).then(scan);

    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    if (location.hash === "#k360-shop") setTimeout(function () { var s = document.getElementById("k360-shop"); if (s) s.scrollIntoView(); }, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
