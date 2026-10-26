# RUMO CAFÉ

**Orientação e acompanhamento pela ATER** — *Seu café no rumo certo.*

Aplicação em desenvolvimento para propriedades cafeeiras e agroindústrias familiares, com gestão da produção, qualidade, rastreabilidade, boas práticas e acompanhamento técnico.

> **Status:** especificação funcional inicial. Não há aplicação de produção nem conformidade sanitária validada nesta etapa.

## Escopo aprovado

- **Lotes e estoque:** divisão e união em todas as etapas, genealogia progressiva e regressiva, movimentos com origem/destino e saldo consistente. Registro em sacas quando só essa informação existe; em kg quando houver pesagem. Estimativas sempre sinalizadas.
- **Safras e talhões:** cadastro reutilizável e histórico, análises por safra, talhão e variedade. Agrupamento analítico não significa mistura física.
- **Beneficiamento:** remessas parciais, quantidade enviada, massa pesada na entrada e no retorno, classificação por peneira, perdas/subprodutos identificados e reconciliação.
- **Torra e vendas:** perfis versionados, bateladas com parâmetros reais, mistura e fracionamento rastreáveis, comercialização de café verde ou torrado.
- **Qualidade:** avaliações sensoriais vinculadas à amostra/lote/batelada efetivamente avaliada; nenhuma nota herdada automaticamente por misturas.
- **Boas práticas:** POPs completos e versionados, consulta das instruções, periodicidade, checklists específicos, diário descritivo, não conformidades e registros exportáveis. Os formulários deverão ser derivados dos POPs efetivamente aprovados de cada estabelecimento.
- **Pessoas:** acesso colaborativo dos familiares, sem hierarquia operacional artificial, mas com identidade individual, autor do registro e trilha de alterações.
- **ATER:** solicitação e autorização de cadastro, vínculos entre empreendimento e extensionista, carteira técnica e indicadores agregados para coordenação conforme permissões.
- **Auditoria:** dossiê de lote, exportação PDF/planilha, correções e estornos com histórico imutável.

## Plano de implementação

1. Esquema de dados e regras de estoque/genealogia, incluindo testes para misturas, divisões e conversões de unidade.
2. Autenticação, empreendimentos, safras, talhões e vínculos ATER.
3. Fluxos produtivos, beneficiamento, torra e embalagem.
4. POPs, diário, ocorrências, documentos e trilhas de auditoria.
5. Qualidade sensorial, painéis e exportações.

## Proteção de dados

Este repositório é público. Não publicar credenciais, dados pessoais de produtores, coordenadas privadas, laudos de clientes ou POPs internos sem autorização. Dados de produção deverão ter isolamento por empreendimento no servidor.
