# Porto do Pecem - Gestao Operacional

## Como iniciar (passo a passo)

Este projeto usa React, TypeScript e Vite. **Nao abra o arquivo `index.html` diretamente e nao use o Live Server do VS Code.** O Live Server nao compila arquivos `.tsx` e causa o erro:

`Expected a JavaScript-or-Wasm module script ... application/octet-stream`

1. Instale o Node.js LTS pelo site oficial: https://nodejs.org/
2. Abra o terminal na pasta deste projeto.
3. Instale as dependencias:

```bash
npm install
```

4. Crie o arquivo `.env` a partir do `.env.example` e preencha as variaveis do Supabase.
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
npm run build
npm audit --audit-level=high
```

Para testar a versao de producao localmente:

```bash
npm run build
npm run preview
```