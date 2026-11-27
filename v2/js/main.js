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

  const EN = document.documentElement.lang === 'en';
  const T = EN
    ? { open: 'Open menu', close: 'Close menu', more: 'Details', less: 'Hide', fail: 'Sorry, we could not send your request. Please message Victoria on Telegram: @vikusyonochek' }
    : { open: 'Открыть меню', close: 'Закрыть меню', more: 'Подробнее', less: 'Свернуть', fail: 'Не получилось отправить заявку. Напишите, пожалуйста, Виктории в Telegram: @vikusyonochek' };
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
      dispatchEvent(new Event('vs:loaded'));
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

  /* ===== Конверт: печать слетает, клапан открывается, открытка выезжает,
     а четыре факта вылетают из конверта и встают на свои места.
     Прогресс сглаживается (инерция), трансформации пишутся напрямую в элементы. ===== */
  const sec = $('.letter-sec'), stage = $('#letter-stage'), env = $('#envelope'), card = $('#letter');
  const flap = $('.env-flap'), seal = $('.env-seal');
  const facts = $$('.fact');
  let riseMax = 0, envTarget = 0, envP = 0, envRaf = 0, vecs = [];
  const ease = t => 1 - Math.pow(1 - t, 3);
  const measure = () => {
    if (!sec) return;
    card.style.transform = 'none';
    facts.forEach(f => { f.style.transform = 'none'; });
    const sRect = stage.getBoundingClientRect(), cRect = card.getBoundingClientRect();
    // на телефоне факты стоят над конвертом — открытка поднимается ровно до них
    const ceil = innerWidth <= 900 ? Math.max(...facts.map(f => f.getBoundingClientRect().bottom)) + 12 : sRect.top + 14;
    riseMax = Math.max(0, Math.min(cRect.height * 0.82, cRect.top - ceil));
    const cx = cRect.left + cRect.width / 2, cy = cRect.top + cRect.height * 0.4;
    vecs = facts.map(f => { const r = f.getBoundingClientRect(); return [cx - (r.left + r.width / 2), cy - (r.top + r.height / 2)]; });
    envTarget = progress(); envP = envTarget; render();
  };
  const progress = () => {
    const total = sec.offsetHeight - stage.offsetHeight;
    return reduced ? 1 : clamp((stage.getBoundingClientRect().top - sec.getBoundingClientRect().top) / Math.max(1, total));
  };
  function render() {
    const p = envP;
    const open = clamp(p / 0.24);
    const rise = ease(clamp((p - 0.2) / 0.45));
    flap.style.transform = `perspective(1600px) rotateX(${(open * 180).toFixed(2)}deg)`;
    env.classList.toggle('is-flap-back', open > 0.5);
    seal.style.opacity = Math.max(0, 1 - open * 2.4).toFixed(3);
    seal.style.transform = `scale(${(1 + open * 0.35).toFixed(3)}) rotate(${(open * 25).toFixed(1)}deg)`;
    card.style.transform = `translate3d(0, ${(-riseMax * rise).toFixed(1)}px, 0)`;
    facts.forEach((f, i) => {
      const t = ease(clamp((p - +f.dataset.at) / 0.22));
      const [dx, dy] = vecs[i] || [0, 0];
      f.style.opacity = t.toFixed(3);
      f.style.transform = `translate3d(${(dx * (1 - t)).toFixed(1)}px, ${(dy * (1 - t)).toFixed(1)}px, 0) scale(${(0.35 + 0.65 * t).toFixed(3)}) rotate(${((1 - t) * (i % 2 ? 12 : -12)).toFixed(1)}deg)`;
    });
  }
  const loop = () => {
    envP += (envTarget - envP) * 0.14;
    if (Math.abs(envTarget - envP) < 0.0004) envP = envTarget;
    render();
    envRaf = envP !== envTarget ? requestAnimationFrame(loop) : 0;
  };
  function update() {
    if (!sec) return;
    envTarget = progress();
    if (!envRaf) envRaf = requestAnimationFrame(loop);
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
    burger.setAttribute('aria-label', open ? T.close : T.open);
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
      const tick = now => { const p = Math.min(1, (now - start) / 2600); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      el.textContent = '0'; requestAnimationFrame(tick);
    });
    $$('[data-level]', statsBox).forEach(el => {
      const lv = el.dataset.level.split(','); let i = 0; el.textContent = lv[0];
      const step = () => { if (++i >= lv.length) return; el.classList.add('is-switch'); setTimeout(() => { el.textContent = lv[i]; el.classList.remove('is-switch'); setTimeout(step, 380); }, 260); };
      setTimeout(step, 450);
    });
  };
  // до старта анимации показываем начальные значения, а не итоговые
  if (!reduced && statsBox) {
    $$('[data-count-to]', statsBox).forEach(el => { el.textContent = '0'; });
    $$('[data-level]', statsBox).forEach(el => { el.textContent = el.dataset.level.split(',')[0]; });
  }
  const counter = $('[data-count]');
  const runCounter = () => {
    const to = +counter.dataset.count, sup = counter.querySelector('sup')?.outerHTML || '', start = performance.now();
    const tick = now => { const p = Math.min(1, (now - start) / 1600); counter.innerHTML = Math.round(to * (1 - Math.pow(1 - p, 4))) + sup; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  if (!reduced && 'IntersectionObserver' in window) {
    const once = (el, fn, th = .5) => { if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); setTimeout(fn, 200); } }, { threshold: th }); o.observe(el); };
    const afterPreloader = fn => () => { const go = () => setTimeout(fn, 350); document.documentElement.classList.contains('is-loaded') ? go() : addEventListener('vs:loaded', go, { once: true }); };
    once(statsBox, afterPreloader(runStats)); once(counter, runCounter, .6);
  }

  /* ===== Каталог материалов: «Подробнее» раскрывается в строке ===== */
  $$('.item').forEach(item => {
    const btn = $('.item__toggle', item), more = $('.item__more', item);
    more.inert = true;
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.item.is-open').forEach(o => { if (o !== item) { o.classList.remove('is-open'); $('.item__toggle', o).setAttribute('aria-expanded', 'false'); $('.item__more', o).inert = true; } });
      item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); more.inert = !open;
      const lbl = $('.lbl', btn); if (lbl) lbl.textContent = open ? T.less : T.more;
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
    } catch { alert(T.fail); }
    finally { btn.disabled = false; }
  });
  $$('input', form).forEach(i => i.addEventListener('input', () => i.removeAttribute('aria-invalid')));

  /* ===== Лайтбокс документов ===== */
  // Документы берём из разметки: крупная версия = миниатюра с -1275 вместо -600
  const DOCS = $$('[data-doc]').map(b => ({ src: $('img', b).getAttribute('src').replace('-600.webp', '-1275.webp'), title: b.dataset.title || $('img', b).alt }));
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
