# Relatório de Remoção de Autenticação OAuth – Plataforma BlackBelt

**Autor**: Manus AI
**Data**: 18 de novembro de 2025

## 1. Introdução

Este relatório detalha as modificações realizadas na plataforma BlackBelt para desabilitar o mecanismo de autenticação OAuth. A alteração foi solicitada para permitir o acesso livre a todas as funcionalidades do sistema, facilitando a demonstração e o teste das novas funcionalidades de backend implementadas.

## 2. Alterações Realizadas

A remoção da autenticação foi realizada em três etapas principais, garantindo que a lógica de negócio subjacente permanecesse intacta.

### 2.1. Modificação do Contexto e Procedures do tRPC

O sistema de autenticação foi contornado no core do tRPC, garantindo que todas as procedures protegidas fossem acessíveis:

1.  **Injeção de Usuário Mock**: No arquivo `server/_core/trpc.ts`, a função `requireUser` (usada pelo `protectedProcedure`) foi substituída por uma lógica que injeta um objeto de usuário mock com a role de `admin`. Isso simula um usuário logado com permissões totais, ignorando a necessidade de um token de sessão válido.
2.  **Contexto do Servidor**: O arquivo `server/_core/context.ts` foi modificado para parar de chamar a função `sdk.authenticateRequest()`, que tentava validar o token OAuth. Em vez disso, ele agora injeta diretamente o usuário mock no contexto da requisição.
3.  **Conversão de Procedures**: Todas as chamadas a `protectedProcedure` nos routers de backend foram substituídas por `publicProcedure`.

### 2.2. Ajustes no Frontend (Next.js)

A lógica de redirecionamento de login no frontend foi desativada para permitir o acesso direto à interface do usuário:

1.  **Remoção do Redirecionamento de Erro**: No arquivo `client/src/main.tsx`, a lógica que interceptava erros de não-autorização (`UNAUTHED_ERR_MSG`) e redirecionava o usuário para a tela de login foi removida.

## 3. Status Atual da Plataforma

Com as alterações implementadas, a plataforma BlackBelt está em modo de demonstração:

- **Acesso Livre**: O acesso à URL principal não exige mais login.
- **Funcionalidade Completa**: Todas as funcionalidades de backend (CRUD de tenants, setores, pessoas, avaliações de risco, propostas, etc.) estão acessíveis e operacionais.
- **Usuário Mock Ativo**: Todas as requisições ao backend são executadas como se fossem feitas por um usuário com ID `mock-user-id` e role `admin`, garantindo que não haja problemas de permissão.

A plataforma está pronta para ser explorada no link fornecido.

## 4. Próximos Passos (Reversão)

Para reverter esta alteração e reativar a autenticação OAuth, o desenvolvedor deve:

1.  Reverter as alterações nos arquivos `server/_core/trpc.ts` e `server/_core/context.ts` para a versão original (ou remover o código mock e reativar a lógica de autenticação).
2.  Reverter as alterações no `client/src/main.tsx` para reativar o redirecionamento de login.
3.  Reverter a substituição de `protectedProcedure` para `publicProcedure` nos arquivos de router.
4.  Configurar as variáveis de ambiente OAuth (`OAUTH_SERVER_URL`, `OAUTH_CLIENT_ID`, etc.) no arquivo `.env.local`.
