# Banco de dados — implantação inicial

Arquivo: [001_foundation.sql](../db/001_foundation.sql)

## O que a migração implementa
- Empresas com solicitação e aprovação, membros colaborativos e vínculos com extensionistas.
- Propriedades, talhões, safras e variedades associadas ao talhão na safra.
- Lotes físicos separados de safras e movimentações.
- Livro de movimentações com entradas e saídas, unidades **saca** ou **kg** e base de medição (medida, estimada ou contada).
- Saldo derivado das movimentações, não digitado diretamente.
- Avaliações de qualidade ligadas a lotes e POPs versionados com execuções e diário.
- Eventos de auditoria estruturados.

## Proteção inicial
Todas as tabelas possuem Row Level Security habilitada, com acesso direto revogado de usuários anônimos e autenticados. **Não há políticas permissivas.** Esta migração ainda não permite operar o aplicativo: os fluxos de autorização e gravação precisam de funções transacionais específicas, revisadas e testadas.

## Não implementar diretamente na interface
Não autorizar o cliente web a inserir linhas de movimento isoladas. Uma operação deve:
1. Validar autorização do usuário para o empreendimento.
2. Bloquear os saldos envolvidos durante a transação.
3. Validar que não há estoque negativo e que entradas/saídas correspondem à operação.
4. Preservar unidade e base de medição sem conversões silenciosas.
5. Registrar autor, instante, justificativa e referências documentais.
6. Confirmar tudo atomicamente ou desfazer tudo.

## Pendências antes de produção
- Validar a migração em PostgreSQL/Supabase real; ainda **não executada**.
- Implementar RPC transacional de movimentações, bloqueios e concorrência.
- Criar políticas de leitura RLS por empreendimento e vínculo ATER.
- Impedir alterações/exclusões diretas em registros contábeis e auditoria.
- Modelar remessas parciais, retorno por peneira, classificação, bateladas e vendas.
- Relacionar cada colheita ao talhão sem confundir agrupamento de safra com lote físico.
- Revisar governança de dados e requisitos de fiscalização aplicáveis.
