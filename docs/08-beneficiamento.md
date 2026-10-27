# Beneficiamento terceirizado — modelo inicial

## Objetivo
Registrar cada ordem de beneficiamento, as remessas físicas associadas e os retornos de café verde separados por peneira. Uma mesma ordem pode ter várias remessas e cada remessa pode gerar diversos retornos parciais.

## Campos e interpretação
- `sack_count`: quantidade de sacas efetivamente contadas, sem pressupor massa padrão.
- `shipped_weight_kg` + `shipped_weight_basis`: massa enviada e sua origem (medida ou estimada), quando conhecida.
- `provider_received_weight_kg`: massa pesada pela beneficiadora; não deve sobrescrever automaticamente o peso de expedição.
- `sieve_grade`: classificação informada no retorno; a classificação é atributo do retorno, não da safra inteira.
- `weight_kg` + `weight_basis`: massa retornada e seu grau de certeza.

## Exemplos que o modelo precisa suportar
1. Produtor envia 10 sacas de coco sem saber o peso em kg.
2. Beneficiadora pesa 520 kg na entrada.
3. Retorna 180 kg de peneira 16, 90 kg de peneira 17 e 45 kg de outras classificações em datas diferentes.
4. O saldo não retornado deve permanecer pendente até conciliação documental; não deve ser tratado automaticamente como perda ou subproduto.
5. Retornos podem ser destinados à venda como café verde ou à torra, preservando os vínculos com a remessa.

## Limitações da entrega
Esta migração cria **somente tabelas de registro**. Ainda não integra as remessas às operações atômicas de estoque nem impõe todas as verificações de consistência de estado físico e empreendimento entre registros. Também não implementa o cálculo auditável de rendimento, que exige massa de entrada efetivamente medida, massas de saída e registro de perdas/subprodutos.

Não há aplicação operacional nem testes em banco real nesta etapa.
