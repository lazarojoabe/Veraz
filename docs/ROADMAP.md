# Roadmap verificável do VERAZ

Este documento relaciona o roadmap original com a implementação versionada. “Entregue” significa que o fluxo existe no produto e possui ao menos uma forma objetiva de validação; não significa que serviços externos estejam provisionados.

| Fase | Status | Implementação e evidência |
| --- | --- | --- |
| 1 — Fundação | Entregue | Next.js App Router, TypeScript, Tailwind, Supabase SSR/Auth, RLS, layout responsivo, modo demonstrativo, manifesto, service worker e fallback offline. O E2E valida manifesto e página offline. |
| 2 — Gestão nutricional | Entregue | Catálogo TACO/TBCA com fonte, alimentos personalizados, metas, registro manual com revisão, conversões seguras, histórico filtrável com itens/macros, edição preservando o ID e exclusão. Cálculos, datas e endpoints possuem testes automatizados. |
| 3 — Registro por voz | Entregue | MediaRecorder até 30 s, Scribe v2 no backend, hash, rate limit, reivindicação atômica contra cobrança concorrente, parser pt-BR, catálogo ampliado, ambiguidades explícitas e revisão de nome/tipo/data/itens antes de salvar. O áudio é descartado. |
| 4 — Dashboard | Entregue | Totais do dia, metas, calorias restantes, macros, gráfico de sete dias, refeições recentes e sequência calculados no fuso de São Paulo. |
| 5 — Melhorias | Entregue | Modelos reutilizáveis, E2E desktop/móvel, pgTAP, estados vazios, modo demonstrativo, métricas de uso/custo da transcrição, health check e auditoria de dependências. |

## Dependências externas para produção

O código do roadmap está concluído. Para operação conectada ainda é necessário:

1. Criar o projeto Supabase e aplicar todas as migrations em ordem.
2. Configurar URL e chave publicável do Supabase.
3. Configurar `ELEVENLABS_API_KEY` exclusivamente no servidor.
4. Configurar as URLs de autenticação do ambiente publicado.
5. Executar os testes pgTAP contra o banco provisionado e validar uma transcrição real com a conta do provedor.

Sem essas credenciais, o VERAZ permanece propositalmente no modo demonstrativo e não simula persistência.

## Próximo ciclo, fora do MVP nutricional

Treinos, medidas corporais e evolução física continuam como módulos futuros. Eles não fazem parte das fases 1–5 do prompt original e devem reutilizar autenticação, perfil, linha do tempo e sistema visual sem misturar suas regras ao domínio nutricional.
