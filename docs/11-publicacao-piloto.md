# Publicação do piloto RUMO CAFÉ — custo inicial zero

## Arquitetura definida
- **Cloudflare Pages Free**: interface React/Vite, arquivos estáticos gerados em `dist/`.
- **Supabase Free**: PostgreSQL, Auth e armazenamento limitado; **não conectado à interface nesta versão**.
- **GitHub**: repositório de código e GitHub Actions.

## Publicar a demonstração
1. Criar conta no Cloudflare e, em **Workers & Pages**, criar um projeto **Pages** chamado exatamente `rumo-cafe`. É possível conectar o repositório diretamente com build `npm run build` e diretório de saída `dist` — esta é a opção mais simples.
2. Alternativamente, utilizar o workflow manual `.github/workflows/deploy-cloudflare.yml`. Para isso, criar um token de API Cloudflare com permissão de edição do Pages para a conta, e registrar no GitHub Actions os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. Depois executar manualmente o workflow **Publicar demonstração no Cloudflare Pages**. **Nunca colocar o token em arquivos do repositório.**
3. Abrir o endereço `*.pages.dev` informado pelo Cloudflare, testar no celular e computador.
4. Se optar pela integração GitHub diretamente no Cloudflare, **não ativar simultaneamente o workflow de publicação**: use apenas um mecanismo de deploy.

## Limites da demonstração
- Os dados são fictícios e armazenados apenas na memória da aba aberta; desaparecem ao recarregar.
- Não há autenticação, autorização, persistência nem integração de banco. Não inserir dados reais de produtores.
- O cadastro e a remessa na interface **ainda não utilizam** as funções de rastreabilidade do protótipo; são uma simulação visual.
- Não há rotinas de backup nem conformidade LGPD validadas.
- Os testes automáticos de interface e a compilação devem passar antes de convidar avaliadores.

## Próxima fase: Supabase
1. Criar projeto no plano gratuito, com responsável institucional definido.
2. Aplicar migrações em banco de teste, revisar RLS, papéis e RPCs; corrigir falhas antes de inserir dados.
3. Usar apenas URL pública e chave pública do projeto no navegador; **jamais** expor a chave `service_role`.
4. Testar autenticação e isolamento entre dois empreendimentos antes de habilitar cadastro real.
5. Estabelecer exportação/backup independente, limites de anexos e política de retenção.

**O repositório público não deve conter dados reais, coordenadas privadas, credenciais nem documentos internos.**
