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

  /* =========================================================
     Atribuição de origem
     ---------------------------------------------------------
     Lê os parâmetros de URL no primeiro acesso e guarda em
     localStorage por 90 dias. Sem isso, a atribuição só existiria
     enquanto a query string estivesse na barra de endereço: quem
     recarrega, volta depois ou navega para outra página perderia
     a origem. Guarda dois toques:

       primeiro toque — como a pessoa descobriu o empreendimento
       último toque   — o que a trouxe de volta na hora de converter

     Quando não há UTM, deduz a origem pelo referrer, para separar
     orgânico, social e direto em vez de jogar tudo em "sem origem".
     ========================================================= */
  var RASTREIO = {
    chaves: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
             'gclid', 'fbclid', 'ttclid', 'msclkid', 'wbraid', 'gbraid'],
    armazem: 'vg_attr',
    validadeDias: 90
  };

  /** Parâmetros de rastreio presentes na URL atual. */
  function paramsDaUrl() {
    var p = new URLSearchParams(location.search), o = {}, achou = false;
    RASTREIO.chaves.forEach(function (k) {
      var v = p.get(k);
      if (v) { o[k] = v.slice(0, 200); achou = true; }
    });
    return achou ? completaPorClickId(o) : null;
  }

  /**
   * Preenche origem e mídia quando a URL trouxe só o click id.
   * Google Ads com autotagging manda apenas gclid; sem isto, campanha
   * paga entraria no relatório como "direto".
   */
  function completaPorClickId(o) {
    if (o.utm_source) return o;
    if (o.gclid || o.wbraid || o.gbraid) { o.utm_source = 'google'; o.utm_medium = o.utm_medium || 'cpc'; }
    else if (o.msclkid) { o.utm_source = 'bing'; o.utm_medium = o.utm_medium || 'cpc'; }
    else if (o.ttclid) { o.utm_source = 'tiktok'; o.utm_medium = o.utm_medium || 'cpc'; }
    else if (o.fbclid) {
      // fbclid aparece em link pago e orgânico. O referrer desempata a rede;
      // a mídia fica como social, que é o que dá para afirmar.
      var ref = (document.referrer || '').toLowerCase();
      o.utm_source = ref.indexOf('instagram') > -1 ? 'instagram' : 'facebook';
      o.utm_medium = o.utm_medium || 'social';
    }
    return o;
  }

  /** Deduz origem e mídia a partir do referrer, quando não há UTM. */
  function peloReferrer() {
    var ref = document.referrer || '';
    if (!ref) return { utm_source: 'direto', utm_medium: 'none' };

    var host;
    try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return null; }
    if (host === location.hostname) return null; // navegação interna: não é toque novo

    var buscadores = /^(google|bing|duckduckgo|yahoo|ecosia|brave)\./;
    var sociais = {
      'instagram.com': 'instagram', 'l.instagram.com': 'instagram',
      'facebook.com': 'facebook', 'l.facebook.com': 'facebook', 'm.facebook.com': 'facebook',
      'youtube.com': 'youtube', 'youtu.be': 'youtube',
      'linkedin.com': 'linkedin', 'lnkd.in': 'linkedin',
      't.co': 'twitter', 'tiktok.com': 'tiktok',
      'web.whatsapp.com': 'whatsapp', 'api.whatsapp.com': 'whatsapp'
    };

    if (sociais[host]) return { utm_source: sociais[host], utm_medium: 'social' };
    if (buscadores.test(host)) return { utm_source: host.split('.')[0], utm_medium: 'organico' };
    return { utm_source: host, utm_medium: 'referral' };
  }

  /** localStorage pode estourar em modo privado; nunca deve derrubar a página. */
  function leArmazem() {
    try {
      var cru = localStorage.getItem(RASTREIO.armazem);
      if (!cru) return null;
      var d = JSON.parse(cru);
      var limite = RASTREIO.validadeDias * 864e5;
      if (!d.primeiro || Date.now() - d.primeiro.em > limite) return null;
      return d;
    } catch (e) { return null; }
  }

  function gravaArmazem(d) {
    try { localStorage.setItem(RASTREIO.armazem, JSON.stringify(d)); } catch (e) { /* ignora */ }
  }

  /** Roda uma vez no carregamento e devolve a atribuição consolidada. */
  var atribuicao = (function () {
    var guardado = leArmazem();
    var agora = paramsDaUrl() || peloReferrer();

    var toque = agora
      ? { dados: agora, em: Date.now(), pagina: location.href.slice(0, 300) }
      : null;

    // Toque novo só conta se trouxer UTM/click id, ou se for a primeira visita.
    // Navegação interna sem parâmetro não sobrescreve o último toque.
    var d = guardado || { primeiro: toque, ultimo: toque };
    if (toque && guardado) {
      var temParam = !!paramsDaUrl();
      if (temParam) d.ultimo = toque;
      if (!d.primeiro) d.primeiro = toque;
    }
    if (d.primeiro || d.ultimo) gravaArmazem(d);
    return d;
  })();

  /** Achata a atribuição no formato que o webhook recebe. */
  function dadosDeOrigem() {
    var p = (atribuicao.primeiro && atribuicao.primeiro.dados) || {};
    var u = (atribuicao.ultimo && atribuicao.ultimo.dados) || {};
    var o = {};

    // Último toque na raiz: é o que a maioria das ferramentas espera ler.
    RASTREIO.chaves.forEach(function (k) { o[k] = u[k] || ''; });

    o.utm = {};
    RASTREIO.chaves.forEach(function (k) { o.utm[k] = u[k] || ''; });

    o.primeiro_toque_source = p.utm_source || '';
    o.primeiro_toque_medium = p.utm_medium || '';
    o.primeiro_toque_campaign = p.utm_campaign || '';
    o.primeiro_toque_em = atribuicao.primeiro
      ? new Date(atribuicao.primeiro.em).toISOString() : '';
    o.landing_page = (atribuicao.primeiro && atribuicao.primeiro.pagina) || '';

    // Rótulo legível, do jeito que aparece em relatório: "meta / cpc".
    o.origem_detectada = (u.utm_source || 'direto') + ' / ' + (u.utm_medium || 'none');

    return o;
  }

  /* ---------- Formulário ---------- */
  // POST direto no Visimob Leads. Não há backend: a LP é servida como
  // estático puro, então o roteamento do lead acontece do lado do Visimob.
  var WEBHOOK_URL = 'https://leads.visimob.com/api/v1/webhooks/4f9f759144254d2c8c873fc18e063180/';

  var form = $('#form'), msg = $('#msg'), submit = $('#submit'), done = $('#done');

  /** Tira o formulário de cena e mostra o card de agradecimento. */
  var mostrarObrigado = function () {
    form.hidden = true;
    done.hidden = false;
    done.focus();
  };

  var invalid = function (el, cond) {
    el.classList.toggle('err', cond);
    return cond;
  };

  $$('#form select').forEach(function (sel) {
    sel.addEventListener('change', function () { sel.classList.remove('err'); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.className = 'form__msg';
    msg.textContent = '';

    var nome = $('#nome'), email = $('#email'), tipo = $('#tipo'), entrada = $('#entrada');
    var bad = false;
    bad = invalid(nome,    nome.value.trim().length < 3) || bad;
    bad = invalid(fone,    fone.value.replace(/\D/g, '').length < 10) || bad;
    bad = invalid(email,   !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) || bad;
    bad = invalid(tipo,    !tipo.value) || bad;
    bad = invalid(entrada, !entrada.value) || bad;

    if (bad) {
      msg.className = 'form__msg bad';
      msg.textContent = 'Confira os campos destacados.';
      return;
    }

    // Honeypot: humano deixa vazio. A checagem era feita na Function; sem
    // backend ela precisa acontecer aqui, antes de tocar no webhook.
    // Mostra sucesso para o bot não descobrir que foi barrado.
    if ($('#website').value.trim()) {
      form.reset();
      msg.className = 'form__msg ok';
      msg.textContent = 'Recebemos seus dados. Um consultor entra em contato em breve.';
      return;
    }

    var rastreio = dadosDeOrigem();

    var data = {
      nome: nome.value.trim(),
      telefone: fone.value.trim(),
      email: email.value.trim(),
      tipologia: tipo.value,
      entrada: entrada.value,
      origem: 'LP Vangarden Living',
      pagina: location.href,
      current_url: location.href,
      referrer: document.referrer || ''
    };

    // Tracking vai achatado na raiz e aninhado em `utm`: o webhook lê de
    // um jeito ou de outro dependendo do mapeamento, e mandar nos dois
    // formatos evita depender disso.
    Object.keys(rastreio).forEach(function (k) { data[k] = rastreio[k]; });

    submit.disabled = true;
    submit.textContent = 'Enviando…';

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        // O formulário sai de cena e o card de agradecimento ocupa o lugar.
        form.hidden = true;
        done.hidden = false;
        done.focus();
        // Eventos de conversão
        if (window.fbq) window.fbq('track', 'Lead');
        if (window.gtag) window.gtag('event', 'generate_lead', { value: 1 });
      })
      .catch(function () {
        // Sem rota de escape por WhatsApp: o cadastro é o único caminho.
        // Se cair aqui, o lead se perde — o webhook precisa estar no ar.
        msg.className = 'form__msg bad';
        msg.textContent = 'Não conseguimos enviar agora. Tente novamente em instantes.';
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = 'Quero receber as informações';
      });
  });
})();
