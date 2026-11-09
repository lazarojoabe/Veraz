# VERAZ

Aplicação pessoal de acompanhamento nutricional. **Seu esforço. Sua evolução.**

O roadmap principal está implementado: autenticação completa, PWA, catálogo TACO/TBCA, registro manual, por voz e por foto, revisão obrigatória, metas, histórico filtrável e editável, dashboard real, alimentos personalizados, modelos reutilizáveis e métricas de avaliação.

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
- `docs/ROADMAP.md`: matriz verificável das fases, evidências e dependências externas.

As chaves privadas nunca devem usar o prefixo `NEXT_PUBLIC_`.

Depois de conectar um projeto, aplique todas as migrations na ordem dos nomes. Elas incluem o catálogo versionado e funções transacionais que recalculam nutrientes no banco antes de salvar refeições ou modelos. A edição preserva a identidade e a origem do registro.

Para habilitar voz, configure `ELEVENLABS_API_KEY` apenas no servidor. O áudio é limitado a 30 segundos, enviado diretamente para transcrição e descartado; somente texto, itens estruturados e métricas mínimas ficam registrados. Hash, limite de uso e reivindicação atômica evitam chamadas duplicadas sequenciais ou concorrentes.

Para habilitar a estimativa assistida por foto, configure `OPENAI_API_KEY` e, opcionalmente, `OPENAI_VISION_MODEL`. A foto é analisada com persistência desativada e não é armazenada pelo VERAZ. Alimentos, faixas de gramatura e correções ficam registrados para avaliação. Consulte `docs/AVALIACAO_REFEICOES_POR_FOTO.md` para o protocolo da amostra de pratos pesados.
