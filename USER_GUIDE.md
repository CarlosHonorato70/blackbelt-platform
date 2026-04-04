# Guia do Usuario - Black Belt Platform

## Indice

1. [Introducao](#introducao)
2. [Primeiros Passos](#primeiros-passos)
3. [SamurAI — Agente IA](#samurai--agente-ia)
4. [Avaliacoes NR-01](#avaliacoes-nr-01)
5. [COPSOQ-II](#copsoq-ii)
6. [Pesquisas de Clima](#pesquisas-de-clima)
7. [Dashboard Psicossocial](#dashboard-psicossocial)
8. [Tendencias e Historico](#tendencias-e-historico)
9. [Planos de Acao](#planos-de-acao)
10. [Integracao PGR/PCMSO](#integracao-pgrpcmso)
11. [eSocial](#esocial)
12. [Benchmarks Setoriais](#benchmarks-setoriais)
13. [GRO e Relatorios](#gro-e-relatorios)
14. [Suporte IA](#suporte-ia)
15. [Documentos Exportaveis (PDFs)](#documentos-exportaveis-pdfs)
16. [Gestao de Usuarios](#gestao-de-usuarios)
17. [FAQ](#faq)
18. [Contato](#contato)

---

## Introducao

A **Black Belt Platform** e uma plataforma SaaS completa para gestao de riscos psicossociais e conformidade com a NR-01 (Portaria MTE 1.419/2024, vigencia 26/05/2026). Abrange todo o ciclo de gestao: identificacao de riscos, aplicacao de instrumentos validados, geracao de planos de acao, integracao com PGR/PCMSO, eSocial e emissao de relatorios e certificados.

### Principais Funcionalidades

- Avaliacoes de Riscos Psicossociais (NR-01) com matriz de risco
- Questionario COPSOQ-II (76 questoes, 12 dimensoes)
- 3 instrumentos de Pesquisa de Clima (EACT, ITRA, QVT-Walton)
- SamurAI: agente de IA com 10 fases do processo NR-01
- Dashboard Psicossocial com radar de dimensoes
- Planos de Acao com cronograma, KPIs e verificacao de eficacia
- Integracao PGR/PCMSO com exames ASO
- eSocial (S-2210, S-2220, S-2240) com certificado A1
- Benchmarks setoriais e calculadora financeira
- GRO consolidado, checklist de conformidade e certificados
- Multi-tenant com isolamento completo de dados
- RBAC com 4 perfis e 20+ permissoes
- 20+ documentos exportaveis em PDF

---

## Primeiros Passos

### 1. Acesso a Plataforma

1. Acesse `https://blackbeltconsultoria.com`
2. Faca login com email e senha
3. Voce sera direcionado ao Dashboard principal

### 2. Selecionando uma Empresa

1. No canto superior esquerdo, clique no seletor de empresa
2. Escolha a empresa que deseja gerenciar
3. Todos os dados exibidos serao filtrados para essa empresa

### 3. Navegacao

O menu lateral possui as seguintes secoes:

- **Dashboard** — Visao geral com indicadores
- **Empresas** — Gestao de empresas/tenants (admin)
- **Setores** — Departamentos da empresa
- **Colaboradores** — Funcionarios e terceiros
- **SamurAI** — Agente IA para o processo NR-01
- **Suporte IA** — Chatbot inteligente e tickets
- **Avaliacoes NR-01** — Avaliacoes de riscos psicossociais
- **COPSOQ-II** — Questionario psicossocial (76 questoes)
- **Pesquisas de Clima** — EACT, ITRA, QVT-Walton
- **Dashboard Psicossocial** — Radar de dimensoes e segmentacao
- **Tendencias** — Evolucao multi-ciclo e historico
- **Planos de Acao** — Cronograma, KPIs, verificacao de eficacia
- **Relatorios de Conformidade** — GRO, checklist, certificados
- **Integracao PGR/PCMSO** — Recomendacoes medicas e exames ASO
- **eSocial** — Geracao e envio de XML (S-2210, S-2220, S-2240)
- **Benchmarks Setoriais** — Comparacao com media do setor
- **Calculadora Financeira** — Impacto financeiro de riscos
- **Denuncias Anonimas** — Canal de denuncias
- **Treinamentos** — Modulos de capacitacao NR-01
- **Servicos e Precos** — Catalogo e precificacao
- **Propostas Comerciais** — Geracao de propostas
- **Checklist de Conformidade** — 35 itens de verificacao
- **Certificados** — Emissao de certificados de conformidade
- **Configuracoes** — Parametros gerais da plataforma
- **Perfis e Permissoes** — RBAC e gestao de acessos

---

## SamurAI -- Agente IA

O SamurAI e o agente de inteligencia artificial da plataforma. Ele conduz o processo completo de conformidade NR-01 em **10 fases**:

1. **Coleta de Dados** — Informacoes da empresa (CNPJ, porte, setor)
2. **Mapeamento de Riscos** — Identificacao de fatores psicossociais
3. **Aplicacao de Instrumentos** — COPSOQ-II e pesquisas de clima
4. **Analise de Resultados** — Consolidacao e classificacao de risco
5. **Plano de Acao** — Geracao automatica de acoes corretivas
6. **Integracao PGR** — Inclusao dos riscos no PGR
7. **Integracao PCMSO** — Recomendacoes para monitoramento medico
8. **eSocial** — Preparacao de eventos para envio
9. **Relatorio Final** — GRO consolidado com todas as secoes
10. **Certificacao** — Emissao de certificado de conformidade

### Como Usar

1. Acesse **SamurAI** no menu lateral
2. Digite o CNPJ da empresa ou selecione uma empresa cadastrada
3. Siga as instrucoes do agente em cada fase
4. O SamurAI faz auto-transicao entre fases conforme o progresso
5. Ao final, todos os documentos sao gerados automaticamente

O agente pode gerar documentos a qualquer momento durante o processo, incluindo relatorios parciais, planos de acao e XMLs do eSocial.

---

## Avaliacoes NR-01

### O que e

Avaliacao de riscos psicossociais conforme Portaria MTE 1.419/2024. Identifica fatores de risco relacionados ao trabalho que podem impactar a saude mental dos colaboradores.

### Criar Nova Avaliacao

1. Acesse **Avaliacoes NR-01**
2. Clique em **+ Nova Avaliacao**
3. Preencha titulo, descricao, data, avaliador e setor (opcional)
4. Clique em **Criar**

### Adicionar Itens de Risco

1. Abra uma avaliacao existente
2. Clique em **+ Adicionar Item de Risco**
3. Selecione a categoria GRO (5 categorias):
   - Organizacao do Trabalho
   - Relacoes Interpessoais
   - Condicoes do Ambiente
   - Gestao de Mudancas
   - Fatores Individuais
4. Selecione o tipo MTE (13 tipos disponiveis):
   - Sobrecarga de trabalho
   - Pressao por metas
   - Jornada excessiva
   - Falta de autonomia
   - Assedio moral
   - Assedio sexual
   - Violencia no trabalho
   - Conflitos interpessoais
   - Falta de suporte
   - Inseguranca no emprego
   - Trabalho em turno/noturno
   - Monotonia/repetitividade
   - Isolamento social
5. Defina Gravidade (Baixa, Media, Alta, Critica) e Probabilidade (Rara, Improvavel, Possivel, Provavel, Certa)
6. Descreva controles atuais e recomendacoes
7. O nivel de risco e calculado automaticamente (Gravidade x Probabilidade)

### Matriz de Risco

| Probabilidade / Gravidade | Baixa | Media | Alta | Critica |
|---------------------------|-------|-------|------|---------|
| Certa (5)                 | Media | Alta  | Critica | Critica |
| Provavel (4)              | Media | Alta  | Alta | Critica |
| Possivel (3)              | Baixa | Media | Alta | Alta |
| Improvavel (2)            | Baixa | Baixa | Media | Alta |
| Rara (1)                  | Baixa | Baixa | Baixa | Media |

### Gerar Planos de Acao via IA

1. Abra uma avaliacao com itens de risco preenchidos
2. Clique em **Gerar Plano de Acao (IA)**
3. O sistema analisa os riscos identificados e gera automaticamente:
   - Acoes corretivas priorizadas
   - Prazos sugeridos
   - Responsaveis recomendados
   - Indicadores de efetividade

---

## COPSOQ-II

### O que e

Copenhagen Psychosocial Questionnaire -- questionario validado internacionalmente com **76 questoes** que avaliam **12 dimensoes** psicossociais:

1. **Demanda** — Carga de trabalho e exigencias quantitativas
2. **Controle** — Autonomia e influencia no trabalho
3. **Apoio Social** — Suporte de colegas e supervisores
4. **Lideranca** — Qualidade da gestao e lideranca
5. **Comunidade** — Senso de pertencimento no trabalho
6. **Significado** — Significado e proposito do trabalho
7. **Confianca** — Confianca vertical (gestao-colaborador)
8. **Justica** — Percepcao de justica organizacional
9. **Inseguranca** — Inseguranca quanto ao emprego
10. **Saude Mental** — Indicadores de saude mental
11. **Burnout** — Sintomas de esgotamento profissional
12. **Violencia** — Exposicao a comportamentos ofensivos

### Criar Avaliacao COPSOQ

1. Acesse **COPSOQ-II**
2. Clique em **+ Nova Avaliacao**
3. Preencha titulo, descricao e setor (opcional -- em branco avalia toda a organizacao)
4. Clique em **Criar**

### Enviar Convites

1. Abra a avaliacao criada
2. Clique em **Convidar Participantes**
3. Selecione os colaboradores
4. Defina dias para expiracao (padrao: 7 dias)
5. Clique em **Enviar Convites**
6. Cada participante recebe email com link unico e prazo

### Lembretes Automaticos

O sistema envia lembretes automaticos para convites pendentes:

- **Lembrete 1**: 3 dias apos o envio inicial
- **Lembrete 2**: 1 dia antes da expiracao
- **Lembrete 3**: No dia da expiracao

### Responder COPSOQ

1. O participante clica no link recebido por email
2. Responde as 76 questoes em escala de 1-5 (Nunca a Sempre)
3. Preenche dados demograficos anonimos (faixa etaria, genero, tempo na empresa)
4. Submete a resposta

### Dashboard por Setor e Demografia

O relatorio COPSOQ mostra:

- Taxa de resposta (% de participantes)
- Scores por dimensao (media de 0-100)
- Classificacao de risco (Baixo, Medio, Alto, Critico)
- Segmentacao por setor e dados demograficos
- Graficos de distribuicao por dimensao
- Recomendacoes baseadas nos resultados

---

## Pesquisas de Clima

A plataforma oferece 3 instrumentos validados cientificamente:

### EACT - Escala de Avaliacao do Contexto de Trabalho

- **31 questoes** em **3 dimensoes**:
  - Organizacao do Trabalho
  - Condicoes de Trabalho
  - Relacoes Socioprofissionais

### ITRA - Inventario de Trabalho e Riscos de Adoecimento

- **32 questoes** em **7 dimensoes**:
  - Organizacao do Trabalho
  - Condicoes de Trabalho
  - Relacoes Socioprofissionais
  - Custo Fisico
  - Custo Cognitivo
  - Custo Afetivo
  - Danos Relacionados ao Trabalho

### QVT-Walton - Qualidade de Vida no Trabalho

- **35 questoes** em **8 dimensoes**:
  - Compensacao Justa e Adequada
  - Condicoes de Trabalho
  - Uso e Desenvolvimento de Capacidades
  - Oportunidade de Crescimento
  - Integracao Social
  - Constitucionalismo
  - Trabalho e Espaco de Vida
  - Relevancia Social

### Como Criar e Aplicar

1. Acesse **Pesquisas de Clima**
2. Clique em **+ Nova Pesquisa**
3. Selecione o instrumento (EACT, ITRA ou QVT-Walton)
4. Preencha titulo e descricao
5. Clique em **Criar**
6. Envie convites por email aos participantes
7. Acompanhe a taxa de resposta em tempo real

### Ver Resultados

- Resultados por dimensao com grafico de barras/radar
- Badges de risco por dimensao (Satisfatorio, Critico, Grave)
- Comparacao entre dimensoes
- Segmentacao por setor e demografia

---

## Dashboard Psicossocial

O Dashboard Psicossocial oferece uma visao consolidada de todos os instrumentos aplicados.

### Funcionalidades

- **Radar de Dimensoes** — Grafico radar com todas as dimensoes avaliadas
- **Segmentacao por Setor** — Filtre resultados por departamento
- **Segmentacao Demografica** — Filtre por faixa etaria, genero, tempo de empresa
- **Compartilhar Resultados** — Gere a devolutiva aos trabalhadores (obrigatorio pela NR-01)

### Como Usar

1. Acesse **Dashboard Psicossocial**
2. Selecione o periodo e instrumentos a visualizar
3. Use os filtros de setor e demografia para segmentar
4. Clique em **Compartilhar** para gerar a devolutiva

---

## Tendencias e Historico

Acompanhe a evolucao dos indicadores psicossociais ao longo de multiplos ciclos de avaliacao.

### O que Mostra

- **Score Geral** — Media consolidada de todos os instrumentos
- **Variacao** — Diferenca percentual entre ciclos
- **Tendencia** — Classificacao automatica: Melhora, Declinio ou Estavel
- **Destaques por Dimensao** — Dimensoes com maior variacao (positiva ou negativa)
- **Tabela Multi-ciclo** — Historico completo com todos os ciclos

### Como Usar

1. Acesse **Tendencias**
2. Visualize o grafico de evolucao temporal
3. Clique em uma dimensao para ver detalhes
4. Exporte o historico em PDF se necessario

---

## Planos de Acao

### Criar Plano de Acao

1. Acesse **Planos de Acao**
2. Clique em **+ Novo Plano** (ou gere via IA a partir de uma avaliacao)
3. Preencha:
   - Titulo e descricao
   - Responsavel
   - Prioridade (Baixa, Media, Alta, Urgente)
   - Prazo
   - Status (Pendente, Em Andamento, Concluido)
   - KPI associado
4. Clique em **Salvar**

### Editar com Verificacao de Eficacia

1. Abra um plano de acao existente
2. Atualize o status e registre evidencias
3. Preencha a **Verificacao de Eficacia** — avalie se a acao atingiu o resultado esperado
4. O **Indicador de Efetividade** e calculado automaticamente

### Cronograma Mensal

- Visualize todos os planos em formato de cronograma mensal
- Filtre por prioridade, status ou responsavel
- Acompanhe prazos e atrasos

---

## Integracao PGR/PCMSO

### PGR - Programa de Gerenciamento de Riscos

1. Acesse **Integracao PGR/PCMSO**
2. Na aba **PGR**, visualize os riscos psicossociais identificados
3. Clique em **Gerar PGR Consolidado** para exportar em PDF
4. O documento inclui todos os riscos, controles e planos de acao

### PCMSO - Recomendacoes Medicas

1. Na aba **PCMSO**, visualize as recomendacoes medicas geradas a partir dos riscos
2. Registre resultados de exames ASO:
   - Admissional
   - Periodico
   - Retorno ao Trabalho
   - Mudanca de Funcao
   - Demissional
3. Acompanhe o historico de exames por colaborador

---

## eSocial

### Eventos Disponiveis

- **S-2210** — CAT (Comunicacao de Acidente de Trabalho)
- **S-2220** — Monitoramento da Saude do Trabalhador
- **S-2240** — Condicoes Ambientais do Trabalho

### Como Gerar e Enviar

1. Acesse **eSocial**
2. Selecione o tipo de evento (S-2210, S-2220 ou S-2240)
3. Preencha os dados requeridos
4. Clique em **Gerar XML** para validar
5. Revise o XML gerado
6. Clique em **Enviar** com certificado digital A1
7. Acompanhe o status do envio (Pendente, Enviado, Aceito, Rejeitado)

### Alerta de S-2240 Pendente

O sistema emite alerta automatico quando ha eventos S-2240 pendentes de envio, garantindo conformidade com os prazos do eSocial.

---

## Benchmarks Setoriais

Compare os indicadores da sua empresa com a media do setor de atuacao.

### O que Mostra

- **Comparacao com Media do Setor** — Posicao relativa da empresa
- **Taxas de Burnout** — Comparativo setorial
- **Taxas de Assedio** — Incidencia comparativa
- **Taxas de Afastamentos** — Comparativo de absenteismo
- **Grafico Radar** — Visualizacao consolidada de todas as metricas

### Como Usar

1. Acesse **Benchmarks Setoriais**
2. O sistema identifica automaticamente o setor da empresa (CNAE)
3. Visualize os graficos comparativos
4. Use os insights para priorizar acoes

---

## GRO e Relatorios

### GRO Consolidado

O Gerenciamento de Riscos Ocupacionais consolidado segue as 8 secoes exigidas pela NR-01 (paragrafo 1.5):

1. Identificacao de Perigos
2. Avaliacao de Riscos
3. Controle de Riscos
4. Planos de Acao
5. Monitoramento e Analise Critica
6. Preparacao para Emergencias
7. Documentacao e Comunicacao
8. Melhoria Continua

Para gerar: Acesse **Relatorios de Conformidade** e clique em **Gerar GRO**.

### Checklist de Conformidade

35 itens de verificacao cobrindo:

- **NR-01** — Disposicoes gerais e gerenciamento de riscos
- **NR-07** — PCMSO
- **NR-09** — Avaliacoes e controle de exposicoes
- **NR-17** — Ergonomia
- **NR-35** — Trabalho em altura

Acesse **Checklist de Conformidade** para preencher e acompanhar o progresso.

### Certificado de Conformidade

Apos completar o checklist e gerar o GRO, emita o **Certificado de Conformidade** NR-01 em **Certificados**.

---

## Suporte IA

### Chatbot Inteligente

O Suporte IA e um chatbot que responde duvidas sobre a plataforma, NR-01 e gestao de riscos psicossociais.

### Como Usar

1. Acesse **Suporte IA** no menu lateral
2. Digite sua pergunta no campo de texto
3. O chatbot responde em tempo real com base na documentacao e legislacao

### Abrir Ticket

Se o chatbot nao resolver sua duvida:

1. Clique em **Abrir Ticket**
2. Descreva o problema em detalhes
3. Acompanhe o status do ticket na mesma tela
4. Voce recebera notificacao quando houver resposta

---

## Documentos Exportaveis (PDFs)

A plataforma gera mais de 20 documentos em PDF:

1. Relatorio de Avaliacao NR-01
2. Matriz de Risco
3. Relatorio COPSOQ-II (geral)
4. Relatorio COPSOQ-II (por setor)
5. Relatorio COPSOQ-II (por demografia)
6. Relatorio EACT
7. Relatorio ITRA
8. Relatorio QVT-Walton
9. Dashboard Psicossocial
10. Devolutiva aos Trabalhadores
11. Relatorio de Tendencias
12. Plano de Acao (individual)
13. Plano de Acao (consolidado)
14. PGR Consolidado
15. Recomendacoes PCMSO
16. Ficha de Exame ASO
17. XML eSocial (S-2210, S-2220, S-2240)
18. GRO Consolidado (8 secoes)
19. Checklist de Conformidade
20. Certificado de Conformidade
21. Benchmarks Setoriais
22. Proposta Comercial
23. Relatorio de Calculadora Financeira

---

## Gestao de Usuarios

### Perfis de Acesso

- **admin** — Acesso total a plataforma, gerencia todos os tenants
- **consultant** — Acesso a ferramentas de avaliacao e relatorios para multiplas empresas
- **company_admin** — Administrador da empresa, gerencia usuarios e dados do proprio tenant
- **viewer** — Apenas consulta dados, sem permissao de edicao

### Convidar Usuario

1. Acesse **Configuracoes** ou **Perfis e Permissoes**
2. Clique em **Convidar Usuario**
3. Preencha email, perfil (role) e empresa (tenant)
4. Clique em **Enviar Convite**
5. O usuario recebe email com link de ativacao

### Permissoes (RBAC)

1. Acesse **Perfis e Permissoes**
2. Selecione um perfil
3. Visualize e edite as permissoes por recurso (Criar, Ler, Atualizar, Excluir, Exportar)
4. Salve as alteracoes
5. O perfil admin possui bypass automatico de todas as permissoes

### Autenticacao em Dois Fatores (2FA)

1. Acesse **Configuracoes** da sua conta
2. Ative a **Autenticacao em Dois Fatores**
3. Escaneie o QR Code com um app autenticador (Google Authenticator, Authy, etc.)
4. Insira o codigo de verificacao para confirmar
5. A partir do proximo login, sera solicitado o codigo 2FA

---

## FAQ

### SamurAI

**Como o SamurAI sabe quais riscos identificar?**
O agente utiliza a base de dados da NR-01, as 5 categorias GRO e os 13 tipos MTE para mapear riscos com base no setor e porte da empresa.

**Preciso completar todas as 10 fases?**
Sim, para obter o certificado de conformidade completo. Porem, voce pode gerar relatorios parciais a qualquer momento.

### Pesquisas de Clima

**Qual a diferenca entre COPSOQ-II, EACT, ITRA e QVT-Walton?**
O COPSOQ-II (76 questoes, 12 dimensoes) e o instrumento mais completo. O EACT (31q) foca no contexto de trabalho. O ITRA (32q) avalia riscos de adoecimento. O QVT-Walton (35q) mede qualidade de vida no trabalho. Escolha conforme a necessidade da avaliacao.

**As respostas sao anonimas?**
Sim. Os participantes preenchem dados demograficos genericos (faixa etaria, genero, tempo de empresa), mas nao ha identificacao individual nas respostas.

### eSocial

**Preciso de certificado digital?**
Sim, e necessario certificado digital A1 para enviar eventos ao eSocial.

**O que acontece se o XML for rejeitado?**
O sistema mostra o motivo da rejeicao. Corrija os dados e reenvie.

### COPSOQ

**Quanto tempo dura um convite COPSOQ?**
Padrao de 7 dias, configuravel ao enviar. Lembretes automaticos sao enviados antes da expiracao.

**Qual o tempo medio de preenchimento?**
Aproximadamente 15-20 minutos para as 76 questoes.

### Planos de Acao

**Posso gerar planos de acao automaticamente?**
Sim, a partir de qualquer avaliacao NR-01 com itens de risco preenchidos. Clique em "Gerar Plano de Acao (IA)".

**Como funciona a verificacao de eficacia?**
Ao editar um plano concluido, preencha se a acao atingiu o resultado esperado. O indicador de efetividade e calculado automaticamente.

### Suporte

**O Suporte IA substitui o suporte humano?**
Nao. O chatbot resolve duvidas comuns. Para questoes complexas, abra um ticket e a equipe respondera.

**Como acompanho meus tickets?**
Na tela de Suporte IA, clique na aba de tickets para ver o historico e status.

---

## Contato

- **Email**: contato@blackbeltconsultoria.com
- **Site**: https://blackbeltconsultoria.com

---

**Black Belt Platform** — Gestao Inteligente de Riscos Psicossociais
