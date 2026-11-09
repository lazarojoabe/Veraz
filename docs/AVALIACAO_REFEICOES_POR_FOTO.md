# Avaliação de refeições por foto

## Objetivo

Validar a estimativa assistida em pratos brasileiros antes de considerar um modelo próprio. O produto nunca trata a imagem como uma balança: toda análise gera um rascunho que precisa ser revisado.

## Protocolo da amostra

Meta inicial: 100 pratos; ampliar para 200 se os intervalos de erro ainda forem instáveis.

1. Pesar separadamente cada alimento pronto para consumo.
2. Montar o prato sem mudar as quantidades pesadas.
3. Fotografar o prato inteiro de cima, com boa iluminação.
4. Registrar o diâmetro do prato quando conhecido.
5. Enviar a foto pelo fluxo **Refeições > Por foto**.
6. Corrigir alimento e gramas conforme a pesagem.
7. Marcar **Conferi as quantidades com uma balança** antes de salvar.

Buscar diversidade em arroz, feijão, carnes, ovos, massas, raízes, saladas, frutas, molhos e pratos misturados. Não concentrar a amostra em um único tipo de louça, iluminação ou celular.

## Métricas

- Associação ao catálogo: itens reconhecidos que encontraram candidato TACO/TBCA.
- Taxa de correção: itens cuja quantidade mudou mais de 5% ou 5 g.
- Erro absoluto médio em gramas: somente amostras marcadas como pesadas.
- Erro percentual absoluto médio: somente amostras marcadas como pesadas.
- Tempo médio de revisão: análise até confirmação.
- Cobertura: pratos confirmados com balança em relação à meta de 100.

As métricas aparecem em **Ajustes > Avaliação da análise por foto** e estão disponíveis em `GET /api/meal-photo/metrics`.

## Critério para a próxima fase

Adicionar uma segunda foto ou referência de escala se o erro variar muito por altura/volume do alimento. Só avaliar treinamento próprio depois de segmentar resultados por classe de alimento e confirmar que o gargalo é o modelo, não o protocolo de captura ou a associação ao catálogo.

## Privacidade e custo

A imagem é enviada ao provedor com persistência desativada e descartada após a análise. O VERAZ armazena hash, tamanho, tipo, saída estruturada, correções e métricas; a imagem original não é salva. Há limite de dez análises por usuário a cada dez minutos.

