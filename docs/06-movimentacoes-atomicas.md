# Etapa 2 — gravação atômica no PostgreSQL

A migração `db/002_atomic_movements.sql` adiciona duas funções SQL de uso autenticado:

- `rumo_create_lot`: cria lote com saldo inicial zero ou abertura documentada; usa a identidade de `auth.uid()`.
- `rumo_move`: registra divisão, união e transferência com entradas e saídas na mesma transação.

## Garantias implementadas no código SQL
1. Confere associação do usuário ao empreendimento aprovado.
2. Serializa alterações do estoque de cada empreendimento com trava transacional.
3. Confere estado físico, unidade, quantidade e saldo.
4. Impede misturar kg com sacas ou transformar estados físicos em operação conservativa.
5. Exige saldo zero em lotes de destino e evita origem igual ao destino.
6. Escreve movimento e suas linhas atomicamente, com autor identificado.

## Formato de exemplo — NÃO EXECUTAR COM DADOS REAIS

```js
await supabase.rpc('rumo_move', {
  p_enterprise: '<uuid do empreendimento>',
  p_kind: 'merge',
  p_inputs: [
    {lot_id:'<uuid lote A>',quantity:12,unit:'saca',basis:'counted'},
    {lot_id:'<uuid lote B>',quantity:8,unit:'saca',basis:'counted'}
  ],
  p_outputs: [
    {lot_id:'<uuid lote C vazio>',quantity:20,unit:'saca',basis:'counted'}
  ],
  p_justification:'Mistura física registrada'
});
```

## Pendências críticas antes da implantação
- **Não executada em banco real e não validada por testes de integração.**
- Funções SECURITY DEFINER exigem revisão de segurança, propriedade, permissões de schema e prevenção de acesso indireto.
- Política de provisionamento/convite de membros ainda não existe; não usar credenciais de service role no cliente.
- Falta proteção imutável contra edição direta de tabelas por papéis privilegiados, estorno e auditoria persistente.
- Falta proibir genealogia cíclica em operações sequenciais envolvendo lotes previamente consumidos. O saldo zero no destino, sozinho, não garante isso.
- Falta controle de classificações, remessas parciais, conversão documentada de unidades e rendimentos.
- O uso de tabela temporária em função SECURITY DEFINER deve ser revisto quanto a permissões, isolamento e comportamento sob pooling/conexões concorrentes.

**Decisão:** até a revisão e testes de integração, esta migração é uma implementação candidata, não uma rotina aprovada para produção.
