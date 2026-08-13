/**
 * POST /api/lead — recebe o formulário da LP e cria o lead no Kommo.
 *
 * Cloudflare Pages Function. Configure em Settings → Environment variables:
 *
 *   KOMMO_SUBDOMAIN    ex.: "lbraga"  (de lbraga.kommo.com)
 *   KOMMO_TOKEN        token de longa duração da integração  [marcar como Secret]
 *   KOMMO_PIPELINE_ID  id numérico do funil
 *   KOMMO_STATUS_ID    id numérico da etapa de entrada
 *   KOMMO_TAG          opcional; padrão "LP Vangarden Living"
 *
 * O token NUNCA aparece no cliente: só existe aqui, no servidor.
 */

const API_TIMEOUT_MS = 10000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/** Corta e limita string livre, para não mandar lixo ao CRM. */
const limpa = (v, max = 200) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const digitos = (v) => String(v || '').replace(/\D/g, '');

const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Chamada ao Kommo com timeout, para a Function não ficar pendurada. */
async function kommo(env, caminho, corpo) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://${env.KOMMO_SUBDOMAIN}.kommo.com/api/v4${caminho}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.KOMMO_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corpo),
        signal: ctrl.signal,
      }
    );
    const texto = await r.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch (_) { /* resposta não-JSON */ }
    return { ok: r.ok, status: r.status, dados, texto };
  } finally {
    clearTimeout(t);
  }
}

export async function onRequestPost({ request, env }) {
  // --- configuração -------------------------------------------------
  const faltando = ['KOMMO_SUBDOMAIN', 'KOMMO_TOKEN', 'KOMMO_PIPELINE_ID', 'KOMMO_STATUS_ID']
    .filter((k) => !env[k]);
  if (faltando.length) {
    console.error('Variáveis de ambiente ausentes:', faltando.join(', '));
    return json({ erro: 'indisponivel' }, 503);
  }

  // --- payload ------------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ erro: 'payload_invalido' }, 400);
  }

  // Honeypot: campo invisível ao humano. Preenchido = bot.
  // Responde 200 para o bot não descobrir que foi barrado.
  if (limpa(body.website)) {
    console.log('Honeypot acionado — lead descartado.');
    return json({ ok: true });
  }

  const nome = limpa(body.nome, 120);
  const email = limpa(body.email, 120).toLowerCase();
  const telefone = limpa(body.telefone, 40);
  const fone = digitos(telefone);

  const erros = [];
  if (nome.length < 3) erros.push('nome');
  if (fone.length < 10 || fone.length > 13) erros.push('telefone');
  if (!emailValido(email)) erros.push('email');
  if (erros.length) return json({ erro: 'validacao', campos: erros }, 422);

  const tipologia = limpa(body.tipologia, 80);
  const entrada = limpa(body.entrada, 80);
  const pagina = limpa(body.pagina, 300);
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};

  // --- tags ---------------------------------------------------------
  const tags = [{ name: env.KOMMO_TAG || 'LP Vangarden Living' }];
  if (limpa(utm.utm_source, 40)) tags.push({ name: `origem: ${limpa(utm.utm_source, 40)}` });
  if (limpa(utm.utm_campaign, 60)) tags.push({ name: `campanha: ${limpa(utm.utm_campaign, 60)}` });
  if (tipologia) tags.push({ name: `interesse: ${tipologia}` });

  // --- cria lead + contato numa chamada só ---------------------------
  const payload = [
    {
      name: `Vangarden Living — ${nome}`,
      pipeline_id: Number(env.KOMMO_PIPELINE_ID),
      status_id: Number(env.KOMMO_STATUS_ID),
      _embedded: {
        tags,
        contacts: [
          {
            first_name: nome,
            custom_fields_values: [
              { field_code: 'PHONE', values: [{ value: telefone, enum_code: 'MOB' }] },
              { field_code: 'EMAIL', values: [{ value: email, enum_code: 'WORK' }] },
            ],
          },
        ],
      },
    },
  ];

  const criado = await kommo(env, '/leads/complex', payload);

  if (!criado.ok) {
    // Loga o corpo do erro para dar o que depurar; o cliente não vê nada disso.
    console.error('Kommo /leads/complex falhou', criado.status, criado.texto?.slice(0, 500));
    return json({ erro: 'crm_indisponivel' }, 502);
  }

  const leadId = Array.isArray(criado.dados) ? criado.dados[0]?.id : null;

  // --- anota o resto como nota ---------------------------------------
  // Vai como nota, e não como campo customizado, porque os ids de campo
  // são específicos da conta. Assim a integração funciona sem depender
  // de mapeamento — se quiser campos estruturados depois, é só trocar aqui.
  if (leadId) {
    const linhas = [
      'Lead recebido pela landing page.',
      '',
      `Nome: ${nome}`,
      `Telefone: ${telefone}`,
      `E-mail: ${email}`,
      tipologia ? `Tipologia de interesse: ${tipologia}` : null,
      entrada ? `Valor de entrada: ${entrada}` : null,
      pagina ? `Página: ${pagina}` : null,
    ];

    const chavesUtm = Object.keys(utm);
    if (chavesUtm.length) {
      linhas.push('', 'Rastreamento:');
      for (const k of chavesUtm) linhas.push(`  ${k}: ${limpa(utm[k], 120)}`);
    }

    const nota = await kommo(env, `/leads/${leadId}/notes`, [
      { note_type: 'common', params: { text: linhas.filter(Boolean).join('\n') } },
    ]);
    // A nota é complementar: se falhar, o lead já está salvo e não vale derrubar a resposta.
    if (!nota.ok) {
      console.error('Kommo nota falhou', nota.status, nota.texto?.slice(0, 300));
    }
  }

  return json({ ok: true, lead_id: leadId });
}

/** Qualquer método que não seja POST. */
export async function onRequest({ request }) {
  if (request.method === 'POST') return; // segue para onRequestPost
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' },
  });
}
