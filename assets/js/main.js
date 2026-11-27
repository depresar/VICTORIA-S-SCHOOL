/* Victoria's School — интерактив сайта (без библиотек) */
(() => {
  'use strict';

  /* ===== НАСТРОЙКИ ===== */
  const CONFIG = {
    // Через сколько секунд показывать поп-ап «бесплатный урок»
    trialDelay: 5,
    // Куда отправлять заявки из формы. Пусто — форма откроет Telegram Виктории.
    // Сюда можно вставить адрес Formspree / Make / свой сервер (POST, JSON).
    formEndpoint: '',
    telegram: 'https://t.me/vikusyonochek',
    preloaderMin: 800,   // мс — минимум показа, чтобы не мигал
    preloaderMax: 2000,  // мс — максимум, даже если что-то грузится долго
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); } catch { /* приватный режим */ } },
  };

  /* ===== Прелоадер ===== */
  const preloader = $('#preloader');
  const t0 = performance.now();
  let preloaderDone = false;
  const hidePreloader = () => {
    if (preloaderDone) return;
    preloaderDone = true;
    const wait = Math.max(0, CONFIG.preloaderMin - (performance.now() - t0));
    setTimeout(() => {
      preloader?.classList.add('is-done');
      document.documentElement.classList.add('is-loaded');
      revealInit();
    }, wait);
  };
  if (document.readyState === 'complete') hidePreloader();
  else window.addEventListener('load', hidePreloader, { once: true });
  setTimeout(hidePreloader, CONFIG.preloaderMax);

  /* ===== Появление блоков при прокрутке ===== */
  function revealInit() {
    const items = $$('.reveal');
    if (reduced || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(el => io.observe(el));
  }

  /* ===== Шапка: фон при скролле, прячется при прокрутке вниз ===== */
  const header = $('#header');
  const toTop = $('.to-top');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    lastY = y;
    parallax();
    const max = document.documentElement.scrollHeight - innerHeight;
    toTop.style.setProperty('--progress', max > 0 ? (y / max).toFixed(3) : 0);
    toTop.classList.toggle('is-visible', y > 700);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* Подсветка активного пункта меню */
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); s && spy.observe(s); });
  }

  /* ===== Мобильное меню ===== */
  const burger = $('.burger');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', !open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });

  /* ===== Параллакс «плавающих» слов в hero ===== */
  const heroRoot = $('[data-parallax-root]');
  if (heroRoot && !reduced && matchMedia('(hover: hover)').matches) {
    const chips = $$('[data-depth]', heroRoot);
    heroRoot.closest('.hero').addEventListener('pointermove', (e) => {
      const r = heroRoot.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - .5;
      const dy = (e.clientY - r.top) / r.height - .5;
      chips.forEach(c => {
        const d = +c.dataset.depth;
        c.style.setProperty('--px', (dx * d).toFixed(1) + 'px');
        c.style.setProperty('--py', (dy * d).toFixed(1) + 'px');
      });
    });
  }

  /* ===== Счётчик 1000+ ===== */
  const counter = $('[data-count]');
  if (counter && !reduced && 'IntersectionObserver' in window) {
    const target = +counter.dataset.count;
    const sup = counter.querySelector('sup')?.outerHTML || '';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now(), dur = 1600;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        counter.innerHTML = Math.round(target * eased) + sup;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .6 });
    io.observe(counter);
  }

  /* ===== Достижения: цифры растут, уровень «прокачивается» A1 → C1 ===== */
  const statsBox = $('.stats');
  const runStats = () => {
    $$('[data-count-to]', statsBox).forEach(el => {
      const to = +el.dataset.countTo, dur = 1400, start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
    $$('[data-level]', statsBox).forEach(el => {
      const levels = el.dataset.level.split(',');
      let i = 0;
      el.textContent = levels[0];
      const step = () => {
        i++;
        if (i >= levels.length) return;
        el.classList.add('is-switch');
        setTimeout(() => { el.textContent = levels[i]; el.classList.remove('is-switch'); setTimeout(step, 230); }, 200);
      };
      setTimeout(step, 300);
    });
  };
  if (statsBox && !reduced && 'IntersectionObserver' in window) {
    const sio = new IntersectionObserver(([e]) => { if (e.isIntersecting) { sio.disconnect(); setTimeout(runStats, 200); } }, { threshold: .5 });
    sio.observe(statsBox);
  }

  /* ===== Предметы-декор двигаются при прокрутке ===== */
  function parallax() {
    if (reduced) return;
    const vh = innerHeight;
    document.querySelectorAll('[data-scroll-speed]').forEach(d => {
      const r = d.parentElement.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - vh / 2) * +d.dataset.scrollSpeed;
      d.style.setProperty('--sy', offset.toFixed(1) + 'px');
    });
  }

  /* ===== Карточки «Подробнее» (панель внутри карточки) ===== */
  const closeDetails = (card) => {
    card.classList.remove('is-open');
    const btn = $('[data-details-open]', card);
    btn?.setAttribute('aria-expanded', 'false');
    $('.details', card).inert = true;
  };
  $$('.product').forEach(card => {
    const panel = $('.details', card);
    panel.inert = true;
    $('[data-details-open]', card).addEventListener('click', (e) => {
      $$('.product.is-open').forEach(c => c !== card && closeDetails(c));
      card.classList.add('is-open');
      e.currentTarget.setAttribute('aria-expanded', 'true');
      panel.inert = false;
      $('.details__body', card).scrollTop = 0;
      setTimeout(() => $('[data-details-close]', card).focus({ preventScroll: true }), 300);
    });
    $('[data-details-close]', card).addEventListener('click', () => {
      closeDetails(card);
      $('[data-details-open]', card).focus({ preventScroll: true });
    });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') $$('.product.is-open').forEach(closeDetails); });

  /* ===== Поп-ап «бесплатный урок» ===== */
  const trial = $('#trial');
  const openTrial = () => {
    if (!trial || trial.open) return;
    if ($('#lightbox')?.open) return;
    setMenu(false);
    trial.showModal();
    document.body.classList.add('is-locked');
  };
  const closeTrial = () => { trial.close(); };
  trial.addEventListener('close', () => document.body.classList.remove('is-locked'));
  trial.addEventListener('click', (e) => { if (e.target === trial) closeTrial(); }); // клик по фону
  $$('[data-open-trial]').forEach(b => b.addEventListener('click', openTrial));
  $('[data-close-trial]').addEventListener('click', closeTrial);
  // Автопоказ через N секунд — при каждом заходе и обновлении страницы
  setTimeout(() => { if (!document.querySelector('dialog[open]')) openTrial(); }, CONFIG.trialDelay * 1000 + CONFIG.preloaderMin);

  /* Форма заявки */
  const form = $('#trial-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach(inp => {
      const bad = !inp.value.trim();
      inp.setAttribute('aria-invalid', bad);
      if (bad && ok) { inp.focus(); ok = false; }
    });
    if (!ok) return;
    const data = Object.fromEntries(new FormData(form));
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    try {
      if (CONFIG.formEndpoint) {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, source: 'Пробный урок — сайт Victoria\'s School' }),
        });
        if (!res.ok) throw new Error(res.status);
      } else {
        // Пока сервис приёма заявок не подключён — ведём в Telegram Виктории
        window.open(CONFIG.telegram, '_blank', 'noopener');
      }
      form.classList.add('is-sent');
    } catch {
      alert('Не получилось отправить заявку. Напишите, пожалуйста, Виктории в Telegram: @vikusyonochek');
    } finally {
      btn.disabled = false;
    }
  });
  $$('input', form).forEach(i => i.addEventListener('input', () => i.removeAttribute('aria-invalid')));

  /* ===== Лайтбокс документов ===== */
  const DOCS = [
    { src: 'assets/img/doc-ielts-1275.webp', title: 'Сертификат IELTS 7.5 — уровень C1 / Advanced (2021)' },
    { src: 'assets/img/doc-master-1275.webp', title: 'Диплом магистра с отличием «Лингвистика» — РУДН (2023)' },
    { src: 'assets/img/doc-master-app-1275.webp', title: 'Приложение к диплому магистра — РУДН (2023)' },
    { src: 'assets/img/doc-bachelor-1275.webp', title: 'Диплом бакалавра с отличием — ПсковГУ (2021)' },
  ];
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-caption');
  let cur = 0;
  const show = (i) => {
    cur = (i + DOCS.length) % DOCS.length;
    lbImg.src = DOCS[cur].src;
    lbImg.alt = DOCS[cur].title;
    lbCap.textContent = DOCS[cur].title;
  };
  $$('[data-doc]').forEach(b => b.addEventListener('click', () => {
    show(+b.dataset.doc);
    lb.showModal();
    document.body.classList.add('is-locked');
  }));
  lb.addEventListener('close', () => document.body.classList.remove('is-locked'));
  $('[data-lb-close]').addEventListener('click', () => lb.close());
  $('[data-lb-prev]').addEventListener('click', () => show(cur - 1));
  $('[data-lb-next]').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__stage')) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  // свайп на телефоне
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });

  /* ===== Cookie ===== */
  const cookie = $('.cookie');
  if (!store.get('vs-cookie-ok')) setTimeout(() => cookie.classList.add('is-visible'), 2500);
  $('[data-cookie-ok]').addEventListener('click', () => {
    cookie.classList.remove('is-visible');
    store.set('vs-cookie-ok', '1');
  });

  /* Год в подвале */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
