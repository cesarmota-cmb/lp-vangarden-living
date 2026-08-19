# LP Vangarden Living

Landing page de captação do **Vangarden Living** — LBraga Construtora, Granja Marileusa, Uberlândia/MG.

HTML, CSS e JavaScript puros. Sem build, sem framework, sem dependência de runtime.

---

## Estrutura

```
.
└── site/                  # diretório publicado
    ├── index.html
    ├── robots.txt         # noindex enquanto não publicar no domínio final
    ├── _headers           # formato Cloudflare; sem efeito no nginx (ver Deploy)
    └── assets/
        ├── css/style.css
        ├── js/main.js
        ├── img/           # imagens já otimizadas para web
        └── fonts/
```

Não há backend: o conteúdo de `site/` é tudo que vai para o servidor.

## Desenvolvimento local

```bash
cd site
python3 -m http.server 8080
```

Abra <http://127.0.0.1:8080>.

## Formulário e leads

O `POST` vai direto para o Visimob Leads, sem intermediário:

```
https://leads.visimob.com/api/v1/webhooks/4f9f759144254d2c8c873fc18e063180/
```

O roteamento do lead acontece do lado do Visimob. **Este empreendimento não vai
para o Kommo** — a lançadora parceira usa outra ferramenta, e o destino é a suíte
antiga. Não há variáveis de ambiente a configurar.

Campos enviados:

| Campo | Origem |
|---|---|
| `nome`, `telefone`, `email` | preenchidos pelo usuário |
| `tipologia` | planta de interesse |
| `entrada` | faixa de valor de entrada |
| `origem` | fixo: `LP Vangarden Living` |
| `pagina`, `current_url`, `referrer` | contexto da visita |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid` | querystring |

O tracking vai **duas vezes**: achatado na raiz e aninhado em `utm`. É intencional —
evita depender de como o mapeamento do webhook lê o payload.

O honeypot (`#website`) é validado no cliente, antes do envio. Bot preenchido
recebe a mensagem de sucesso e o lead é descartado sem tocar no webhook.

## Deploy

Servidor estático (nginx), servida em subpasta. Suba o **conteúdo** de `site/`:

```bash
scp -r site/* usuario@servidor:/caminho/para/lancamentos/vangarden/
```

Todos os caminhos do HTML e do CSS são relativos, então a LP funciona em qualquer
subpasta sem alteração de código.

O `site/_headers` é formato Cloudflare Pages e **não tem efeito no nginx**. O cache
dos assets, o `X-Content-Type-Options`, o `Referrer-Policy` e o `X-Frame-Options`
que estavam ali precisam ser reescritos na config do nginx, se forem desejados.

### ⚠️ Toda LP nasce com o GTM instalado

As LPs da LBraga usam **um único container do Google Tag Manager**:

```
GTM-FVT9V454
```

Não há GA4 nem Meta Pixel instalados direto na página — **tudo é disparado por
dentro do GTM**. Não acrescente `gtag.js` nem `fbevents.js` no HTML: duplica
medição e some com o controle centralizado.

O snippet vai em **dois lugares**, e os dois são obrigatórios:

1. No `<head>`, o mais alto possível — logo depois de `<head>`, antes das `<meta>`
2. No `<body>`, o `<noscript>` com o iframe — primeira coisa depois de `<body>`

Copie de qualquer LP irmã já publicada (`plaza`, `opera`) para não errar o ID.

**Checklist ao criar ou publicar uma LP nova:** confirmar que
`grep -c 'GTM-FVT9V454' site/index.html` devolve **2**. Se devolver 0 ou 1, o
rastreamento está incompleto e a mídia paga fica sem atribuição — e esse erro
não aparece na tela, a página funciona normalmente sem ele.

O `main.js` já dispara `fbq('track','Lead')` e `gtag('event','generate_lead')` no
envio do formulário. Esses disparos só têm efeito se as tags correspondentes
existirem dentro do container — sem GTM na página, eles caem no vazio.

### ⚠️ Cache busting: subir o `?v=` ao alterar CSS ou JS

O domínio está atrás da Cloudflare, que guarda `.css` e `.js` na borda por
**4 horas** (`cache-control: max-age=14400`, verificado em produção). Como o
`_headers` não vale fora do Pages, não há como encurtar isso pelo repositório.

Por isso o `index.html` referencia os dois assets com versão:

```html
<link rel="stylesheet" href="assets/css/style.css?v=1">
<script src="assets/js/main.js?v=1" defer></script>
```

**Toda alteração em `style.css` ou `main.js` precisa subir esse número**, nos dois
lugares ou só no arquivo alterado. Sem isso, o deploy sobe mas quem já visitou
continua recebendo a versão antiga por até 4 horas — e o problema é silencioso:
o `scp` termina sem erro e a página parece publicada.

As outras LPs da LBraga seguem a mesma convenção (`?v=2` na Amoreiras,
`?v=20260120h` no Plaza). A LP do Ópera é a exceção: por ser build do Vite, o
hash no nome do arquivo já resolve o cache sozinho.

---

## Decisões de implementação

**Design system.** Tokens de cor, tipografia e espaçamento estão no `:root` do
[`style.css`](site/assets/css/style.css), derivados do manual da marca: fundo roxo-noite
`#191627`, champagne `#969180`, tipografia geométrica com contraste Thin × Bold.

**Tipografia.** A fonte do manual é a Gilroy, que é comercial. Enquanto a licença webfont
não for confirmada, o site usa **Poppins** (Google Fonts), que é o fallback aprovado.
A troca é uma linha em `--vg-font`.

**Composição.** Painel escuro sólido ao lado de imagem sangrada, com um quadrado champagne
marcando a costura entre os dois — o dispositivo gráfico que dá unidade ao material impresso.
No mobile, sem duas colunas, o quadrado passa a marcar a borda superior da imagem.

**Vídeo.** O player da seção usa fachada estática: só carrega o iframe do YouTube no clique,
para não pesar no carregamento inicial. A thumbnail é servida localmente.

**Mapa.** O embed do Google Maps não recebe filtro de inversão. Um mapa escuro casaria melhor
com o restante da página, mas inverter as cores altera o logo e a atribuição do Google, o que
os Termos do Maps não permitem. Para mapa escuro de verdade, o caminho é a Maps JavaScript API
com estilo customizado.

**Acessibilidade.** Navegação por teclado no lightbox, `prefers-reduced-motion` respeitado,
skip link, e contraste verificado nas tags e nos textos sobre champagne.

---

## Rastreamento de origem

A LP guarda a origem em `localStorage` por **90 dias**, com dois toques:

- **Primeiro toque** — como a pessoa descobriu o empreendimento
- **Último toque** — o que a trouxe de volta na hora de converter

Ler a UTM só na hora do envio perde atribuição de quem recarrega, volta depois ou
chega sem parâmetro. Navegação sem parâmetro **não** sobrescreve o último toque.

### ⚠️ Navegação interna é por caminho, não por host

A LP roda em **subpasta do domínio principal** (`lbragaconstrutora.com.br/lancamentos/vangarden/`),
e não em domínio próprio. Isso muda o significado de "navegação interna".

A regra que decide se um referrer conta como toque novo compara o **caminho**:

```js
if (url.hostname === location.hostname && url.pathname.indexOf(baseDaLp()) === 0) return null;
```

Comparar só o hostname — que é o reflexo natural quando a LP tem domínio próprio —
trata **quem chega do site institucional da LBraga como navegação interna**, porque o
host é o mesmo. O efeito é silencioso e caro: esse tráfego entra como `direto / none`,
nada é gravado em `localStorage`, e os campos de primeiro toque chegam vazios ao webhook.

Ao mover esta LP para outro endereço, revisar esta função. Se um dia ela voltar a ter
domínio próprio, a comparação por caminho continua correta — o inverso não é verdade.

### ⚠️ A resposta ao honeypot tem que ser idêntica à do sucesso

O honeypot (`#website`) e o envio bem-sucedido chamam **a mesma** `mostrarObrigado()`.
Isso não é estilo: se o bot receber uma tela diferente da do humano, ele descobre que
foi barrado e a armadilha perde a serventia. Ao mexer no fluxo de sucesso, mexer nos
dois caminhos junto — ou, de preferência, seguir chamando a mesma função.

Quando não há UTM, a origem é deduzida:

| Situação | Resultado |
|---|---|
| `?gclid=` (autotagging do Google Ads) | `google / cpc` |
| `?fbclid=` | `facebook` ou `instagram` / `social` |
| `?msclkid=` / `?ttclid=` | `bing` / `tiktok` — `cpc` |
| Veio de busca (google, bing, duckduckgo…) | `google / organico` |
| Veio de rede social | ex.: `instagram / social` |
| Veio de outro site | `dominio.com / referral` |
| **Veio do site institucional da LBraga** | `lbragaconstrutora.com.br / referral` |
| Navegação dentro da própria LP | não conta como toque novo |
| Sem referrer | `direto / none` |

### Campos enviados ao webhook

Além dos que já existiam, o payload passou a incluir:

| Campo | Conteúdo |
|---|---|
| `origem_detectada` | rótulo pronto para relatório, ex.: `meta / cpc` |
| `primeiro_toque_source` · `_medium` · `_campaign` | atribuição de primeiro toque |
| `primeiro_toque_em` | data ISO do primeiro contato |
| `landing_page` | primeira página acessada |
| `wbraid` · `gbraid` · `ttclid` · `msclkid` | click ids que faltavam |

Nada do contrato anterior mudou: o último toque continua achatado na raiz **e**
aninhado em `utm`, com os mesmos nomes.

### Como montar os links de campanha

Use sempre minúsculas e hífen, nunca espaço ou acento — UTM diferencia
maiúsculas, e `Meta` vira uma origem separada de `meta` no relatório.

```
https://SEUDOMINIO/vangarden/?utm_source=meta&utm_medium=cpc&utm_campaign=lancamento-agosto&utm_content=carrossel-rooftop
```

| Parâmetro | Para que serve | Exemplos |
|---|---|---|
| `utm_source` | de onde veio | `meta`, `google`, `instagram`, `email`, `whatsapp` |
| `utm_medium` | tipo de tráfego | `cpc`, `social`, `organico`, `email`, `bio` |
| `utm_campaign` | a campanha | `lancamento-agosto`, `ultimas-unidades` |
| `utm_content` | qual criativo | `carrossel-rooftop`, `video-planta`, `estatico-fachada` |
| `utm_term` | palavra-chave (busca paga) | `apartamento-granja-marileusa` |

No Google Ads, deixe o autotagging ligado: o `gclid` sozinho já é reconhecido
como `google / cpc`, sem precisar montar UTM na mão.

---

## Pendências

- [ ] Reescrever no nginx os cabeçalhos que estavam no `_headers` (cache dos assets e
      headers de segurança), que o formato Cloudflare não cobre
- [ ] Licença webfont da Gilroy
- [ ] Ícones da marca em SVG (hoje são caracteres Unicode provisórios)
- [ ] Logos Vangarden e LBraga em SVG
- [ ] Favicon e `og:image` definitivos
- [ ] Reverter `robots.txt` e o `X-Robots-Tag` de `_headers` ao publicar no domínio final
- [ ] Configurar as tags de GA4 e Meta Pixel **dentro do container** GTM-FVT9V454.
      O snippet do GTM já está na página e o `main.js` já dispara `Lead` e
      `generate_lead` no envio — falta o container ter as tags que escutam esses eventos

---

Os materiais brutos — renders, plantas, book de vendas e documentos de briefing — não fazem
parte deste repositório. Ficam na pasta do empreendimento no iCloud.
