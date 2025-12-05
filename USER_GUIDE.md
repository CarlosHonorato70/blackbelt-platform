# 📖 Guia do Usuário - Black Belt Platform

## Índice

1. [Introdução](#introdução)
2. [Primeiros Passos](#primeiros-passos)
3. [Gestão de Empresas (Tenants)](#gestão-de-empresas-tenants)
4. [Avaliações NR-01](#avaliações-nr-01)
5. [Avaliações COPSOQ-II](#avaliações-copsoq-ii)
6. [Geração de Propostas](#geração-de-propostas)
7. [Módulo de Precificação](#módulo-de-precificação)
8. [Gestão de Usuários](#gestão-de-usuários)
9. [Relatórios e Exportações](#relatórios-e-exportações)
10. [Perguntas Frequentes](#perguntas-frequentes)

---

## Introdução

A **Black Belt Platform** é uma plataforma completa para gestão de riscos psicossociais (NR-01) e geração automatizada de propostas comerciais.

### Principais Funcionalidades

- ✅ Avaliações de Riscos Psicossociais (NR-01)
- ✅ Questionário COPSOQ-II (76 questões, 12 dimensões)
- ✅ Geração automática de propostas comerciais
- ✅ Sistema de precificação inteligente
- ✅ Multi-tenant (várias empresas em uma plataforma)
- ✅ Controle de acesso por perfis e permissões
- ✅ Auditoria completa de ações

---

## Primeiros Passos

### 1. Acesso à Plataforma

1. Acesse `https://sua-plataforma.com.br`
2. Faça login com suas credenciais OAuth
3. Você será direcionado ao Dashboard principal

### 2. Selecionando uma Empresa

1. No canto superior esquerdo, clique no **seletor de empresa**
2. Escolha a empresa que deseja gerenciar
3. Todos os dados exibidos serão filtrados para essa empresa

> 💡 **Dica**: Você pode trocar de empresa a qualquer momento usando o seletor.

### 3. Navegação

O menu lateral possui as seguintes seções:

- **Dashboard**: Visão geral com indicadores
- **Empresas**: Gestão de empresas (apenas administradores)
- **Setores**: Departamentos da empresa
- **Colaboradores**: Funcionários e terceiros
- **Avaliações NR-01**: Avaliações de riscos psicossociais
- **COPSOQ**: Questionários psicossociais
- **Clientes**: Clientes para propostas comerciais
- **Serviços**: Catálogo de serviços oferecidos
- **Propostas**: Propostas comerciais geradas
- **Relatórios**: Relatórios de compliance
- **Configurações**: Parâmetros de precificação

---

## Gestão de Empresas (Tenants)

### Criar Nova Empresa

1. Acesse **Empresas** no menu lateral
2. Clique em **+ Nova Empresa**
3. Preencha os dados:
   - **Nome**: Razão social da empresa
   - **CNPJ**: CNPJ no formato XX.XXX.XXX/XXXX-XX
   - **Status**: Ativa ou Inativa
4. Clique em **Salvar**

### Editar Empresa

1. Na lista de empresas, clique no ícone **✏️ Editar**
2. Modifique os campos necessários
3. Clique em **Salvar**

### Excluir Empresa

1. Na lista, clique no ícone **🗑️ Excluir**
2. Confirme a exclusão
3. A empresa será marcada como inativa (soft delete)

---

## Avaliações NR-01

### O que é uma Avaliação NR-01?

Avaliação de riscos psicossociais conforme **Portaria MTE nº 1.419/2024**. Identifica fatores de risco relacionados ao trabalho que podem impactar a saúde mental dos colaboradores.

### Criar Nova Avaliação

1. Acesse **Avaliações NR-01**
2. Clique em **+ Nova Avaliação**
3. Preencha:
   - **Título**: Ex: "Avaliação Q1 2025"
   - **Descrição**: Objetivo da avaliação
   - **Data**: Data de realização
   - **Avaliador**: Nome do responsável
   - **Setor** (opcional): Avaliar apenas um setor específico
4. Clique em **Criar**

### Adicionar Itens de Risco

1. Abra uma avaliação existente
2. Clique em **+ Adicionar Item de Risco**
3. Preencha:
   - **Fator de Risco**: Selecione da lista (ex: "Carga de trabalho excessiva")
   - **Gravidade**: Baixa, Média, Alta ou Crítica
   - **Probabilidade**: Rara, Improvável, Possível, Provável ou Certa
   - **Controles Atuais**: Medidas já implementadas
   - **Recomendações**: Ações sugeridas
4. O **Nível de Risco** é calculado automaticamente (Gravidade × Probabilidade)

### Matriz de Risco

| Probabilidade \ Gravidade | Baixa | Média | Alta | Crítica |
|---------------------------|-------|-------|------|---------|
| **Certa (5)** | Média | Alta | Crítica | Crítica |
| **Provável (4)** | Média | Alta | Alta | Crítica |
| **Possível (3)** | Baixa | Média | Alta | Alta |
| **Improvável (2)** | Baixa | Baixa | Média | Alta |
| **Rara (1)** | Baixa | Baixa | Baixa | Média |

### Gerar Proposta Comercial

1. Abra uma avaliação concluída
2. Clique no menu **⋮** → **Gerar Proposta**
3. Selecione o **Cliente**
4. Marque **Enviar email** se desejar notificar o cliente
5. Clique em **Gerar**
6. O sistema irá:
   - Analisar o nível de risco geral
   - Recomendar serviços apropriados
   - Calcular preços com impostos
   - Criar a proposta
   - Enviar email (se selecionado)

---

## Avaliações COPSOQ-II

### O que é COPSOQ-II?

**Copenhagen Psychosocial Questionnaire** - Questionário validado internacionalmente com **76 questões** que avaliam **12 dimensões** psicossociais:

1. **Demanda** - Carga de trabalho
2. **Controle** - Autonomia e influência
3. **Apoio** - Suporte de colegas e supervisores
4. **Liderança** - Qualidade da liderança
5. **Comunidade** - Senso de comunidade no trabalho
6. **Significado** - Significado do trabalho
7. **Confiança** - Confiança vertical
8. **Justiça** - Justiça organizacional
9. **Insegurança** - Insegurança no trabalho
10. **Saúde Mental** - Indicadores de saúde mental
11. **Burnout** - Sintomas de esgotamento
12. **Violência** - Exposição a comportamentos ofensivos

### Criar Avaliação COPSOQ

1. Acesse **COPSOQ** → **Tracking**
2. Clique em **+ Nova Avaliação**
3. Preencha:
   - **Título**: Ex: "COPSOQ Q1 2025"
   - **Descrição**: Contexto da avaliação
   - **Setor** (opcional): Deixe em branco para avaliar toda a organização
4. Clique em **Criar**

### Enviar Convites

1. Abra a avaliação criada
2. Clique em **Convidar Participantes**
3. Selecione os colaboradores da lista
4. Defina **Dias para Expiração** (padrão: 7 dias)
5. Clique em **Enviar Convites**
6. Cada participante receberá um email com:
   - Link único e seguro
   - Instruções de preenchimento
   - Prazo para resposta

### Sistema de Lembretes

O sistema envia **lembretes automáticos** para convites pendentes:

- **Lembrete 1**: 3 dias após o envio inicial
- **Lembrete 2**: 1 dia antes da expiração
- **Lembrete 3**: No dia da expiração

### Responder COPSOQ

1. O participante clica no link recebido por email
2. Responde as **76 questões** em escala de 1-5:
   - 1 = Nunca/Quase nunca
   - 2 = Raramente
   - 3 = Às vezes
   - 4 = Frequentemente
   - 5 = Sempre
3. Preenche dados demográficos (anônimos):
   - Faixa etária
   - Gênero
   - Tempo na empresa
4. Submete a resposta

### Visualizar Relatório

1. Acesse a avaliação COPSOQ
2. Clique em **Ver Relatório**
3. O relatório mostra:
   - **Taxa de Resposta**: % de participantes que responderam
   - **Scores por Dimensão**: Média de 0-100 para cada dimensão
   - **Classificação de Risco**: Baixo, Médio, Alto ou Crítico
   - **Distribuição de Respostas**: Gráficos por dimensão
   - **Recomendações**: Ações sugeridas baseadas nos resultados

---

## Geração de Propostas

### Fluxo Automático

A plataforma gera propostas automaticamente baseadas no **nível de risco** da avaliação:

#### Risco Baixo
- ✅ Diagnóstico Organizacional

#### Risco Médio
- ✅ Diagnóstico Organizacional
- ✅ 2 Treinamentos NR-01

#### Risco Alto
- ✅ Diagnóstico Organizacional
- ✅ 3 Treinamentos NR-01
- ✅ 12 horas de Consultoria

#### Risco Crítico
- ✅ Diagnóstico Organizacional
- ✅ 3 Treinamentos NR-01
- ✅ 12 horas de Consultoria
- ✅ Plano de Ação Emergencial

### Email da Proposta

O cliente recebe um email profissional contendo:

- 📊 **Nível de Risco** identificado (com cor)
- 📋 **Serviços Recomendados** com detalhamento
- 💰 **Tabela de Preços** (subtotal, impostos, total)
- 🎯 **Diferenciais da Black Belt**
- 🔗 **Link** para visualizar a proposta completa

### Criar Proposta Manual

1. Acesse **Propostas**
2. Clique em **+ Nova Proposta**
3. Selecione o **Cliente**
4. Adicione **Itens**:
   - Serviço
   - Quantidade
   - Preço unitário (pode ajustar)
5. O sistema calcula automaticamente:
   - Subtotal
   - Impostos (baseado no regime tributário)
   - Descontos progressivos
   - Total
6. Clique em **Salvar**

---

## Módulo de Precificação

### Clientes

Gerencie seus clientes para envio de propostas:

1. Acesse **Clientes**
2. Clique em **+ Novo Cliente**
3. Preencha dados cadastrais e de contato
4. Salve

### Catálogo de Serviços

Configure os serviços oferecidos:

1. Acesse **Serviços**
2. Clique em **+ Novo Serviço**
3. Defina:
   - Nome
   - Descrição
   - Categoria (Avaliação, Treinamento, Consultoria)
   - Preço Base
   - Tipo de Unidade (Projeto, Horas, Sessões)
   - Duração Estimada
4. Salve

### Parâmetros de Precificação

Configure como os preços são calculados:

1. Acesse **Configurações** → **Parâmetros de Precificação**
2. Selecione o **Regime Tributário**:
   - MEI (6%)
   - Simples Nacional (8%)
   - Lucro Presumido (13.33%)
   - Autônomo (27.5%)
3. Configure **Custos**:
   - Custos Fixos Mensais
   - Custos de Pessoal
   - Horas Produtivas/Mês
4. Defina **Margem de Lucro** (%)
5. Configure **Descontos Progressivos**:
   - Tier 1: Acima de R$ X → Y% desconto
   - Tier 2: Acima de R$ X → Y% desconto
   - Tier 3: Acima de R$ X → Y% desconto
6. Salve

### Cálculo de Hora Técnica

O sistema calcula automaticamente:

```
Hora Técnica = (Custos Fixos + Custos Pessoal) / Horas Produtivas
Hora com Margem = Hora Técnica × (1 + Margem Lucro)
Hora com Impostos = Hora com Margem / (1 - Alíquota)
```

---

## Gestão de Usuários

### Perfis de Acesso

- **Admin**: Acesso total à plataforma
- **Gestor**: Gerencia sua empresa e equipes
- **Avaliador**: Cria e gerencia avaliações
- **Visualizador**: Apenas consulta dados

### Convidar Usuário

1. Acesse **Usuários** → **Convites**
2. Clique em **+ Novo Convite**
3. Preencha:
   - Email do usuário
   - Perfil (Role)
   - Empresa (Tenant)
4. Clique em **Enviar Convite**
5. O usuário recebe email com link de ativação

### Gerenciar Permissões

1. Acesse **Perfis e Permissões**
2. Selecione um perfil
3. Marque/desmarque permissões:
   - Criar
   - Ler
   - Atualizar
   - Excluir
   - Exportar
4. Salve

---

## Relatórios e Exportações

### Relatórios de Compliance

1. Acesse **Relatórios**
2. Selecione tipo:
   - **NR-01**: Relatório de conformidade
   - **COPSOQ**: Relatório psicossocial
   - **Auditoria**: Log de ações
3. Defina período
4. Clique em **Gerar**

### Exportar Dados

1. Em qualquer lista, clique em **Exportar**
2. Escolha formato:
   - **JSON**: Dados estruturados
   - **Excel**: Planilha (.xlsx)
   - **PDF**: Documento formatado
3. Download automático

### Data Subject Requests (LGPD)

Para solicitações de dados pessoais:

1. Acesse **Exportação de Dados**
2. Informe email do titular
3. Clique em **Solicitar Exportação**
4. Sistema gera pacote completo com todos os dados
5. Download disponível em até 24h

---

## Perguntas Frequentes

### Como alterar minha empresa ativa?

Use o seletor no canto superior esquerdo do Dashboard.

### Posso ter múltiplas empresas?

Sim, usuários Admin podem gerenciar várias empresas.

### Como funciona o isolamento de dados?

Cada empresa (tenant) tem seus dados completamente isolados. Usuários só veem dados da empresa selecionada.

### Quanto tempo dura um convite COPSOQ?

Por padrão 7 dias, mas você pode configurar ao enviar.

### Posso editar uma proposta gerada automaticamente?

Sim, após a geração você pode editar itens, quantidades e preços.

### Como funciona o cálculo de impostos?

Baseado no regime tributário configurado nos Parâmetros de Precificação.

### Os dados são seguros?

Sim, a plataforma usa:
- Criptografia HTTPS
- Autenticação OAuth 2.0
- Rate limiting contra abusos
- Auditoria completa
- Backups automáticos

### Onde ficam armazenados os dados?

Em banco de dados MySQL com isolamento por tenant (RLS - Row Level Security).

### Como funciona o suporte?

Entre em contato via: suporte@blackbelt.com.br

### Existe aplicativo móvel?

Atualmente não, mas a plataforma é responsiva e funciona em navegadores móveis.

---

## Suporte

**Email**: suporte@blackbelt.com.br  
**Telefone**: +55 (11) 98765-4321  
**Horário**: Segunda a Sexta, 9h às 18h

---

**Black Belt Platform** - Gestão Inteligente de Riscos Psicossociais
