# LP Vangarden Living

Landing page de captação do **Vangarden Living** — LBraga Construtora, Granja Marileusa, Uberlândia/MG.

HTML, CSS e JavaScript puros. Sem build, sem framework, sem dependência de runtime.

---

## Estrutura

```
.
├── site/                  # diretório publicado (build output do Cloudflare Pages)
│   ├── index.html
│   ├── robots.txt         # noindex enquanto estiver em *.pages.dev
│   ├── _headers           # cache e cabeçalhos de segurança
│   └── assets/
│       ├── css/style.css
│       ├── js/main.js
│       ├── img/           # imagens já otimizadas para web
│       └── fonts/
└── functions/
    └── api/lead.js        # POST /api/lead → cria o lead no Kommo
```

`functions/` fica **fora** de `site/`, na raiz — é onde o Pages procura as Functions.

## Desenvolvimento local

```bash
cd site
python3 -m http.server 8080
```

Abra <http://127.0.0.1:8080>.

## Variáveis de ambiente

Configure em **Cloudflare Pages → Settings → Environment variables**, para Production e Preview:

| Variável | O que é | Onde achar no Kommo |
|---|---|---|
| `KOMMO_SUBDOMAIN` | subdomínio da conta, sem `.kommo.com` | está na própria URL: `SUBDOMINIO.kommo.com` |
| `KOMMO_TOKEN` | token de longa duração — **marcar como Secret** | Configurações → Integrações → criar integração privada → aba Chaves |
| `KOMMO_PIPELINE_ID` | id numérico do funil | abra o funil; o id aparece na URL |
| `KOMMO_STATUS_ID` | id numérico da etapa de entrada | `GET /api/v4/leads/pipelines/{pipeline_id}` lista as etapas |
| `KOMMO_TAG` | opcional; padrão `LP Vangarden Living` | — |

Para rodar local, crie um `.dev.vars` na raiz com as mesmas chaves. Ele está no `.gitignore`
e não deve ser versionado nunca.

```bash
npx wrangler pages dev site
```

O token só existe no servidor: ele nunca é enviado ao navegador.

## Deploy

Cloudflare Pages, com `site` como *build output directory* e nenhum comando de build.

```bash
npx wrangler login
npx wrangler pages deploy site --project-name lp-vangarden-living
```

Rode a partir da raiz do projeto, para que o `functions/` seja compilado junto.

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

## Pendências

- [ ] Credenciais do Kommo nas variáveis de ambiente. O endpoint já existe e está testado,
      mas **enquanto as variáveis não forem preenchidas ele responde 503 e o cadastro se perde** —
      o formulário é hoje o único caminho de conversão da página.
- [ ] Faixas reais de valor de entrada no formulário (as atuais são placeholder)
- [ ] Licença webfont da Gilroy
- [ ] Ícones da marca em SVG (hoje são caracteres Unicode provisórios)
- [ ] Logos Vangarden e LBraga em SVG
- [ ] Favicon e `og:image` definitivos
- [ ] Reverter `robots.txt` e o `X-Robots-Tag` de `_headers` ao publicar no domínio final
- [ ] Meta Pixel e GA4 (o disparo do evento `Lead` já está no `main.js`, faltam os scripts)

---

Os materiais brutos — renders, plantas, book de vendas e documentos de briefing — não fazem
parte deste repositório. Ficam na pasta do empreendimento no iCloud.
