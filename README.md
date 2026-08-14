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

Quando não há UTM, a origem é deduzida:

| Situação | Resultado |
|---|---|
| `?gclid=` (autotagging do Google Ads) | `google / cpc` |
| `?fbclid=` | `facebook` ou `instagram` / `social` |
| `?msclkid=` / `?ttclid=` | `bing` / `tiktok` — `cpc` |
| Veio de busca (google, bing, duckduckgo…) | `google / organico` |
| Veio de rede social | ex.: `instagram / social` |
| Veio de outro site | `dominio.com / referral` |
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
- [ ] Meta Pixel e GA4 (o disparo do evento `Lead` já está no `main.js`, faltam os scripts)

---

Os materiais brutos — renders, plantas, book de vendas e documentos de briefing — não fazem
parte deste repositório. Ficam na pasta do empreendimento no iCloud.
