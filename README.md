# VERAZ

Aplicação pessoal de acompanhamento nutricional. **Seu esforço. Sua evolução.**

Esta entrega contém a Fase 1: fundação Next.js, identidade visual, dashboard responsivo, autenticação preparada para Supabase, PWA instalável, esquema PostgreSQL com RLS e testes iniciais.

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
npm run build
```

## Estrutura

- `src/app`: páginas, layouts e Route Handlers.
- `src/components`: componentes visuais por domínio.
- `src/lib`: validações, utilidades e clientes Supabase.
- `supabase/migrations`: esquema relacional e políticas RLS.
- `docs/ARCHITECTURE.md`: arquitetura, riscos, custos e roadmap.

As chaves privadas nunca devem usar o prefixo `NEXT_PUBLIC_`.
