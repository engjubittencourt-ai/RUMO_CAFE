# Primeira implementação do núcleo

A pasta `src/traceability.js` contém um **protótipo de regras de domínio em memória**, sem banco de dados, autenticação real ou segurança multiusuário. O objetivo é validar conceitos antes da implementação transacional.

Execute `npm test` em Node.js 20+ para os testes iniciais.

## Limitações conhecidas
- Cadastro de lote com saldo de abertura não substitui criação de lote derivado com saldo zero; será implementado na próxima iteração.
- A operação `transform` exige justificativa, mas ainda não valida reconciliação de massa, subprodutos e unidades.
- Não há estorno, concorrência, assinatura digital, persistência, auditoria inviolável ou exportação PDF.
- Não usar registros reais nem para atendimento a exigências sanitárias.
