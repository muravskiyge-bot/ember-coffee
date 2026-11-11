/* ==========================================================
   EMBER — интерактив сайта
   ========================================================== */
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- Данные меню ---------- */
const MENU = [
  { id: "espresso", cat: "classic", emoji: "☕", name: "Эспрессо", desc: "Плотный, с нотами тёмного шоколада и карамели.", badge: "Хит", sizes: { "30 мл": 150, "60 мл": 210 } },
  { id: "cappuccino", cat: "classic", emoji: "☕", name: "Капучино", desc: "Шелковистая молочная пена и сбалансированный эспрессо.", sizes: { S: 220, M: 260, L: 300 } },
  { id: "flatwhite", cat: "classic", emoji: "🥛", name: "Флэт уайт", desc: "Двойной ристретто и тонкий слой микропены.", sizes: { M: 280 } },
  { id: "latte", cat: "classic", emoji: "🥛", name: "Латте", desc: "Нежный и мягкий, идеален для латте-арта.", sizes: { S: 240, M: 280, L: 320 } },
  { id: "orange-raf", cat: "signature", emoji: "🍊", name: "Апельсиновый раф", desc: "Сливки, цедра апельсина и ваниль. Наша гордость.", badge: "Хит", sizes: { S: 320, M: 360, L: 400 } },
  { id: "honey-latte", cat: "signature", emoji: "🍯", name: "Медовый латте с лавандой", desc: "Цветочный мёд, лаванда и мягкий эспрессо.", sizes: { S: 300, M: 340, L: 380 } },
  { id: "bumble", cat: "signature", emoji: "🧊", name: "Бамбл", desc: "Эспрессо, апельсиновый фреш и карамель на льду.", badge: "Новинка", sizes: { M: 330, L: 370 } },
  { id: "v60", cat: "alt", emoji: "🍵", name: "Воронка V60", desc: "Чистая чашка, которая раскрывает характер сорта.", sizes: { "250 мл": 290, "400 мл": 380 } },
  { id: "aeropress", cat: "alt", emoji: "⚗️", name: "Аэропресс", desc: "Насыщенный и сладкий, с плотным телом.", sizes: { "250 мл": 270 } },
  { id: "coldbrew", cat: "alt", emoji: "🧊", name: "Колд брю", desc: "18 часов холодной экстракции. Освежает и бодрит.", sizes: { S: 260, L: 320 } },
  { id: "cheesecake", cat: "dessert", emoji: "🍰", name: "Баскский чизкейк", desc: "Карамельная корочка и кремовая серединка.", sizes: { "": 340 } },
  { id: "croissant", cat: "dessert", emoji: "🥐", name: "Миндальный круассан", desc: "Французское масло, 27 слоёв и миндальный крем.", sizes: { "": 220 } },
  { id: "fondant", cat: "dessert", emoji: "🍫", name: "Шоколадный фондан", desc: "Горячий, с жидкой серединкой и шариком пломбира.", badge: "Новинка", sizes: { "": 310 } },
];

const formatPrice = (n) => n.toLocaleString("ru-RU") + " ₽";

/* ---------- Безопасный localStorage ---------- */
const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* хранилище недоступно, просто не сохраняем */
    }
  },
};

/* ---------- Уведомления ---------- */
function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  $("#toasts").append(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 2600);
}

/* ---------- Прелоадер ---------- */
function hidePreloader() {
  $("#preloader").classList.add("hidden");
}
window.addEventListener("load", () => setTimeout(hidePreloader, 600));
setTimeout(hidePreloader, 4000); // на случай медленной загрузки шрифтов/фото

/* ---------- Прокрутка: прогресс, шапка, блюр фона, scroll-spy ---------- */
const header = $("#header");
const progress = $("#scrollProgress");
const toTop = $("#toTop");
const navLinks = $$(".nav__link");
const indicator = $("#navIndicator");
const sections = navLinks.map((link) => $(link.getAttribute("href")));
const timeline = $("#timeline");
const bgPhoto = $(".bg__photo");
const bgBlurFull = $("#bgBlurFull");

// блюр фона плавно догоняет прокрутку, а не прыгает за шагами колеса
let blurTarget = 0;
let blurCurrent = 0;
let blurAnimating = false;

function renderBlur() {
  blurCurrent += (blurTarget - blurCurrent) * (reduceMotion ? 1 : 0.12);
  if (Math.abs(blurTarget - blurCurrent) < 0.001) blurCurrent = blurTarget;
  bgBlurFull.style.opacity = blurCurrent.toFixed(3);
  bgPhoto.style.transform = `scale(1.06) translate3d(0, ${(-blurCurrent * 30).toFixed(1)}px, 0)`;
  if (blurCurrent !== blurTarget) {
    requestAnimationFrame(renderBlur);
  } else {
    blurAnimating = false;
  }
}

function setBlur(value) {
  blurTarget = value;
  if (!blurAnimating) {
    blurAnimating = true;
    requestAnimationFrame(renderBlur);
  }
}

function moveIndicator(link) {
  if (!link) return;
  indicator.style.width = link.offsetWidth + "px";
  indicator.style.transform = `translateX(${link.offsetLeft}px)`;
}

function setActive(id) {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === "#" + id;
    link.classList.toggle("active", isActive);
    if (isActive) moveIndicator(link);
  });
}

let ticking = false;
function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;

  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  header.classList.toggle("scrolled", y > 40);
  toTop.classList.toggle("show", y > vh);

  // фон: по мере прокрутки первого экрана блюр плавно накрывает всё фото
  setBlur(Math.min(y / vh, 1));

  // активный пункт меню
  let current = sections[0].id;
  const line = y + vh * 0.35;
  sections.forEach((sec) => {
    if (sec.offsetTop <= line) current = sec.id;
  });
  if (y >= max - 4) current = sections[sections.length - 1].id;
  setActive(current);

  // заполнение линии процесса
  const r = timeline.getBoundingClientRect();
  const t = (vh * 0.8 - r.top) / (r.height + vh * 0.3);
  timeline.style.setProperty("--tl", Math.max(0, Math.min(1, t)).toFixed(3));

  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
window.addEventListener("resize", onScroll);
if (document.fonts) document.fonts.ready.then(onScroll); // ширина ссылок меняется после загрузки шрифта
onScroll();

toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* ---------- Мобильное меню ---------- */
const burger = $("#burger");
const nav = $("#nav");

function toggleNav(open) {
  nav.classList.toggle("open", open);
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
}

burger.addEventListener("click", () => toggleNav(!nav.classList.contains("open")));
navLinks.forEach((link) => link.addEventListener("click", () => toggleNav(false)));
document.addEventListener("click", (e) => {
  if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) {
    toggleNav(false);
  }
});

/* ---------- Появление блоков ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.classList.add("visible");
      revealObserver.unobserve(el);
      // после появления убираем задержку, чтобы наклон карточек реагировал сразу
      setTimeout(() => { el.style.transitionDelay = ""; }, 1200);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

$$(".reveal").forEach((el, i) => {
  // лёгкая «лесенка» для соседних элементов
  el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  revealObserver.observe(el);
});

/* ---------- Счётчики ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const duration = reduceMotion ? 0 : 1800;
  const start = performance.now();

  function frame(now) {
    const k = duration ? Math.min((now - start) / duration, 1) : 1;
    const eased = 1 - Math.pow(1 - k, 3);
    const value = target * eased;
    el.textContent = decimals
      ? value.toFixed(decimals).replace(".", ",")
      : Math.round(value).toLocaleString("ru-RU");
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach((el) => countObserver.observe(el));

/* ---------- Печатающийся текст ---------- */
(function typed() {
  const el = $("#typed");
  const words = ["эспрессо", "флэт уайт", "апельсиновый раф", "воронку V60", "колд брю"];
  if (reduceMotion) return;

  let w = 0;
  let c = words[0].length;
  let deleting = true;

  function tick() {
    const word = words[w];
    c += deleting ? -1 : 1;
    el.textContent = word.slice(0, c);

    let delay = deleting ? 45 : 90;
    if (!deleting && c === word.length) {
      deleting = true;
      delay = 1800;
    } else if (deleting && c === 0) {
      deleting = false;
      w = (w + 1) % words.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  }
  setTimeout(tick, 2200);
})();

/* ---------- Кастомный курсор ---------- */
if (finePointer && !reduceMotion) {
  const cursor = $("#cursor");
  const dot = $("#cursorDot");
  let mx = 0, my = 0, cx = 0, cy = 0;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    document.body.classList.add("cursor-ready");
  });
  document.addEventListener("mouseleave", () => document.body.classList.remove("cursor-ready"));

  (function follow() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  })();

  document.addEventListener("mouseover", (e) => {
    cursor.classList.toggle("hover", !!e.target.closest("a, button, input, select, .item"));
  });
}

/* ---------- 3D-наклон карточек ---------- */
if (finePointer && !reduceMotion) {
  $$(".tilt").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ---------- Магнитные кнопки ---------- */
if (finePointer && !reduceMotion) {
  $$(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

/* ---------- Меню: рендер и фильтр ---------- */
const grid = $("#menuGrid");
const tabs = $$(".menu-tab");

function renderMenu(filter = "all") {
  const items = MENU.filter((m) => filter === "all" || m.cat === filter);
  grid.innerHTML = items.map((m, i) => {
    const sizes = Object.keys(m.sizes);
    const showSizes = sizes.length > 1 || sizes[0] !== "";
    return `
      <article class="item" data-id="${m.id}" style="animation-delay:${i * 0.06}s">
        ${m.badge ? `<span class="item__badge">${m.badge}</span>` : ""}
        <div class="item__emoji" aria-hidden="true">${m.emoji}</div>
        <h3 class="item__name">${m.name}</h3>
        <p class="item__desc">${m.desc}</p>
        ${showSizes ? `<div class="sizes">${sizes.map((s, j) =>
          `<button class="size${j === 0 ? " active" : ""}" data-size="${s}">${s}</button>`).join("")}</div>` : ""}
        <div class="item__foot">
          <span class="item__price">${formatPrice(m.sizes[sizes[0]])}</span>
          <button class="add" aria-label="Добавить «${m.name}» в корзину">+</button>
        </div>
      </article>`;
  }).join("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });
    renderMenu(tab.dataset.filter);
    // если вкладки «приклеены», возвращаем к началу меню
    const menuTop = $("#menu").offsetTop;
    if (window.scrollY > menuTop + 200) {
      window.scrollTo({ top: menuTop, behavior: "smooth" });
    }
  });
});

// выбор объёма и добавление в корзину, через делегирование
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".item");
  if (!card) return;
  const data = MENU.find((m) => m.id === card.dataset.id);

  const sizeBtn = e.target.closest(".size");
  if (sizeBtn) {
    $$(".size", card).forEach((b) => b.classList.toggle("active", b === sizeBtn));
    $(".item__price", card).textContent = formatPrice(data.sizes[sizeBtn.dataset.size]);
    return;
  }

  if (e.target.closest(".add")) {
    const active = $(".size.active", card);
    const size = active ? active.dataset.size : Object.keys(data.sizes)[0];
    addToCart(data, size);
  }
});

// подсветка карточки за курсором
grid.addEventListener("mousemove", (e) => {
  const card = e.target.closest(".item");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${e.clientX - r.left}px`);
  card.style.setProperty("--my", `${e.clientY - r.top}px`);
});

renderMenu();

/* ---------- Корзина ---------- */
let cart = storage.get("ember-cart", []);
const cartEl = $("#cart");
const overlay = $("#overlay");
const cartBtn = $("#cartBtn");

function saveCart() {
  storage.set("ember-cart", cart);
  renderCart();
}

function addToCart(item, size) {
  const key = item.id + "|" + size;
  const line = cart.find((l) => l.key === key);
  if (line) {
    line.qty += 1;
  } else {
    cart.push({ key, id: item.id, size, qty: 1 });
  }
  saveCart();
  cartBtn.classList.remove("bump");
  void cartBtn.offsetWidth; // перезапуск анимации
  cartBtn.classList.add("bump");
  toast(`${item.emoji} ${item.name}${size ? " (" + size + ")" : ""} в корзине`);
}

function changeQty(key, delta) {
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((l) => l.key !== key);
  saveCart();
}

function renderCart() {
  // выбрасываем позиции, которых уже нет в меню
  cart = cart.filter((l) => MENU.some((m) => m.id === l.id && l.size in m.sizes));

  let total = 0;
  let count = 0;
  $("#cartList").innerHTML = cart.map((l) => {
    const m = MENU.find((x) => x.id === l.id);
    const price = m.sizes[l.size];
    total += price * l.qty;
    count += l.qty;
    return `
      <li class="cart-item">
        <span class="cart-item__emoji" aria-hidden="true">${m.emoji}</span>
        <div>
          <div class="cart-item__name">${m.name}</div>
          <div class="cart-item__meta">${l.size ? l.size + " · " : ""}${formatPrice(price)}</div>
        </div>
        <div class="qty">
          <button data-key="${l.key}" data-delta="-1" aria-label="Убрать одну">−</button>
          <span>${l.qty}</span>
          <button data-key="${l.key}" data-delta="1" aria-label="Добавить ещё">+</button>
        </div>
      </li>`;
  }).join("");

  $("#cartTotal").textContent = formatPrice(total);
  $("#cartCount").textContent = count;
  $("#cartEmpty").classList.toggle("hidden", cart.length > 0);
  $("#checkout").disabled = cart.length === 0;
}

$("#cartList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (btn) changeQty(btn.dataset.key, Number(btn.dataset.delta));
});

function toggleCart(open) {
  cartEl.classList.toggle("open", open);
  overlay.classList.toggle("show", open);
  cartEl.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("no-scroll", open);
}

cartBtn.addEventListener("click", () => toggleCart(true));
$("#cartClose").addEventListener("click", () => toggleCart(false));
overlay.addEventListener("click", () => toggleCart(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    toggleCart(false);
    toggleNav(false);
  }
});

$("#checkout").addEventListener("click", () => {
  if (!cart.length) return;
  const total = $("#cartTotal").textContent;
  cart = [];
  saveCart();
  toggleCart(false);
  toast(`Заказ на ${total} принят! Будет готов через 10 минут ☕`);
});

renderCart();

/* ---------- Слайдер отзывов ---------- */
(function slider() {
  const track = $("#sliderTrack");
  const slides = $$(".review", track);
  const dotsBox = $("#sliderDots");
  let index = 0;
  let timer;

  dotsBox.innerHTML = slides.map((_, i) =>
    `<button class="dot${i === 0 ? " active" : ""}" aria-label="Отзыв ${i + 1}"></button>`).join("");
  const dots = $$(".dot", dotsBox);

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle("active", j === index));
  }

  function autoplay() {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => go(index + 1), 5000);
  }

  $("#prevSlide").addEventListener("click", () => { go(index - 1); autoplay(); });
  $("#nextSlide").addEventListener("click", () => { go(index + 1); autoplay(); });
  dots.forEach((d, i) => d.addEventListener("click", () => { go(i); autoplay(); }));

  const box = $("#slider");
  box.addEventListener("mouseenter", () => clearInterval(timer));
  box.addEventListener("mouseleave", autoplay);

  // свайп на телефоне
  let startX = null;
  track.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    startX = null;
    autoplay();
  });

  autoplay();
})();

/* ---------- Форма брони ---------- */
(function bookingForm() {
  const form = $("#bookingForm");
  const phone = $("#phone");
  const date = $("#date");

  // нельзя выбрать прошедшую дату
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().slice(0, 10);

  // маска телефона: 8 (999) 999-99-99
  phone.addEventListener("input", () => {
    let d = phone.value.replace(/\D/g, "");
    if (d.startsWith("7")) d = "8" + d.slice(1);
    if (d && !d.startsWith("8")) d = "8" + d;
    d = d.slice(0, 11);

    let out = d.slice(0, 1);
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length > 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    phone.value = out;
  });

  const rules = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => v.replace(/\D/g, "").length === 11,
    date: (v) => Boolean(v) && v >= date.min,
  };

  function check(input) {
    const ok = rules[input.name](input.value);
    const field = input.closest(".field");
    field.classList.remove("invalid");
    if (!ok) {
      void field.offsetWidth; // чтобы «тряска» повторялась
      field.classList.add("invalid");
    }
    return ok;
  }

  Object.keys(rules).forEach((name) => {
    form.elements[name].addEventListener("blur", (e) => {
      if (e.target.value) check(e.target);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = Object.keys(rules).map((name) => check(form.elements[name]));
    if (results.every(Boolean)) {
      const name = form.elements.name.value.trim();
      toast(`Спасибо, ${name}! Мы перезвоним для подтверждения брони 🧡`);
      form.reset();
    }
  });
})();

/* ---------- Год в футере ---------- */
$("#year").textContent = new Date().getFullYear();
