# Porto do Pecem - Gestao Operacional

## Como iniciar (passo a passo)

Este projeto usa React, TypeScript e Vite. **Nao abra o arquivo `index.html` diretamente e nao use o Live Server do VS Code.** O Live Server nao compila arquivos `.tsx` e causa o erro:

`Expected a JavaScript-or-Wasm module script ... application/octet-stream`

O painel autenticado inclui Visão geral, Previsão de navios, Produtividade,
Planejamento, Frota e Apontamento de campo. A navegação funciona em telas
pequenas e grandes; o service worker mantém recursos estáticos disponíveis
offline e não armazena chamadas ao Supabase nem à API.

1. Instale o Node.js 24 ou superior pelo site oficial: https://nodejs.org/
2. Abra o terminal na pasta deste projeto.
3. Instale as dependencias:

```bash
npm ci
```

4. Crie o arquivo `.env` a partir do `.env.example` e preencha as variaveis do Supabase. A URL e a chave precisam ser do mesmo projeto:

   - abra o projeto no Supabase
   - entre em `Settings > API`
   - copie a chave pública `anon` ou `publishable`
   - não use uma chave `service_role` no navegador
   - salve em `VITE_SUPABASE_ANON_KEY` e reinicie o Vite

   Se a tela mostrar `Supabase rejeitou a chave (HTTP 401)`, a aplicação está funcionando, mas a chave configurada foi rejeitada pelo Supabase.
5. Inicie o Vite:

```bash
npm start
```

6. Abra no navegador o endereco mostrado no terminal, normalmente:

```text
http://localhost:5173
```

Mantenha o terminal aberto enquanto usa o sistema. Para parar o servidor, pressione `Ctrl+C`.

## Validacao

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

### Windows PowerShell

Use `npm.cmd` if PowerShell blocks `npm.ps1` under the current execution policy.
Install the Puppeteer-managed Chrome once before scraping:

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run puppeteer:install-browser
npm.cmd run typecheck
npm.cmd run build
npm.cmd run scrape:sictos
```

The scraper writes eligible records to Supabase. Configure the service-role key
only in the local, ignored `.env` file or CI secrets. Supabase URL values should
be the project root URL, not a `/rest/v1` endpoint.

O Vite já fornece atualização automática durante `npm run dev`; não é
necessário adicionar `nodemon` a este frontend. Para executar localmente o
scraper Node, preencha as variáveis server-side no `.env` e rode:

```bash
npm run scrape:sictos
```

Em `npm run dev` no localhost, StackBlitz ou WebContainer, o painel Planejamento
abre em modo de demonstração sem chamadas ao Supabase. Os colaboradores de
exemplo e as alterações são salvos no `localStorage` do navegador. A tabela
aceita importação CSV/TSV com cabeçalhos `Nome`, `CPF`, `Cargo`, `Turno`,
`Data de admissão`, `Início do período aquisitivo` e `Fim do período
concessivo`. Esse modo só é ativado no servidor de desenvolvimento; não é
incluído na aplicação de produção.

Para testar a versao de producao localmente:

```bash
npm run build
npm run preview
```

## Publicar no Cloudflare Pages

O projeto pode ser publicado gratuitamente no Cloudflare Pages sem alterar o
código-fonte. A conta Cloudflare é necessária para criar o projeto e guardar
as variáveis de ambiente; não coloque o arquivo `.env` no GitHub.

1. Crie uma conta em https://dash.cloudflare.com/sign-up ou entre em uma conta existente.
2. No painel, abra **Workers & Pages > Create application > Pages > Connect to Git**.
3. Autorize o GitHub e selecione `jonasbessa-spec/react-ts-8ktdpbwr`.
4. Use estas configurações:

   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `24` ou superior

5. Em **Environment variables**, adicione as duas variáveis abaixo para
   **Production** e **Preview**:

```text
VITE_SUPABASE_URL=https://niwfaytctobvihlukzep.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-chave-anon-ou-publishable>
```

Não acrescente `/rest/v1/` à URL e não use a chave `service_role`.
6. Clique em **Save and Deploy**. Cada novo push na `main` acionará um novo
deploy automaticamente.

Depois do primeiro deploy, teste o endereço `*.pages.dev` e confirme que os
indicadores carregam dados. Se aparecer uma mensagem de configuração inválida,
revise as variáveis no ambiente do Cloudflare e use **Retry deployment**.

## Segurança das tabelas operacionais

A migration `supabase/migrations/20261007120000_operational_tables_rls.sql`
ativa RLS nas tabelas operacionais existentes, permite leitura a usuários
autenticados e limita gravações às funções administrativas, com exceção do
registro de interrupções feito pelo apontamento autenticado. A migration só
aplica políticas às tabelas que já existem; revise-a e aplique-a no Supabase
depois das migrations anteriores. A migration
`supabase/migrations/20261008110000_enable_sgo_realtime.sql` adiciona
`colaboradores` e `previsao_navios` à publicação `supabase_realtime`, se as
tabelas e a publicação já existirem. A assinatura do cliente envia eventos
Realtime às telas abertas. Berços sem valor recebem apenas uma sugestão
heurística na interface (ETA, ETD e tipo de carga); isso não grava a sugestão na
tabela nem substitui a confirmação operacional.

Quando `colaboradores` não retorna linhas ou a consulta falha, o Cockpit tenta
`localStorage.unilink_colaboradores` e, por último, mostra cinco linhas
explicitamente identificadas como dados de demonstração.

## ETL de Line-Up e enriquecimento

A pipeline Python em `scripts/pecem_etl.py` extrai o Line-Up oficial, cruza
registros opcionais de PSP/AIS por DUV, IMO ou nome fuzzy e grava somente linhas
com IMO, ETA e status normalizado. O berço pode ser `NULL` até ser informado
manualmente ou por lineup posterior. Contêineres e líquidos sem carga projeto são
descartados. A chave `SUPABASE_SERVICE_ROLE_KEY` é obrigatória apenas no
processo server-side e nunca deve ser usada no Vite.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r scripts\requirements-pecem.txt
$env:SUPABASE_URL="https://seu-projeto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="chave-server-side"
python scripts/pecem_etl.py
```

Para enriquecimento HTTP, configure `PECEM_ENRICHMENT_URL`; o endpoint deve
ser um adapter autorizado para PSP/AIS ou para uma API licenciada de dados
marítimos. Ele deve retornar uma lista JSON (ou `{ "data": [...] }`,
`{ "ships": [...] }`, `{ "vessels": [...] }` ou `{ "results": [...] }`) com
`nome_navio`, `imo`, `duv` e/ou `berco_programado`. O código envia
`port=BRPEC` por padrão. Se o fornecedor exigir autenticação, configure
`PECEM_ENRICHMENT_API_KEY`; a chave é enviada somente server-side nos headers
`Authorization: Bearer` e `X-API-Key`.

Clarksons Research e Lloyd's Register são fontes comerciais/licenciadas. A
contratação, o endpoint e o mapeamento de campos precisam ser confirmados com
o fornecedor; não use scraping do cadastro público para extração massiva nem
coloque credenciais no frontend. Depois de obter acesso, publique um pequeno
adapter interno que converta a resposta licenciada para o contrato acima.
Sem esse adapter autorizado, a pipeline não inventa IMO; o berço permanece
pendente.

### Publicação pelo terminal (opcional)

Também é possível usar o Wrangler, depois de autenticar no Cloudflare:

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name <nome-do-projeto>
```

O login abre uma página do Cloudflare para autorização. Não informe tokens ou
senhas no terminal, no GitHub ou no arquivo `.env`.