# Integração experimental: remessa e custódia

Implementados:
- `src/beneficiation-workflow.js`: vincula uma remessa documental a uma transferência do lote de origem para um lote de custódia da beneficiadora.
- `tests/beneficiation-workflow.test.js`: testa transferência parcial em sacas, vínculo de origem, saldo insuficiente e retorno documental sem crédito indevido de café verde.

## Exemplo
Lote COCO: 10 sacas. Remessa: 6 sacas. Saldo de origem: 4 sacas. Custódia da beneficiadora: 6 sacas. Se a beneficiadora informa peso medido de 310 kg, esse dado é guardado **sem converter as sacas em quilogramas no estoque**.

O retorno de 150 kg de peneira 16 é registrado documentalmente, mas ainda não gera movimento de transformação. O estoque de café verde permanece sem crédito até reconciliação.

## Pendências antes do uso
- Integração transacional no PostgreSQL; o fluxo atual é somente em memória.
- Operação de transformação documentada, com controle de consumo do lote de custódia e reconhecimento de saídas em kg.
- Rendimento final e diferenças, perdas e subprodutos.
- Controle de concorrência, auditoria e autorização de usuários.
- Testes executados e revisão do fluxo de rollback.

**Atenção:** esta entrega não constitui uma operação de beneficiamento pronta para produção.
