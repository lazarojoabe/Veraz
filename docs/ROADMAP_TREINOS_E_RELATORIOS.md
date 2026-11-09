# Roadmap — Treinos e relatórios de progresso

## 1. Objetivo

Adicionar ao VERAZ um módulo de treinos separado do domínio de nutrição, com registro rápido de exercícios, séries, peso e repetições, histórico confiável e relatórios personalizáveis de evolução.

O módulo deve reutilizar autenticação, perfil, componentes visuais, Supabase e padrões de segurança já existentes, sem acoplar dados de treino às tabelas de alimentação.

## 2. Escopo funcional

### Registro de treinos

- iniciar um treino vazio ou a partir de uma ficha;
- buscar exercícios de um catálogo e criar exercícios pessoais;
- registrar séries de aquecimento, válidas, drop-set e falha;
- registrar peso, repetições e, opcionalmente, RPE ou RIR;
- copiar rapidamente a série anterior;
- consultar a última execução do exercício durante o treino;
- salvar rascunhos automaticamente e concluir o treino explicitamente;
- editar ou excluir um treino já concluído;
- mostrar recordes pessoais sem interromper o fluxo de registro.

Na primeira entrega, os tipos suportados serão `weight_reps` e `bodyweight_reps`. A modelagem já reservará espaço para tempo e distância, mas essas modalidades não entrarão no MVP.

### Histórico

- lista cronológica por sessão;
- detalhe completo por treino e exercício;
- filtros por período, ficha e exercício;
- resumo de duração, volume, séries e repetições;
- repetição de um treino anterior como nova sessão.

### Relatórios personalizáveis

- filtros por período, exercício, grupo muscular, ficha e tipo de série;
- cartões configuráveis com sessões, frequência, volume, séries, repetições e recordes;
- gráficos de volume semanal, evolução de carga, repetições e 1RM estimado;
- calendário de frequência;
- distribuição de volume por grupo muscular;
- comparação apenas entre execuções compatíveis do mesmo exercício;
- possibilidade de salvar, renomear, duplicar e excluir uma visão;
- exportação CSV no MVP; PDF fica para uma fase posterior.

## 3. Experiência e rotas

### Rotas propostas

| Rota | Finalidade |
| --- | --- |
| `/training` | visão geral e ação de iniciar treino |
| `/training/new` | registro de treino em andamento |
| `/training/plans` | fichas e organização de exercícios |
| `/training/history` | histórico e filtros |
| `/training/history/[id]` | detalhe e edição de uma sessão |
| `/training/reports` | relatórios e construtor de visões |

### Fluxo principal

1. O usuário inicia um treino vazio ou escolhe uma ficha.
2. O sistema cria uma sessão em rascunho.
3. O usuário adiciona exercícios e séries; cada alteração é persistida com debounce.
4. O servidor valida e recalcula os totais da sessão.
5. Ao concluir, o usuário revisa duração, volume, recordes e observações.
6. A sessão passa a alimentar o histórico e os relatórios.

### Navegação

- manter Nutrição e Treinos como áreas distintas;
- adicionar “Treinos” à navegação principal;
- no mobile, usar: Início, Nutrição, ação central, Treinos e Histórico;
- mostrar no dashboard inicial apenas um resumo compacto de cada domínio.

## 4. Modelo de dados

Todos os identificadores usam UUID, datas usam `timestamptz` e valores monetários ou físicos usam `numeric`, nunca ponto flutuante.

### `exercises`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | chave primária |
| `owner_id` | uuid nullable | nulo para catálogo global; usuário para exercício pessoal |
| `name` | text | nome normalizado |
| `muscle_group` | text | agrupamento principal |
| `equipment` | text nullable | equipamento |
| `tracking_type` | text | inicialmente `weight_reps` ou `bodyweight_reps` |
| `instructions` | text nullable | orientação curta |
| `is_active` | boolean | permite desativar sem apagar histórico |

### `workout_plans`

- `id`, `user_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`.

### `workout_plan_exercises`

- `id`, `plan_id`, `exercise_id`, `position`;
- `target_sets`, `target_reps_min`, `target_reps_max`;
- `target_rest_seconds`, `target_rpe` e observações.

### `workout_sessions`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | chave primária |
| `user_id` | uuid | proprietário |
| `plan_id` | uuid nullable | ficha de origem |
| `name` | text | snapshot do nome do treino |
| `status` | text | `draft`, `completed` ou `cancelled` |
| `started_at` | timestamptz | início real |
| `finished_at` | timestamptz nullable | conclusão |
| `notes` | text nullable | observações |
| `duration_seconds` | integer | calculado no servidor |
| `volume_kg` | numeric | calculado no servidor |
| `sets_count` | integer | calculado no servidor |
| `reps_count` | integer | calculado no servidor |

### `workout_session_exercises`

- `id`, `session_id`, `exercise_id`, `position`;
- snapshots de `exercise_name`, `muscle_group`, `equipment` e `tracking_type`;
- observações específicas da execução.

Os snapshots preservam o significado histórico mesmo que o catálogo seja alterado depois.

### `workout_sets`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | uuid | chave primária |
| `session_exercise_id` | uuid | exercício da sessão |
| `set_number` | integer | ordem |
| `set_type` | text | `warmup`, `working`, `drop` ou `failure` |
| `weight_kg` | numeric nullable | carga externa |
| `reps` | integer nullable | repetições |
| `rpe` | numeric nullable | escala de 1 a 10 |
| `rir` | integer nullable | repetições em reserva |
| `rest_seconds` | integer nullable | descanso observado |
| `completed_at` | timestamptz nullable | série concluída |
| `notes` | text nullable | observação curta |

### `report_views`

- `id`, `user_id`, `name`, `domain`;
- `date_range_preset` e intervalo personalizado;
- `filters jsonb` com exercícios, fichas, grupos musculares e tipos de série;
- `layout jsonb` com widgets, ordem e tamanho;
- `is_default`, `created_at`, `updated_at`.

O JSON será validado por esquema na aplicação e terá versão explícita para futuras migrações.

## 5. Métricas e regras de cálculo

- **Volume externo:** soma de `weight_kg × reps` nas séries válidas. Séries apenas com peso corporal não entram nessa métrica no MVP.
- **1RM estimado:** fórmula de Epley, `peso × (1 + repetições / 30)`, apenas para séries de 1 a 10 repetições e peso maior que zero.
- **Recorde de carga:** maior peso concluído por exercício.
- **Recorde estimado:** maior 1RM estimado por exercício.
- **Frequência:** quantidade de sessões concluídas por semana.
- **Consistência:** semanas com pelo menos uma sessão dentro do período selecionado.
- **Distribuição muscular:** volume das séries válidas agrupado pelo snapshot de grupo muscular.

Os cálculos ficam em funções compartilhadas testáveis e os agregados persistidos são sempre recalculados pelo servidor. O cliente nunca define totais finais.

## 6. API e transações

### Endpoints sugeridos

- `GET/POST /api/exercises`
- `PATCH /api/exercises/[id]`
- `GET/POST /api/training/plans`
- `GET/PATCH/DELETE /api/training/plans/[id]`
- `GET/POST /api/training/sessions`
- `GET/PATCH/DELETE /api/training/sessions/[id]`
- `POST /api/training/sessions/[id]/complete`
- `GET /api/training/reports`
- `GET/POST /api/training/report-views`
- `PATCH/DELETE /api/training/report-views/[id]`
- `GET /api/training/export.csv`

Criar funções transacionais no banco para salvar uma sessão com exercícios e séries, substituir uma sessão durante edição e concluir um treino. Isso evita sessões parcialmente gravadas.

## 7. Segurança, integridade e desempenho

- RLS em todas as tabelas pessoais usando `auth.uid()`;
- catálogo global somente leitura para usuários comuns;
- `user_id` sempre derivado da sessão autenticada;
- validação com os esquemas já adotados pelo projeto;
- limites de peso, repetições, RPE, RIR e duração;
- prevenção de posições e números de série duplicados;
- deleção em cascata apenas dentro da sessão do próprio usuário;
- índices por `user_id + started_at`, `exercise_id`, `plan_id` e status;
- paginação no histórico e agregação no banco para relatórios;
- cache curto somente para consultas concluídas; rascunhos não devem ser armazenados em cache.

## 8. Fases de implementação

### Fase 0 — Contrato e protótipo

- validar modelo, fórmulas e limites;
- desenhar telas responsivas de registro e relatórios;
- definir catálogo inicial e grupos musculares;
- criar contratos TypeScript e dados de teste.

**Saída:** ADR curto, wireframes, esquema validado e casos de teste.

### Fase 1 — Fundação do domínio

- migrations, constraints, índices e RLS;
- catálogo de exercícios e exercícios pessoais;
- fichas de treino;
- serviços de domínio e funções transacionais;
- testes de políticas e cálculos.

**Saída:** backend utilizável e seguro, sem telas finais.

### Fase 2 — Registro de treino

- sessão vazia ou baseada em ficha;
- inclusão e ordenação de exercícios;
- séries, peso, repetições, RPE/RIR e descanso;
- autosave, retomada de rascunho e conclusão;
- resumo e detecção de recordes.

**Saída:** fluxo completo do início à conclusão em desktop e mobile.

### Fase 3 — Histórico e edição

- histórico paginado com filtros;
- detalhe, edição e exclusão;
- repetir treino anterior;
- estado vazio, erros recuperáveis e feedback otimista.

**Saída:** gestão integral dos dados registrados.

### Fase 4 — Relatórios personalizáveis

- endpoint agregado e camada de métricas;
- KPIs e gráficos de tendência;
- construtor de filtros e widgets;
- visões salvas e visão padrão;
- exportação CSV acessível.

**Saída:** relatórios persistentes e personalizáveis por usuário.

### Fase 5 — Qualidade e lançamento

- testes E2E dos fluxos críticos;
- auditoria de RLS, acessibilidade e teclado;
- testes com fuso horário, grandes históricos e dados incompletos;
- medição de consultas e correção de gargalos;
- documentação e rollout gradual.

**Saída:** módulo pronto para produção.

## 9. Estratégia de testes

- **Unidade:** volume, 1RM estimado, recordes, consistência e filtros.
- **Integração:** criação/edição/conclusão transacional, snapshots e RLS.
- **Componentes:** entrada numérica, ordenação, autosave e construtor de relatórios.
- **E2E:** iniciar treino, registrar séries, concluir, editar e visualizar o progresso.
- **Regressão:** autenticação, nutrição e dashboard atual permanecem independentes.
- **Acessibilidade:** foco visível, nomes acessíveis, contraste e uso completo por teclado.

## 10. Critérios de aceite do MVP

- um usuário autenticado registra e conclui um treino com vários exercícios e séries;
- peso e repetições aceitam correção sem duplicar dados;
- um rascunho sobrevive a recarregamento e pode ser retomado;
- o histórico exibe somente dados do proprietário;
- totais exibidos coincidem com os cálculos do servidor;
- relatórios filtram período e exercício e permitem salvar uma visão;
- os gráficos distinguem ausência de dados de valor zero;
- CSV respeita os filtros ativos;
- nenhuma rota de treino altera o domínio de nutrição;
- testes críticos, lint e build passam antes do lançamento.

## 11. Fora do MVP

- vídeos de execução;
- integração com relógios e wearables;
- treinos sociais, ranking ou compartilhamento;
- recomendações automáticas de carga;
- séries por tempo ou distância;
- PDF avançado e envio agendado de relatórios;
- medidas corporais e fotos de progresso.

Esses itens devem reutilizar o mesmo domínio de progresso, mas entrar em roadmaps próprios.

