/* Vangarden Living — interações da LP. Vanilla, sem dependências. */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Menu mobile ---------- */
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  $$('#nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Reveal ao entrar na viewport ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Contadores ---------- */
  var counters = $$('.counter__n');
  var runCounter = function (el) {
    var to = parseInt(el.dataset.to, 10), dur = 1100, t0 = null;
    var step = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.dataset.to; });
  }

  /* ---------- Player de vídeo (facade: iframe só no clique) ---------- */
  var player = $('#player');
  if (player) {
    player.addEventListener('click', function () {
      var id = player.dataset.id;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
      f.title = 'Vídeo do Vangarden Living';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      player.innerHTML = '';
      player.appendChild(f);
      player.style.cursor = 'default';
    });
  }

  /* ---------- Lightbox de plantas ---------- */
  var lb = $('#lb'), lbimg = $('#lbimg'), lbcap = $('#lbcap'), lbx = $('#lbx');
  var lastFocus = null;
  var openLb = function (src, cap) {
    lastFocus = document.activeElement;
    lbimg.src = src; lbimg.alt = cap; lbcap.textContent = cap;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbx.focus();
  };
  var closeLb = function () {
    lb.hidden = true; lbimg.src = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  $$('.js-zoom').forEach(function (b) {
    b.addEventListener('click', function () { openLb(b.dataset.src, b.dataset.cap); });
  });
  lbx.addEventListener('click', closeLb);
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---------- Máscara de telefone ---------- */
  var fone = $('#fone');
  fone.addEventListener('input', function () {
    var v = fone.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6)      v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    else if (v.length > 0) v = '(' + v;
    fone.value = v;
  });

  /* ---------- Formulário ---------- */
  var form = $('#form'), msg = $('#msg'), submit = $('#submit');

  var invalid = function (el, cond) {
    el.classList.toggle('err', cond);
    return cond;
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.className = 'form__msg';
    msg.textContent = '';

    var nome  = $('#nome'), email = $('#email');
    var bad = false;
    bad = invalid(nome,  nome.value.trim().length < 3) || bad;
    bad = invalid(fone,  fone.value.replace(/\D/g, '').length < 10) || bad;
    bad = invalid(email, !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) || bad;

    if (bad) {
      msg.className = 'form__msg bad';
      msg.textContent = 'Confira os campos destacados.';
      return;
    }

    var data = {
      nome: nome.value.trim(),
      telefone: fone.value.trim(),
      email: email.value.trim(),
      tipologia: $('#tipo').value,
      entrada: $('#entrada').value,
      origem: 'LP Vangarden Living',
      pagina: location.href,
      // UTMs repassadas ao CRM
      utm: (function () {
        var p = new URLSearchParams(location.search), o = {};
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']
          .forEach(function (k) { if (p.get(k)) o[k] = p.get(k); });
        return o;
      })()
    };

    submit.disabled = true;
    submit.textContent = 'Enviando…';

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        form.reset();
        msg.className = 'form__msg ok';
        msg.textContent = 'Recebemos seus dados. Um consultor entra em contato em breve.';
        // Eventos de conversão
        if (window.fbq) window.fbq('track', 'Lead');
        if (window.gtag) window.gtag('event', 'generate_lead', { value: 1 });
      })
      .catch(function () {
        // Sem rota de escape por WhatsApp: o cadastro é o único caminho.
        // Se cair aqui, o lead se perde — o /api/lead precisa estar no ar.
        msg.className = 'form__msg bad';
        msg.textContent = 'Não conseguimos enviar agora. Tente novamente em instantes.';
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = 'Quero receber as informações';
      });
  });
})();
