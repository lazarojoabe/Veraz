# Arquitetura do VERAZ

## Decisão principal

O MVP será um **monólito modular em Next.js**. A interface, os Route Handlers e as Server Actions compartilham o mesmo projeto e deploy na Vercel; regras de negócio ficam fora da apresentação. Essa opção reduz custo operacional e mantém uma separação suficiente para extrair workers ou serviços apenas quando houver uma necessidade comprovada.

```text
PWA Next.js (Vercel)
├── React / App Router / Tailwind / shadcn-style UI
├── Route Handlers + Server Actions
├── Serviços de domínio
│   ├── transcription (ElevenLabs)
│   ├── food-parser (saída validada por schema)
│   ├── nutrition (TACO/TBCA e conversões)
│   └── meals (cálculos e regras)
└── Supabase
    ├── Auth (sessão em cookie)
    ├── PostgreSQL (RLS por usuário)
    └── Storage (somente se houver necessidade futura)
```

O áudio será recebido pelo backend, limitado a 30 segundos, identificado por hash para evitar cobrança duplicada, transcrito e descartado. Nenhuma refeição será persistida antes da revisão explícita do usuário.

## Responsabilidades da stack

| Tecnologia | Responsabilidade |
| --- | --- |
| Next.js App Router | UI, renderização, endpoints serverless e composição do backend-for-frontend |
| React + TypeScript | Componentes e contratos de domínio tipados |
| Tailwind + componentes shadcn-style | Sistema visual consistente e acessível sem runtime pesado |
| Supabase Auth/SSR | Identidade e renovação segura de sessão via cookies |
| PostgreSQL + RLS | Persistência relacional e isolamento como defesa em profundidade |
| ElevenLabs Scribe v2 | Apenas transcrição; nunca calcula nutrientes nem inventa valores |
| TACO/TBCA | Fonte de verdade para composição nutricional |
| Zod | Validação nos limites do sistema e saídas estruturadas |
| Vitest / Playwright | Unidade/integração e jornadas críticas, respectivamente |
| Vercel | Deploy do Next.js e execução sob demanda, sem servidor permanente |

## Modelo de dados

| Entidade | Papel | Decisões importantes |
| --- | --- | --- |
| `profiles` | Preferências do usuário | 1:1 com `auth.users` |
| `nutrition_goals` | Metas diárias | Um registro ativo por usuário |
| `foods` | Catálogo confiável ou alimento personalizado | Fonte e referência obrigatórias; conversões explícitas |
| `meals` | Cabeçalho da refeição | Totais materializados para leitura rápida |
| `meal_items` | Itens consumidos | Snapshot de nome, fonte e nutrientes no momento do registro |
| `meal_templates` | Refeições recorrentes | Nome único por usuário |
| `meal_template_items` | Composição do modelo | Referencia alimentos vigentes; gera snapshot ao registrar |
| `audio_transcriptions` | Auditoria mínima do processamento | Hash único por usuário, sem caminho de áudio persistente |

Todas as tabelas expostas têm RLS, grants mínimos, políticas separadas por operação e índices nas colunas usadas pelas políticas. A migration inicial está em `supabase/migrations/20261106150000_initial_schema.sql`; o catálogo curado e a função transacional de refeições estão em `supabase/migrations/20261106220000_food_catalog_and_meal_rpc.sql`; a edição que preserva a identidade do registro está em `supabase/migrations/20261107120000_preserve_meal_id_on_edit.sql`.

## Limites de módulos

```text
app/api -> valida entrada/autorização -> services -> repositories -> Supabase
components -> ações/páginas -> services ou Route Handlers (nunca SQL direto)
```

- `transcription`: valida MIME/duração/tamanho, faz hash, controla idempotência e chama o provedor.
- `food-parser`: converte somente o que foi dito; ambiguidades viram estado explícito.
- `nutrition`: pesquisa fontes curadas, normaliza unidades e calcula proporcionalmente.
- `meals`: confirma, recalcula totais no servidor e persiste tudo em transação.
- `repositories`: concentra consultas e nunca aceita `user_id` não verificado como autorização suficiente.

## Segurança e privacidade

- Credenciais privadas apenas no backend; a chave publicável do Supabase pode ir ao cliente porque o acesso real é limitado por RLS.
- Sessões verificadas com claims assinadas; o Proxy só faz triagem e renovação. A autorização definitiva deve permanecer no DAL/repositório e no banco.
- Áudio descartado após transcrição; logs não contêm conteúdo do áudio nem tokens.
- Validação de tamanho, tipo, duração, schema e autorização em todos os endpoints.
- CSP do service worker, proteção contra framing, MIME sniffing e política restrita de microfone.
- Refeições só são salvas após confirmação e os nutrientes são recalculados no servidor.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Transcrição confundir números/unidades | Cálculo incorreto | revisão obrigatória, confiança/ambiguidade e testes em pt-BR |
| Alimento sem correspondência confiável | dado inventado | bloquear cálculo, pedir escolha ao usuário e nunca usar LLM como fonte nutricional |
| Medidas caseiras sem conversão | falsa precisão | converter apenas quando houver fator confiável; manter unidade original |
| Timeout/custo da transcrição | falha ou cobrança repetida | áudio curto, hash idempotente, uma tentativa controlada e métricas de consumo |
| Projeto Supabase gratuito pausado | indisponibilidade após inatividade | health check, aviso operacional e exportação/backup antes de produção real |
| PWA offline com dado desatualizado | UX enganosa | cache apenas do fallback/ativos públicos, nunca páginas autenticadas; mutações exigem rede |
| RLS incompleta | vazamento entre usuários | grants mínimos, políticas por operação e suíte pgTAP versionada |

## Custos e limites observados em novembro de 2026

- **Vercel Hobby:** US$ 0 para uso pessoal e não comercial; inclui 1 milhão de invocações e limites de CPU/memória. Se o produto se tornar comercial, revisar o plano antes da publicação.
- **Supabase Free:** US$ 0, até dois projetos; 500 MB de banco, 1 GB de arquivos, 5 GB de egress e 50 mil MAU. Projetos gratuitos podem pausar após uma semana sem atividade.
- **ElevenLabs Scribe v2:** uso medido; a página oficial lista US$ 0,22 por hora nos planos de API exibidos. Mesmo áudios curtos devem ter orçamento, hash e monitoramento.
- **GitHub privado e subdomínio `vercel.app`:** suficientes no MVP sem domínio pago.

Fontes oficiais: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase pricing](https://supabase.com/pricing), [ElevenLabs API pricing](https://elevenlabs.io/pricing/api?price.section=speech_to_text) e [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps).

## Plano incremental

1. **Fundação (entregue):** Next.js/TypeScript/Tailwind, Supabase SSR, layout responsivo, identidade VERAZ, PWA, migrations/RLS e health check.
2. **Gestão nutricional (entregue):** catálogo TACO/TBCA versionado, conversões explícitas, metas, alimentos personalizados, registro manual, revisão, edição, exclusão e testes de cálculo/RLS.
3. **Voz (entregue):** captura até 30 s, limite de uso, hash idempotente, Scribe v2, parser em português, resolução nutricional, descarte do áudio e revisão obrigatória.
4. **Dashboard (entregue):** agregações reais de metas, refeições, macros, últimos sete dias, sequência e estados vazios, com fallback demonstrativo.
5. **Melhorias (entregue):** modelos reutilizáveis, histórico filtrável e detalhado, Playwright desktop/móvel, pgTAP, telemetria visível de uso/custo e health check dos serviços.

A matriz de rastreabilidade entre requisitos e evidências está em `docs/ROADMAP.md`.

O funcionamento conectado depende apenas de aplicar as migrations e fornecer as variáveis do Supabase e ElevenLabs. Sem elas, a interface preserva um modo demonstrativo seguro e não simula persistência.

Treinos, medidas corporais e evolução física deverão entrar como novos módulos do mesmo monólito, sem contaminar o domínio nutricional nem antecipar microsserviços.
