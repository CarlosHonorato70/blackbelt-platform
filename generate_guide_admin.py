#!/usr/bin/env python3
"""Gera o PDF GUIA_ADMIN_MASTER.pdf — Guia do Administrador Master da Black Belt Platform."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

# ── Colors ──────────────────────────────────────────────────────────────────
P1 = HexColor("#4C1D95")
P2 = HexColor("#7C3AED")
P3 = HexColor("#EDE9FE")
G1 = HexColor("#111827")
G2 = HexColor("#374151")
G3 = HexColor("#6B7280")
G4 = HexColor("#D1D5DB")
G5 = HexColor("#F3F4F6")
GREEN = HexColor("#059669")
RED = HexColor("#DC2626")
AMBER = HexColor("#D97706")
BLUE = HexColor("#2563EB")

W, H = A4

# ── Styles ──────────────────────────────────────────────────────────────────
def _s(name, **kw):
    return ParagraphStyle(name, **kw)

S = {
    "cover_title": _s("cover_title", fontName="Helvetica-Bold", fontSize=28,
                       leading=34, textColor=P1, alignment=TA_CENTER),
    "cover_sub": _s("cover_sub", fontName="Helvetica", fontSize=16,
                     leading=22, textColor=G2, alignment=TA_CENTER),
    "cover_tag": _s("cover_tag", fontName="Helvetica-Bold", fontSize=9,
                     leading=12, textColor=white, alignment=TA_CENTER,
                     backColor=P1, borderPadding=(4, 8, 4, 8)),
    "h1": _s("h1", fontName="Helvetica-Bold", fontSize=18, leading=24,
             textColor=P1, spaceBefore=24, spaceAfter=10),
    "h2": _s("h2", fontName="Helvetica-Bold", fontSize=14, leading=18,
             textColor=P2, spaceBefore=16, spaceAfter=6),
    "h3": _s("h3", fontName="Helvetica-Bold", fontSize=11, leading=15,
             textColor=G1, spaceBefore=10, spaceAfter=4),
    "body": _s("body", fontName="Helvetica", fontSize=10, leading=14,
               textColor=G2, alignment=TA_JUSTIFY, spaceBefore=2, spaceAfter=4),
    "body_bold": _s("body_bold", fontName="Helvetica-Bold", fontSize=10,
                     leading=14, textColor=G1, alignment=TA_JUSTIFY,
                     spaceBefore=2, spaceAfter=4),
    "bullet": _s("bullet", fontName="Helvetica", fontSize=10, leading=14,
                  textColor=G2, leftIndent=18, bulletIndent=6,
                  spaceBefore=1, spaceAfter=1, bulletFontName="Helvetica",
                  bulletFontSize=10),
    "num": _s("num", fontName="Helvetica", fontSize=10, leading=14,
              textColor=G2, leftIndent=18, bulletIndent=6,
              spaceBefore=1, spaceAfter=1),
    "route": _s("route", fontName="Courier", fontSize=9, leading=13,
                textColor=BLUE, backColor=G5, borderPadding=(2, 4, 2, 4),
                spaceBefore=4, spaceAfter=4),
    "note": _s("note", fontName="Helvetica", fontSize=9, leading=13,
               textColor=BLUE, backColor=HexColor("#EFF6FF"),
               borderPadding=(6, 8, 6, 8), spaceBefore=6, spaceAfter=6),
    "warn": _s("warn", fontName="Helvetica-Bold", fontSize=9, leading=13,
               textColor=AMBER, backColor=HexColor("#FFFBEB"),
               borderPadding=(6, 8, 6, 8), spaceBefore=6, spaceAfter=6),
    "footer": _s("footer", fontName="Helvetica", fontSize=8, leading=10,
                  textColor=G3, alignment=TA_CENTER),
    "toc": _s("toc", fontName="Helvetica", fontSize=10, leading=16,
              textColor=G2, leftIndent=12, spaceBefore=1, spaceAfter=1),
}

# ── Helpers ─────────────────────────────────────────────────────────────────
def p(style, text):
    return Paragraph(text, S[style])

def sp(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=G4,
                      spaceBefore=6, spaceAfter=6)

def bullets(items):
    return [Paragraph(f"\u2022  {t}", S["bullet"]) for t in items]

def nums(items):
    return [Paragraph(f"{i+1}.  {t}", S["num"]) for i, t in enumerate(items)]

def tbl(headers, rows, widths):
    data = [headers] + rows
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), P1),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, G5]),
        ("TEXTCOLOR", (0, 1), (-1, -1), G2),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, G4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(G3)
    canvas.drawCentredString(W / 2, 1.2 * cm,
        f"Black Belt Platform  |  Guia do Administrador Master  |  Pagina {doc.page}")
    canvas.restoreState()

# ── Cover ───────────────────────────────────────────────────────────────────
def cover():
    elems = []
    elems.append(sp(80))
    # Tag
    elems.append(p("cover_tag", "DOCUMENTO CONFIDENCIAL"))
    elems.append(sp(30))
    # Logo BB
    d = Drawing(80, 80)
    d.add(Rect(0, 0, 80, 80, fillColor=P1, strokeColor=None, rx=10, ry=10))
    d.add(String(14, 22, "BB", fontName="Helvetica-Bold", fontSize=40, fillColor=white))
    elems.append(d)
    elems.append(sp(24))
    elems.append(p("cover_title", "Guia do Administrador Master"))
    elems.append(sp(8))
    elems.append(p("cover_sub", "Black Belt Platform"))
    elems.append(sp(16))
    elems.append(p("body", "<para alignment='CENTER'>Manual completo para gestao da plataforma</para>"))
    elems.append(sp(40))
    elems.append(p("footer", "blackbeltconsultoria.com"))
    elems.append(PageBreak())
    return elems

# ── TOC ─────────────────────────────────────────────────────────────────────
TOC_ITEMS = [
    "Visao Geral e Hierarquia",
    "Primeiro Acesso",
    "Dashboard Administrativo",
    "Painel de Metricas (/admin/metrics)",
    "Gestao de Tenants",
    "Gestao de Assinaturas (/admin/subscriptions)",
    "Impersonacao",
    "Suporte (/admin/support)",
    "Audit Logs (/audit-logs)",
    "LGPD e DSR (/admin/dsr)",
    "Roles e Permissoes (/roles-permissions)",
    "Convites de Usuarios (/user-invites)",
    "Seguranca (2FA, Sessoes)",
    "Branding White-Label",
    "Variaveis de Ambiente",
    "Infraestrutura e Deploy",
    "Checklist Operacional Diario",
    "Referencia Rapida",
]

def toc():
    elems = []
    elems.append(p("h1", "Sumario"))
    elems.append(hr())
    for i, title in enumerate(TOC_ITEMS, 1):
        elems.append(p("toc", f"<b>{i}.</b>  {title}"))
    elems.append(PageBreak())
    return elems

# ── Sections ────────────────────────────────────────────────────────────────
def sec(n, title):
    return p("h1", f"{n}. {title}")

def section_01():
    e = [sec(1, "Visao Geral e Hierarquia"), hr()]
    e.append(p("body", "A Black Belt Platform utiliza uma hierarquia de tres niveis para organizar o acesso e as permissoes de todos os usuarios do sistema."))
    e.append(sp(4))
    e += bullets([
        "<b>Admin Master</b> — possui acesso total e irrestrito a todas as funcionalidades da plataforma.",
        "<b>Consultoria</b> — cliente pagante que gerencia suas proprias empresas e usuarios.",
        "<b>Empresa</b> — cliente final da consultoria, com acesso limitado a visualizacao.",
    ])
    e.append(sp(4))
    e.append(p("body", "O Admin Master bypassa automaticamente todas as verificacoes de RBAC (Role-Based Access Control), tendo acesso a qualquer recurso sem restricoes."))
    e.append(sp(6))
    e.append(tbl(
        ["Nivel", "Tipo", "Acesso", "Exemplo"],
        [
            ["Admin Master", "Dono da plataforma", "Acesso total", "ricardo@consultoriasst.com.br"],
            ["Consultoria", "Cliente pagante", "Gerir suas empresas", "consultoria@exemplo.com"],
            ["Empresa", "Cliente da consultoria", "Apenas visualizacao", "empresa@exemplo.com"],
        ],
        [3.2*cm, 3.8*cm, 4*cm, 5.5*cm],
    ))
    e.append(PageBreak())
    return e

def section_02():
    e = [sec(2, "Primeiro Acesso"), hr()]
    e.append(p("body", "Para acessar a plataforma como Administrador Master, siga os passos abaixo:"))
    e.append(sp(4))
    e.append(p("route", "URL: blackbeltconsultoria.com/login"))
    e.append(sp(4))
    e += nums([
        "Acesse a URL de login da plataforma.",
        "Insira as credenciais iniciais definidas durante o deploy.",
        "Apos o login, voce sera redirecionado para <b>/dashboard</b> com o painel administrativo completo.",
        "Recomendacao: ative a autenticacao em dois fatores (2FA) imediatamente apos o primeiro acesso.",
    ])
    e.append(sp(6))
    e.append(p("warn", "IMPORTANTE: Altere a senha padrao e ative o 2FA logo no primeiro acesso para garantir a seguranca da conta."))
    e.append(PageBreak())
    return e

def section_03():
    e = [sec(3, "Dashboard Administrativo"), hr()]
    e.append(p("body", "O dashboard administrativo apresenta uma visao consolidada de toda a plataforma, com metricas em tempo real e acoes rapidas."))
    e.append(sp(4))
    e.append(p("h2", "Cards de Metricas"))
    e += bullets([
        "Tenants — total de organizacoes cadastradas",
        "Usuarios — total de usuarios ativos",
        "Ativas — assinaturas ativas no momento",
        "Trial — assinaturas em periodo de teste",
        "Canceladas — assinaturas canceladas",
        "Receita/mes — MRR (Monthly Recurring Revenue)",
        "Tickets — tickets de suporte abertos",
        "Cancelamentos (30d) — cancelamentos nos ultimos 30 dias",
        "Trial para Pago — taxa de conversao",
        "Receita Anual — ARR (Annual Recurring Revenue)",
    ])
    e.append(sp(6))
    e.append(p("h2", "Abas Disponiveis"))
    e += bullets([
        "<b>Empresas</b> — tabela com CNPJ, status e plano de cada tenant.",
        "<b>Usuarios</b> — tabela com email, role e tenant de cada usuario.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Acoes Rapidas"))
    e += bullets([
        "<b>Impersonar</b> — acessar a plataforma como se fosse outro tenant.",
        "<b>Gerenciar Assinatura</b> — alterar plano, estender trial ou aplicar desconto.",
    ])
    e.append(PageBreak())
    return e

def section_04():
    e = [sec(4, "Painel de Metricas"), hr()]
    e.append(p("route", "Rota: /admin/metrics"))
    e.append(sp(4))
    e.append(p("body", "O painel de metricas fornece indicadores financeiros e operacionais em tempo real:"))
    e.append(sp(4))
    e += bullets([
        "<b>MRR</b> (Monthly Recurring Revenue) — receita recorrente mensal.",
        "<b>ARR</b> (Annual Recurring Revenue) — receita recorrente anual.",
        "<b>Taxa de churn</b> — percentual de cancelamentos nos ultimos 30 dias.",
        "<b>Conversao trial para pago</b> — percentual de trials convertidos.",
        "<b>Breakdown por plano</b> — distribuicao de receita entre Starter, Pro e Enterprise.",
    ])
    e.append(sp(6))
    e.append(p("note", "NOTA: Todas as metricas sao calculadas em tempo real a partir da tabela subscriptions no banco de dados."))
    e.append(PageBreak())
    return e

def section_05():
    e = [sec(5, "Gestao de Tenants"), hr()]
    e.append(p("route", "Rota: /admin/metrics (aba Empresas)"))
    e.append(sp(4))
    e.append(p("body", "O Admin Master pode criar, editar e remover tenants diretamente pela interface administrativa."))
    e.append(sp(4))
    e.append(p("h2", "Operacoes Disponiveis"))
    e += bullets([
        "<b>Criar tenant</b> — informar nome, CNPJ, endereco e contato.",
        "<b>Editar tenant</b> — alterar dados cadastrais e status (active/inactive/suspended).",
        "<b>Deletar tenant</b> — remocao permanente (registrada no audit log).",
    ])
    e.append(sp(6))
    e.append(tbl(
        ["Acao", "Rota", "Descricao"],
        [
            ["Criar", "/admin/metrics → Novo Tenant", "Cadastra nova organizacao"],
            ["Editar", "/admin/metrics → Editar", "Altera dados e status"],
            ["Deletar", "/admin/metrics → Excluir", "Remove permanentemente"],
        ],
        [2.5*cm, 5.5*cm, 8.5*cm],
    ))
    e.append(sp(6))
    e.append(p("warn", "IMPORTANTE: Ao criar um tenant via admin, nao e vinculado parentTenantId. Use a funcionalidade de companies no contexto da consultoria para vincular empresas-filhas."))
    e.append(PageBreak())
    return e

def section_06():
    e = [sec(6, "Gestao de Assinaturas"), hr()]
    e.append(p("route", "Rota: /admin/subscriptions"))
    e.append(sp(4))
    e.append(p("body", "O modulo de gestao de assinaturas permite ao Admin Master controlar planos e pagamentos sem depender de gateways externos."))
    e.append(sp(4))
    e.append(p("h2", "Funcionalidades"))
    e += bullets([
        "Ativar plano manualmente (sem Stripe/MercadoPago).",
        "Estender periodo de trial.",
        "Aplicar descontos personalizados.",
        "Forcar mudanca de plano (upgrade ou downgrade).",
    ])
    e.append(sp(6))
    e.append(p("h2", "Tabela de Planos"))
    e.append(tbl(
        ["Plano", "Preco Mensal", "Preco Anual", "Empresas", "Usuarios"],
        [
            ["Starter", "R$99", "R$999", "1", "5"],
            ["Pro", "R$399", "R$3.999", "10", "50/empresa"],
            ["Enterprise", "R$999", "R$9.999", "Ilimitado", "Ilimitado"],
        ],
        [2.8*cm, 2.8*cm, 2.8*cm, 2.8*cm, 3*cm],
    ))
    e.append(PageBreak())
    return e

def section_07():
    e = [sec(7, "Impersonacao"), hr()]
    e.append(p("body", "A funcionalidade de impersonacao permite que o Admin Master visualize a plataforma exatamente como outro tenant a enxerga. Isso e fundamental para suporte e debug."))
    e.append(sp(4))
    e.append(p("h2", "Como Usar"))
    e += nums([
        "Acesse o Dashboard Administrativo.",
        "Na lista de tenants, clique no botao <b>Impersonar</b>.",
        "A plataforma sera carregada com o contexto do tenant selecionado.",
        "Um <b>banner amarelo</b> sera exibido no topo indicando que a impersonacao esta ativa.",
        "Para encerrar, clique em <b>Sair da Impersonacao</b> no banner.",
    ])
    e.append(sp(6))
    e.append(p("warn", "ATENCAO: Todas as acoes realizadas durante a impersonacao sao registradas no audit log com a identificacao do Admin Master."))
    e.append(PageBreak())
    return e

def section_08():
    e = [sec(8, "Suporte"), hr()]
    e.append(p("route", "Rota: /admin/support"))
    e.append(sp(4))
    e.append(p("body", "O modulo de suporte centraliza todos os tickets de todos os tenants da plataforma, permitindo ao Admin Master gerenciar e responder solicitacoes."))
    e.append(sp(4))
    e.append(p("h2", "Funcionalidades"))
    e += bullets([
        "Visualizar todos os tickets de todos os tenants.",
        "Filtrar por status: <b>aberto</b>, <b>em andamento</b>, <b>resolvido</b>, <b>fechado</b>.",
        "Enviar mensagens internas (visiveis apenas para admins).",
        "Enviar mensagens externas (visiveis para o cliente).",
        "Alterar prioridade e status dos tickets.",
    ])
    e.append(PageBreak())
    return e

def section_09():
    e = [sec(9, "Audit Logs"), hr()]
    e.append(p("route", "Rota: /audit-logs"))
    e.append(sp(4))
    e.append(p("body", "Os audit logs registram todas as acoes realizadas na plataforma, sendo essenciais para compliance e investigacao de incidentes."))
    e.append(sp(4))
    e.append(p("h2", "Acoes Registradas"))
    e += bullets([
        "<b>CREATE</b> — criacao de registros.",
        "<b>UPDATE</b> — atualizacao de dados.",
        "<b>DELETE</b> — remocao de registros.",
        "<b>READ</b> — leitura de dados sensiveis.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Campos do Log"))
    e += bullets([
        "Usuario que executou a acao.",
        "Tipo de acao (CREATE, UPDATE, DELETE, READ).",
        "Entidade afetada.",
        "Valores antigos e novos (para UPDATE).",
        "Endereco IP e User-Agent.",
        "Timestamp da acao.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Filtros Disponiveis"))
    e += bullets([
        "Por tenant.",
        "Por usuario.",
        "Por tipo de entidade.",
        "Por periodo (data inicio e fim).",
    ])
    e.append(sp(6))
    e.append(p("note", "NOTA: Os audit logs sao fundamentais para compliance regulatoria e investigacao de incidentes de seguranca."))
    e.append(PageBreak())
    return e

def section_10():
    e = [sec(10, "LGPD e DSR"), hr()]
    e.append(p("route", "Rota: /admin/dsr"))
    e.append(sp(4))
    e.append(p("body", "O modulo de LGPD permite ao Admin Master processar requisicoes de titulares de dados (DSR — Data Subject Request) em conformidade com a Lei 13.709/2018."))
    e.append(sp(4))
    e.append(p("h2", "Funcionalidades"))
    e += bullets([
        "Processar requisicoes de titulares: <b>exportar</b>, <b>deletar</b>, <b>retificar</b> dados.",
        "Registrar DSR com prazo legal de 15 dias uteis.",
        "Exportar dados do titular em formato JSON.",
        "Deletar dados com anonimizacao de respostas COPSOQ.",
    ])
    e.append(sp(6))
    e.append(p("note", "NOTA: O processamento de DSRs e obrigatorio pela Lei 13.709/2018 (LGPD). O descumprimento pode resultar em multas de ate 2% do faturamento."))
    e.append(PageBreak())
    return e

def section_11():
    e = [sec(11, "Roles e Permissoes"), hr()]
    e.append(p("route", "Rota: /roles-permissions"))
    e.append(sp(4))
    e.append(p("body", "O sistema de controle de acesso da plataforma utiliza RBAC (Role-Based Access Control) com 6 roles pre-definidas e mais de 20 permissoes granulares."))
    e.append(sp(4))
    e.append(p("h2", "Roles Disponiveis"))
    e.append(tbl(
        ["Role", "Descricao", "Nivel"],
        [
            ["admin", "Administrador Master da plataforma", "Global"],
            ["consultant", "Consultor responsavel por empresas", "Tenant"],
            ["manager", "Gerente de consultoria", "Tenant"],
            ["company_admin", "Administrador da empresa-cliente", "Empresa"],
            ["analyst", "Analista com acesso a relatorios", "Empresa"],
            ["viewer", "Visualizador somente leitura", "Empresa"],
        ],
        [3*cm, 7*cm, 3*cm],
    ))
    e.append(sp(6))
    e.append(p("h2", "Permissoes"))
    e.append(p("body", "As 20+ permissoes cobrem os seguintes recursos: companies, people, assessments, reports, subscriptions, invites, roles, audit_logs, dsr, branding, tickets e metrics."))
    e.append(sp(4))
    e.append(p("warn", "IMPORTANTE: O Admin Master bypassa automaticamente todas as verificacoes de RBAC. Nenhuma permissao precisa ser atribuida explicitamente ao admin."))
    e.append(PageBreak())
    return e

def section_12():
    e = [sec(12, "Convites de Usuarios"), hr()]
    e.append(p("route", "Rota: /user-invites"))
    e.append(sp(4))
    e.append(p("body", "O sistema de convites permite adicionar novos usuarios a plataforma de forma segura e controlada."))
    e.append(sp(4))
    e.append(p("h2", "Regras de Convite por Nivel"))
    e += bullets([
        "<b>Admin Master</b> — pode convidar para QUALQUER tenant.",
        "<b>Consultor</b> — pode convidar para o proprio tenant ou empresas-filhas.",
        "<b>Empresa</b> — NAO pode convidar usuarios.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Fluxo de Convite"))
    e += nums([
        "Acesse /user-invites e clique em <b>Novo Convite</b>.",
        "Selecione o tenant de destino e a role do usuario.",
        "Copie o link gerado e envie ao usuario.",
        "O usuario acessa o link e cria sua conta.",
    ])
    e.append(sp(4))
    e.append(p("note", "NOTA: Os convites expiram em 7 dias por padrao. Este prazo e configuravel nas configuracoes da plataforma."))
    e.append(PageBreak())
    return e

def section_13():
    e = [sec(13, "Seguranca"), hr()]
    e.append(p("body", "A plataforma implementa multiplas camadas de seguranca para proteger os dados e acessos de todos os usuarios."))
    e.append(sp(4))
    e.append(p("h2", "Autenticacao em Dois Fatores (2FA)"))
    e += bullets([
        "Suporte a TOTP (Time-based One-Time Password).",
        "Compativel com Google Authenticator e Authy.",
        "Ativacao recomendada para todos os administradores.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Gestao de Sessoes"))
    e += bullets([
        "Listar todas as sessoes ativas.",
        "Revogar sessoes individualmente.",
        "Timeout automatico por inatividade.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Protecoes Implementadas"))
    e += bullets([
        "<b>Senhas</b> — hash com bcrypt (12 rounds).",
        "<b>Cookies</b> — HMAC-signed, HttpOnly, SameSite.",
        "<b>Rate limiting</b> — protecao contra brute force.",
        "<b>CORS</b> — configurado por dominio autorizado.",
        "<b>Body size limit</b> — 2MB para prevenir ataques de payload.",
    ])
    e.append(PageBreak())
    return e

def section_14():
    e = [sec(14, "Branding White-Label"), hr()]
    e.append(p("route", "Rota: /branding-settings"))
    e.append(sp(4))
    e.append(p("body", "O modulo de branding permite que consultorias personalizem a aparencia da plataforma com sua propria marca."))
    e.append(sp(4))
    e.append(p("h2", "Opcoes de Personalizacao"))
    e += bullets([
        "Logo da empresa.",
        "Favicon.",
        "Cores primaria e secundaria.",
        "Nome do remetente de email.",
        "Dominio customizado (somente plano Enterprise).",
    ])
    e.append(sp(6))
    e.append(p("note", "NOTA: A funcionalidade de dominio customizado esta disponivel apenas no plano Enterprise."))
    e.append(PageBreak())
    return e

def section_15():
    e = [sec(15, "Variaveis de Ambiente"), hr()]
    e.append(p("body", "As variaveis de ambiente configuram os servicos externos e parametros criticos da plataforma. Elas devem ser definidas no arquivo <b>.env</b> na raiz do projeto."))
    e.append(sp(6))
    e.append(tbl(
        ["Variavel", "Descricao", "Exemplo"],
        [
            ["DATABASE_URL", "String de conexao MySQL", "mysql://user:pass@host:3306/db"],
            ["SESSION_SECRET", "Chave para assinar cookies", "(string aleatoria longa)"],
            ["STRIPE_SECRET_KEY", "Chave secreta do Stripe", "sk_test_..."],
            ["MERCADOPAGO_TOKEN", "Token do MercadoPago", "(token)"],
            ["SMTP_HOST", "Servidor SMTP", "smtp-relay.brevo.com"],
            ["SMTP_USER", "Usuario SMTP", "user@brevo.com"],
            ["SMTP_PASS", "Senha SMTP", "(senha)"],
            ["SENTRY_DSN", "DSN do Sentry para monitoramento", "https://...@sentry.io/..."],
            ["VITE_APP_URL", "URL publica da aplicacao", "https://blackbeltconsultoria.com"],
        ],
        [4*cm, 5.5*cm, 5.5*cm],
    ))
    e.append(sp(6))
    e.append(p("warn", "ATENCAO: Nunca compartilhe ou commite o arquivo .env em repositorios publicos. Ele contem credenciais sensiveis."))
    e.append(PageBreak())
    return e

def section_16():
    e = [sec(16, "Infraestrutura e Deploy"), hr()]
    e.append(p("body", "A Black Belt Platform e hospedada em infraestrutura cloud com deploy automatizado."))
    e.append(sp(4))
    e.append(p("h2", "Stack de Infraestrutura"))
    e += bullets([
        "<b>Hospedagem:</b> DigitalOcean Droplet (Ubuntu 24.04).",
        "<b>Containers:</b> Docker Compose (backend + MySQL).",
        "<b>SSL:</b> Let's Encrypt com renovacao automatica via certbot.",
        "<b>DNS:</b> Cloudflare (A records apontando para o Droplet).",
        "<b>Caminho no servidor:</b> /opt/blackbelt/",
    ])
    e.append(sp(4))
    e.append(p("h2", "Metodos de Deploy"))
    e += bullets([
        "<b>GitHub Actions</b> — deploy automatico via workflow deploy-production.yml.",
        "<b>SSH manual</b> — acesso ao servidor e execucao de docker compose up --build -d.",
    ])
    e.append(sp(4))
    e.append(p("h2", "Comandos Uteis"))
    e.append(p("route", "ssh root@IP_DO_SERVIDOR"))
    e.append(p("route", "cd /opt/blackbelt && docker compose up --build -d"))
    e.append(p("route", "docker compose logs -f"))
    e.append(PageBreak())
    return e

def section_17():
    e = [sec(17, "Checklist Operacional Diario"), hr()]
    e.append(p("body", "Execute este checklist diariamente para garantir o bom funcionamento da plataforma:"))
    e.append(sp(6))
    e += nums([
        "Verificar metricas no dashboard admin (/admin/metrics).",
        "Revisar tickets de suporte abertos (/admin/support).",
        "Verificar novos trials iniciados.",
        "Monitorar churn rate (taxa de cancelamento).",
        "Verificar audit logs para anomalias (/audit-logs).",
        "Processar DSRs pendentes — LGPD (/admin/dsr).",
        "Verificar status do servidor (uptime e recursos).",
    ])
    e.append(sp(6))
    e.append(p("note", "NOTA: Este checklist garante que problemas sejam identificados e resolvidos rapidamente, mantendo a qualidade do servico."))
    e.append(PageBreak())
    return e

def section_18():
    e = [sec(18, "Referencia Rapida"), hr()]
    e.append(p("body", "Tabela de referencia rapida com as principais funcionalidades e suas rotas:"))
    e.append(sp(6))
    e.append(tbl(
        ["Funcao", "Rota", "Atalho"],
        [
            ["Dashboard Admin", "/admin/metrics", "-"],
            ["Assinaturas", "/admin/subscriptions", "-"],
            ["Suporte", "/admin/support", "-"],
            ["DSR/LGPD", "/admin/dsr", "-"],
            ["Audit Logs", "/audit-logs", "-"],
            ["Roles", "/roles-permissions", "-"],
            ["Convites", "/user-invites", "-"],
            ["Seguranca", "/security-dashboard", "-"],
            ["Branding", "/branding-settings", "-"],
        ],
        [4*cm, 5.5*cm, 3*cm],
    ))
    e.append(PageBreak())
    return e

# ── Footer page ─────────────────────────────────────────────────────────────
def footer_page():
    e = []
    e.append(sp(180))
    # Logo
    d = Drawing(60, 60)
    d.add(Rect(0, 0, 60, 60, fillColor=P1, strokeColor=None, rx=8, ry=8))
    d.add(String(10, 16, "BB", fontName="Helvetica-Bold", fontSize=30, fillColor=white))
    e.append(d)
    e.append(sp(16))
    e.append(p("cover_title", "Black Belt Platform"))
    e.append(sp(12))
    e.append(p("cover_sub", "blackbeltconsultoria.com"))
    e.append(sp(6))
    e.append(p("cover_sub", "contato@blackbeltconsultoria.com"))
    e.append(sp(24))
    e.append(hr())
    e.append(p("footer", "Copyright 2024-2026 Black Belt Consultoria. Todos os direitos reservados."))
    e.append(sp(4))
    e.append(p("footer", "Este documento e confidencial e destinado exclusivamente ao Administrador Master."))
    return e

# ── Build ───────────────────────────────────────────────────────────────────
def build():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "GUIA_ADMIN_MASTER.pdf")
    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2.5*cm,
    )

    elems = []
    elems += cover()
    elems += toc()
    elems += section_01()
    elems += section_02()
    elems += section_03()
    elems += section_04()
    elems += section_05()
    elems += section_06()
    elems += section_07()
    elems += section_08()
    elems += section_09()
    elems += section_10()
    elems += section_11()
    elems += section_12()
    elems += section_13()
    elems += section_14()
    elems += section_15()
    elems += section_16()
    elems += section_17()
    elems += section_18()
    elems += footer_page()

    doc.build(elems, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"PDF gerado: {out}")

if __name__ == "__main__":
    build()
