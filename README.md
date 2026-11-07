# VERAZ

Aplicação pessoal de acompanhamento nutricional. **Seu esforço. Sua evolução.**

O roadmap principal está implementado: autenticação, PWA, catálogo TACO/TBCA, registro manual e por voz, revisão obrigatória, metas, histórico editável, dashboard real, alimentos personalizados e modelos reutilizáveis.

## Como executar

Requisitos: Node.js 22 LTS e npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`. Sem credenciais do Supabase, o produto abre em modo demonstrativo; ao configurar as variáveis, as rotas privadas passam a exigir autenticação.

## Validação

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Estrutura

- `src/app`: páginas, layouts e Route Handlers.
- `src/components`: componentes visuais por domínio.
- `src/services`: cálculos nutricionais e regras de domínio.
- `src/repositories`: acesso ao catálogo, metas e refeições.
- `src/lib`: validações, autorização, utilidades e clientes Supabase.
- `supabase/migrations`: esquema relacional e políticas RLS.
- `docs/ARCHITECTURE.md`: arquitetura, riscos, custos e roadmap.

As chaves privadas nunca devem usar o prefixo `NEXT_PUBLIC_`.

Depois de conectar um projeto, aplique todas as migrations na ordem dos nomes. Elas incluem o catálogo versionado e funções transacionais que recalculam nutrientes no banco antes de salvar refeições ou modelos.

Para habilitar voz, configure `ELEVENLABS_API_KEY` apenas no servidor. O áudio é limitado a 30 segundos, enviado diretamente para transcrição e descartado; somente texto, itens estruturados e métricas mínimas ficam registrados.
