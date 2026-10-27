# Proteção de genealogia — iteração 003

A migração 003 acrescenta uma proteção para impedir entradas posteriores em lotes com histórico de saída. Isso evita associar novas origens retroativamente a café já expedido.

**Limitações:** a migração não foi executada em PostgreSQL; o código em memória e o banco ainda não possuem paridade completa. A função SQL 002 precisa de revisão de segurança, de testes concorrentes e de uma solução para transformações físicas com reconciliação de massa.

Os testes de regressão em Node.js e o fluxo de CI estão disponíveis em `tests/lineage-regressions.test.js` e `.github/workflows/node-tests.yml`. A publicação do fluxo não comprova execução bem-sucedida.

Próxima entrega: criar o esquema de remessas de beneficiamento e retornos classificados por peneira, com quantidade medida e estimada claramente separadas.
