#!/bin/zsh
# Lista os funis e etapas do Kommo, para descobrir KOMMO_PIPELINE_ID e KOMMO_STATUS_ID.
#
#   zsh scripts/kommo-ids.sh
#
# Lê de .dev.vars se existir; senão pergunta.

set -u
cd "$(dirname "$0")/.." || exit 1

# --- credenciais ---------------------------------------------------
if [ -f .dev.vars ]; then
  SUB=$(grep -E '^KOMMO_SUBDOMAIN=' .dev.vars | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
  TOK=$(grep -E '^KOMMO_TOKEN=' .dev.vars | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "${SUB:-}" ] || [ "$SUB" = "exemplo" ] || [ "$SUB" = "seusubdominio" ]; then
  printf 'Subdomínio do Kommo (só a parte antes de .kommo.com): '
  read -r SUB
fi
if [ -z "${TOK:-}" ] || [ "$TOK" = "token-de-teste" ] || [ "$TOK" = "cole_o_token_aqui" ]; then
  printf 'Token de longa duração: '
  read -r TOK
fi

SUB=$(echo "$SUB" | xargs)
TOK=$(echo "$TOK" | xargs)

if [ -z "$SUB" ] || [ -z "$TOK" ]; then
  echo "✗ Subdomínio ou token vazio. Abortando."
  exit 1
fi

echo
echo "Consultando https://$SUB.kommo.com ..."
echo

# --- chamada -------------------------------------------------------
BODY=$(mktemp)
CODE=$(curl -sS -o "$BODY" -w '%{http_code}' \
  -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  "https://$SUB.kommo.com/api/v4/leads/pipelines" 2>"$BODY.err")

if [ -z "$CODE" ]; then
  echo "✗ Não consegui conectar. Detalhe:"
  sed 's/^/   /' "$BODY.err"
  echo
  echo "   Normalmente é o subdomínio errado. Confira a URL quando estiver logado no Kommo."
  rm -f "$BODY" "$BODY.err"; exit 1
fi

case "$CODE" in
  200) ;;
  401) echo "✗ HTTP 401 — token inválido ou expirado."; rm -f "$BODY" "$BODY.err"; exit 1 ;;
  403) echo "✗ HTTP 403 — a integração não tem permissão para ler funis."; rm -f "$BODY" "$BODY.err"; exit 1 ;;
  404) echo "✗ HTTP 404 — subdomínio '$SUB' não existe."; rm -f "$BODY" "$BODY.err"; exit 1 ;;
  *)   echo "✗ HTTP $CODE. Resposta:"; head -c 500 "$BODY" | sed 's/^/   /'; echo; rm -f "$BODY" "$BODY.err"; exit 1 ;;
esac

python3 - "$BODY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
funis = d.get("_embedded", {}).get("pipelines", [])
if not funis:
    print("Nenhum funil encontrado nesta conta.")
    raise SystemExit
for p in funis:
    principal = "  (principal)" if p.get("is_main") else ""
    print(f'\nFUNIL: {p["name"]}{principal}')
    print(f'  KOMMO_PIPELINE_ID={p["id"]}')
    print('  etapas:')
    for s in p.get("_embedded", {}).get("statuses", []):
        # 142 = Venda ganha, 143 = Venda perdida. Não servem como etapa de entrada.
        marca = '  ← não use (sistema)' if s["id"] in (142, 143) else ''
        print(f'     {s["name"][:34].ljust(34)} KOMMO_STATUS_ID={s["id"]}{marca}')
print('\nEscolha a etapa onde o lead da landing page deve entrar')
print('(normalmente a primeira do funil) e me mande os dois números.')
PY

rm -f "$BODY" "$BODY.err"
