# Reconciliação de massa do beneficiamento

O módulo `src/beneficiation-reconciliation.js` calcula um demonstrativo documental por remessa, separando:

- Massa de café em coco recebida e **medida** na beneficiadora;
- Massa de café verde retornada e **medida**, somada entre peneiras;
- Massa de subprodutos declarados;
- Perdas declaradas;
- Diferença de massa não conciliada.

A proporção de café verde retornado não é automaticamente um rendimento final. Para conciliar a massa é necessário indicar que o beneficiamento terminou, fornecer subprodutos e perdas, e justificar documentalmente o fechamento. Diferenças não viram perdas presumidas. A tolerância de conciliação, quando utilizada, precisa ser definida e documentada pelo projeto.

Exemplo ilustrativo: 520 kg medidos na entrada, 315 kg de café verde, 180 kg de subprodutos e 25 kg de perdas declaradas = 520 kg contabilizados, diferença 0 kg. A consistência aritmética **não comprova** que os números foram efetivamente medidos ou que o documento é verdadeiro.

**Limitações:** a função é cálculo em memória; não confirma conclusão operacional, não valida documentos, não lança estoque, não trata múltiplas remessas agregadas e não foi submetida a testes de integração em PostgreSQL. A integração da transformação coco → verde permanece pendente.
