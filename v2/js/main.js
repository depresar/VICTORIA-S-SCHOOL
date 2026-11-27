/* Victoria's School v2 «Old Money» — интерактив */
(() => {
  'use strict';

  const CONFIG = {
    trialDelay: 5,          // через сколько секунд показывать приглашение на урок
    formEndpoint: '',       // адрес приёма заявок (Formspree и т. п.). Пусто — откроется Telegram
    telegram: 'https://t.me/vikusyonochek',
    preloaderMin: 900,
    preloaderMax: 2200,
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
  };

  /* ===== Прелоадер ===== */
  const t0 = performance.now();
  let done = false;
  const hidePreloader = () => {
    if (done) return; done = true;
    setTimeout(() => {
      $('#preloader')?.classList.add('is-done');
      document.documentElement.classList.add('is-loaded');
      revealInit();
    }, Math.max(0, CONFIG.preloaderMin - (performance.now() - t0)));
  };
  if (document.readyState === 'complete') hidePreloader(); else addEventListener('load', hidePreloader, { once: true });
  setTimeout(hidePreloader, CONFIG.preloaderMax);

  function revealInit() {
    const items = $$('.reveal');
    if (reduced || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .06 });
    items.forEach(el => io.observe(el));
  }

  /* ===== Конверт: письмо выезжает по скроллу ===== */
  const sec = $('.letter-sec'), stage = $('#letter-stage'), env = $('#envelope'), letter = $('#letter');
  let geo = null;
  const measure = () => {
    if (!sec) return;
    env.style.setProperty('--sink', '0px');
    const envH = env.offsetHeight, H = letter.offsetHeight;
    const sRect = stage.getBoundingClientRect(), eRect = env.getBoundingClientRect();
    const top0 = envH * 0.06;
    const E0 = eRect.top - sRect.top;
    // конверт опускается настолько, чтобы письмо целиком оказалось над ним
    const sinkMax = Math.max(envH * 0.62, 10 + H - E0 - envH * 0.97 + 6);
    const riseMax = Math.max(0, E0 + sinkMax + top0 - 10);
    geo = { envH, H, top0, sinkMax, riseMax };
    letter.style.top = top0 + 'px';
    letter.style.bottom = 'auto';
    update();
  };
  function update() {
    if (!geo) return;
    const r = sec.getBoundingClientRect();
    const total = sec.offsetHeight - stage.offsetHeight;
    const p = reduced ? 1 : clamp((stage.getBoundingClientRect().top - r.top) / Math.max(1, total));
    const open = clamp(p / 0.22);
    const rise = clamp((p - 0.2) / 0.62);
    const sink = clamp((p - 0.45) / 0.4);
    const ease = t => 1 - Math.pow(1 - t, 3);
    const risePx = geo.riseMax * ease(rise);
    const sinkPx = geo.sinkMax * ease(sink);
    stage.style.setProperty('--open', open.toFixed(3));
    env.style.setProperty('--sink', sinkPx.toFixed(1) + 'px');
    env.style.translate = `0 ${sinkPx.toFixed(1)}px`;
    letter.style.translate = `0 ${(-risePx).toFixed(1)}px`;
    // прячем часть письма, которая ниже дна конверта
    const below = Math.max(0, geo.top0 + geo.H - risePx - geo.envH * 0.97);
    letter.style.clipPath = `inset(0 0 ${below.toFixed(1)}px 0)`;
    env.classList.toggle('is-flap-back', open > 0.5);
  }
  if (sec) { addEventListener('resize', measure); document.fonts?.ready.then(measure); measure(); }

  /* ===== Скролл: кнопка наверх, параллакс заметок ===== */
  const toTop = $('.to-top');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    toTop.style.setProperty('--progress', max > 0 ? (y / max).toFixed(3) : 0);
    toTop.classList.toggle('is-visible', y > 700);
    update();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); s && spy.observe(s); });
  }

  const heroRoot = $('[data-parallax-root]');
  if (heroRoot && !reduced && matchMedia('(hover: hover)').matches) {
    const notes = $$('[data-depth]', heroRoot);
    heroRoot.addEventListener('pointermove', e => {
      const r = heroRoot.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
      notes.forEach(n => { const d = +n.dataset.depth; n.style.setProperty('--px', (dx * d).toFixed(1) + 'px'); n.style.setProperty('--py', (dy * d).toFixed(1) + 'px'); });
    });
  }

  /* ===== Меню ===== */
  const header = $('#header'), burger = $('.burger'), menu = $('#mobile-menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', !open);
    document.body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ===== Цифры и уровни ===== */
  const statsBox = $('.stats');
  const runStats = () => {
    $$('[data-count-to]', statsBox).forEach(el => {
      const to = +el.dataset.countTo, start = performance.now();
      const tick = now => { const p = Math.min(1, (now - start) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      el.textContent = '0'; requestAnimationFrame(tick);
    });
    $$('[data-level]', statsBox).forEach(el => {
      const lv = el.dataset.level.split(','); let i = 0; el.textContent = lv[0];
      const step = () => { if (++i >= lv.length) return; el.classList.add('is-switch'); setTimeout(() => { el.textContent = lv[i]; el.classList.remove('is-switch'); setTimeout(step, 230); }, 200); };
      setTimeout(step, 300);
    });
  };
  const counter = $('[data-count]');
  const runCounter = () => {
    const to = +counter.dataset.count, sup = counter.querySelector('sup')?.outerHTML || '', start = performance.now();
    const tick = now => { const p = Math.min(1, (now - start) / 1600); counter.innerHTML = Math.round(to * (1 - Math.pow(1 - p, 4))) + sup; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  if (!reduced && 'IntersectionObserver' in window) {
    const once = (el, fn, th = .5) => { if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); setTimeout(fn, 200); } }, { threshold: th }); o.observe(el); };
    once(statsBox, runStats); once(counter, runCounter, .6);
  }

  /* ===== Каталог материалов: «Подробнее» раскрывается в строке ===== */
  $$('.item').forEach(item => {
    const btn = $('.item__toggle', item), more = $('.item__more', item);
    more.inert = true;
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.item.is-open').forEach(o => { if (o !== item) { o.classList.remove('is-open'); $('.item__toggle', o).setAttribute('aria-expanded', 'false'); $('.item__more', o).inert = true; } });
      item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); more.inert = !open;
      const lbl = $('.lbl', btn); if (lbl) lbl.textContent = open ? 'Свернуть' : 'Подробнее';
    });
  });

  /* ===== Приглашение на пробный урок ===== */
  const trial = $('#trial');
  const openTrial = () => { if (trial.open || $('#lightbox').open) return; setMenu(false); trial.showModal(); document.body.classList.add('is-locked'); };
  trial.addEventListener('close', () => document.body.classList.remove('is-locked'));
  trial.addEventListener('click', e => { if (e.target === trial) trial.close(); });
  $$('[data-open-trial]').forEach(b => b.addEventListener('click', openTrial));
  $('[data-close-trial]').addEventListener('click', () => trial.close());
  setTimeout(() => { if (!document.querySelector('dialog[open]')) openTrial(); }, CONFIG.trialDelay * 1000 + CONFIG.preloaderMin);

  const form = $('#trial-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach(inp => { const bad = !inp.value.trim(); inp.setAttribute('aria-invalid', bad); if (bad && ok) { inp.focus(); ok = false; } });
    if (!ok) return;
    const btn = $('button[type="submit"]', form); btn.disabled = true;
    try {
      if (CONFIG.formEndpoint) {
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), source: "Пробный урок — Victoria's School v2" }) });
        if (!res.ok) throw new Error(res.status);
      } else {
        window.open(CONFIG.telegram, '_blank', 'noopener');
      }
      form.classList.add('is-sent');
    } catch { alert('Не получилось отправить заявку. Напишите, пожалуйста, Виктории в Telegram: @vikusyonochek'); }
    finally { btn.disabled = false; }
  });
  $$('input', form).forEach(i => i.addEventListener('input', () => i.removeAttribute('aria-invalid')));

  /* ===== Лайтбокс документов ===== */
  const DOCS = [
    { src: '../assets/img/doc-ielts-1275.webp', title: 'Сертификат IELTS 7.5 — уровень C1 / Advanced (2021)' },
    { src: '../assets/img/doc-master-1275.webp', title: 'Диплом магистра с отличием «Лингвистика» — РУДН (2023)' },
    { src: '../assets/img/doc-master-app-1275.webp', title: 'Приложение к диплому магистра — РУДН (2023)' },
    { src: '../assets/img/doc-bachelor-1275.webp', title: 'Диплом бакалавра с отличием — ПсковГУ (2021)' },
  ];
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-caption');
  let cur = 0;
  const show = i => { cur = (i + DOCS.length) % DOCS.length; lbImg.src = DOCS[cur].src; lbImg.alt = DOCS[cur].title; lbCap.textContent = DOCS[cur].title; };
  $$('[data-doc]').forEach(b => b.addEventListener('click', () => { show(+b.dataset.doc); lb.showModal(); document.body.classList.add('is-locked'); }));
  lb.addEventListener('close', () => document.body.classList.remove('is-locked'));
  $('[data-lb-close]').addEventListener('click', () => lb.close());
  $('[data-lb-prev]').addEventListener('click', () => show(cur - 1));
  $('[data-lb-next]').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__stage')) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });

  /* ===== Cookie, год ===== */
  const cookie = $('.cookie');
  if (!store.get('vs-cookie-ok')) setTimeout(() => cookie.classList.add('is-visible'), 2500);
  $('[data-cookie-ok]').addEventListener('click', () => { cookie.classList.remove('is-visible'); store.set('vs-cookie-ok', '1'); });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
})();
