# Modelo funcional — Rastreabilidade

## Entidades
- Empreendimento, propriedade, talhão, variedade, safra.
- Lote físico (identificador único, tipo de café, estado, empreendimento, criação).
- Movimento (tipo, instante, usuário, justificativa, referências documentais).
- Entrada de movimento e saída de movimento: lote, quantidade, unidade, natureza da medida (real/estimada), estado físico.
- Remessa de beneficiamento, retornos parciais e classificação por peneira.
- Batelada de torra, perfil versionado, lote de embalagem e expedição.
- Amostra e avaliação de qualidade vinculadas à unidade efetivamente avaliada.

## Invariantes
1. União física cria lote resultante com ligações para todas as origens; divisão conserva saldos e linhagem.
2. Uma operação não pode consumir saldo inexistente, nem permitir movimentação negativa.
3. Quantidades em sacas e kg não são somadas sem fator explicitamente medido/estimado e contextualizado.
4. Estados físicos diferentes (coco, verde, torrado) não compartilham saldo de estoque; transformação documenta entradas e saídas.
5. Transformações não exigem igualdade de massas, mas exigem reconciliação ou registro de diferença pendente.
6. Cada lançamento guarda autor, horário, proveniência, histórico de correções e justificativas; estorno não apaga lançamento anterior.
7. A consulta deve percorrer todas as origens e todos os destinos, incluindo misturas e fracionamentos.
8. A qualidade sensorial não é automaticamente herdada por misturas, torra ou transformação.

## Cenários de teste obrigatórios
- Unir A(12 sacas) e B(8 sacas), retirar 15 sacas e conferir 5 sacas de saldo.
- Registrar remessa em sacas, pesagem de entrada em kg e retornos parciais por peneira sem conversão implícita.
- Dividir café verde entre venda e torra e conferir saldo.
- Misturar duas bateladas torradas, embalar e localizar todas as origens e destinos.
- Corrigir quantidade com estorno rastreável e impedir saldo negativo.
- Bloquear acesso entre empreendimentos não autorizados.

## Relatórios
Dossiê por lote com árvore de origem/destino, operações, quantidades, unidades, documentos, qualidade, torra, embalagem e comercialização. Exportação PDF e planilha com data, filtros e histórico das alterações.
