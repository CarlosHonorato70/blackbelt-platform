"""
Gera GUIA_CONSULTORIA.pdf — Manual completo para consultores SST
Black Belt Platform
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, ListFlowable, ListItem,
)
from reportlab.lib import colors
import os

# ── colours ──────────────────────────────────────────────────────────
P1 = HexColor("#4C1D95")   # purple dark
P2 = HexColor("#7C3AED")   # purple medium
P3 = HexColor("#EDE9FE")   # purple light
G1 = HexColor("#111827")   # gray 900
G2 = HexColor("#374151")   # gray 700
G3 = HexColor("#6B7280")   # gray 500
G4 = HexColor("#D1D5DB")   # gray 300
G5 = HexColor("#F3F4F6")   # gray 100
W  = colors.white
GREEN = HexColor("#059669")
RED   = HexColor("#DC2626")
AMBER = HexColor("#D97706")
BLUE  = HexColor("#2563EB")

# ── styles ───────────────────────────────────────────────────────────
cover_title = ParagraphStyle("cover_title", fontName="Helvetica-Bold",
    fontSize=32, leading=38, textColor=P1, alignment=TA_CENTER)
cover_sub = ParagraphStyle("cover_sub", fontName="Helvetica",
    fontSize=16, leading=22, textColor=G2, alignment=TA_CENTER)
cover_tag = ParagraphStyle("cover_tag", fontName="Helvetica-Bold",
    fontSize=11, leading=14, textColor=P2, alignment=TA_CENTER)
h1 = ParagraphStyle("h1", fontName="Helvetica-Bold",
    fontSize=22, leading=28, textColor=P1, spaceBefore=24, spaceAfter=10)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold",
    fontSize=16, leading=21, textColor=P2, spaceBefore=18, spaceAfter=6)
h3 = ParagraphStyle("h3", fontName="Helvetica-Bold",
    fontSize=13, leading=17, textColor=G1, spaceBefore=12, spaceAfter=4)
body = ParagraphStyle("body", fontName="Helvetica",
    fontSize=11, leading=16, textColor=G2, alignment=TA_JUSTIFY)
body_bold = ParagraphStyle("body_bold", fontName="Helvetica-Bold",
    fontSize=11, leading=16, textColor=G1, alignment=TA_JUSTIFY)
bullet = ParagraphStyle("bullet", fontName="Helvetica",
    fontSize=11, leading=16, textColor=G2, leftIndent=18, bulletIndent=6,
    spaceBefore=2, spaceAfter=2)
num = ParagraphStyle("num", fontName="Helvetica",
    fontSize=11, leading=16, textColor=G2, leftIndent=22, bulletIndent=6,
    spaceBefore=2, spaceAfter=2)
route = ParagraphStyle("route", fontName="Courier",
    fontSize=10, leading=14, textColor=BLUE, backColor=G5,
    leftIndent=10, spaceBefore=4, spaceAfter=4, borderPadding=4)
note = ParagraphStyle("note", fontName="Helvetica-Oblique",
    fontSize=10, leading=14, textColor=GREEN, backColor=HexColor("#ECFDF5"),
    leftIndent=10, borderPadding=6, spaceBefore=6, spaceAfter=6)
warn = ParagraphStyle("warn", fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=RED, backColor=HexColor("#FEF2F2"),
    leftIndent=10, borderPadding=6, spaceBefore=6, spaceAfter=6)
footer_style = ParagraphStyle("footer", fontName="Helvetica",
    fontSize=8, leading=10, textColor=G3, alignment=TA_CENTER)
toc_style = ParagraphStyle("toc", fontName="Helvetica",
    fontSize=12, leading=20, textColor=G2, leftIndent=10)

# ── helpers ──────────────────────────────────────────────────────────
def p(style, text):
    return Paragraph(text, style)

def sp(h=0.3):
    return Spacer(1, h * cm)

def hr():
    return HRFlowable(width="100%", thickness=1, color=G4,
                      spaceBefore=6, spaceAfter=6)

def bullets(items):
    result = []
    for item in items:
        result.append(Paragraph(f"<bullet>&bull;</bullet> {item}", bullet))
    return result

def nums(items):
    result = []
    for i, item in enumerate(items, 1):
        result.append(Paragraph(f"<bullet>{i}.</bullet> {item}", num))
    return result

def tbl(headers, rows, widths):
    data = [headers] + rows
    t = Table(data, colWidths=[w * cm for w in widths], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), P1),
        ("TEXTCOLOR", (0, 0), (-1, 0), W),
        ("FONTNAME",  (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (-1, 0), 10),
        ("FONTNAME",  (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",  (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), G2),
        ("BACKGROUND",(0, 1), (-1, -1), W),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [W, G5]),
        ("ALIGN",     (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",      (0, 0), (-1, -1), 0.5, G4),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    return t

def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(G3)
    canvas.drawCentredString(A4[0] / 2, 1.2 * cm,
        f"Black Belt Platform  |  blackbeltconsultoria.com  |  Pagina {doc.page}")
    canvas.restoreState()

# ── build ────────────────────────────────────────────────────────────
def build():
    dir_path = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(dir_path, "GUIA_CONSULTORIA.pdf")
    doc = SimpleDocTemplate(out, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2.5*cm)
    S = []

    # ── COVER ────────────────────────────────────────────────────────
    S.append(sp(3))
    S.append(p(cover_tag, "GUIA DE UTILIZACAO"))
    S.append(sp(1))

    # logo BB
    logo_data = [["BB"]]
    logo_t = Table(logo_data, colWidths=[3*cm], rowHeights=[1.5*cm])
    logo_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), P1),
        ("TEXTCOLOR", (0, 0), (0, 0), W),
        ("FONTNAME",  (0, 0), (0, 0), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (0, 0), 28),
        ("ALIGN",     (0, 0), (0, 0), "CENTER"),
        ("VALIGN",    (0, 0), (0, 0), "MIDDLE"),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    logo_wrapper = Table([[logo_t]], colWidths=[A4[0] - 4*cm])
    logo_wrapper.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
    ]))
    S.append(logo_wrapper)
    S.append(sp(1))

    S.append(p(cover_title, "Guia da Consultoria"))
    S.append(sp(0.3))
    S.append(p(cover_sub, "Black Belt Platform"))
    S.append(sp(0.8))
    S.append(hr())
    S.append(sp(0.3))
    S.append(p(body, '<para alignment="center">Manual completo para consultores SST</para>'))
    S.append(sp(0.3))
    S.append(p(note, '<para alignment="center">Gestao de Riscos Psicossociais e Compliance NR-01</para>'))
    S.append(sp(2))
    S.append(p(cover_sub, "blackbeltconsultoria.com"))
    S.append(PageBreak())

    # ── TOC ──────────────────────────────────────────────────────────
    S.append(p(h1, "Indice"))
    S.append(hr())
    toc_items = [
        "1. Introducao e Registro",
        "2. Planos e Assinatura",
        "3. Dashboard e Onboarding",
        "4. Gestao de Empresas-Clientes",
        "5. Convidar Usuarios para Empresas",
        "6. Setores e Organograma",
        "7. Cadastro de Colaboradores",
        "8. Avaliacoes COPSOQ-II",
        "9. Analise de Resultados",
        "10. Planos de Acao",
        "11. Conformidade NR-01",
        "12. Entregaveis e Relatorios",
        "13. Modulo Comercial",
        "14. Seguranca da Conta",
        "15. Suporte",
    ]
    for item in toc_items:
        S.append(p(toc_style, item))
    S.append(PageBreak())

    # ── 1. INTRODUCAO E REGISTRO ─────────────────────────────────────
    S.append(p(h1, "1. Introducao e Registro"))
    S.append(hr())
    S.append(p(body, "A Black Belt Platform e uma solucao completa para consultores SST que precisam gerenciar riscos psicossociais e garantir a conformidade com a NR-01."))
    S.append(sp(0.3))
    S.append(p(body, "O consultor e o nivel 2 da hierarquia da plataforma, posicionado abaixo do administrador e acima das empresas-clientes. Isso significa que voce tem controle total sobre as empresas que cadastra e gerencia."))
    S.append(sp(0.3))

    S.append(p(h2, "Fluxo de Registro"))
    S.extend(nums([
        "Acesse <b>blackbeltconsultoria.com</b>",
        'Clique em <b>"Teste Gratis por 14 Dias"</b> ou <b>"Criar Conta"</b>',
        "Preencha nome, email e senha",
        "Confirme seu email (link enviado automaticamente)",
        "Escolha um plano na tela de pricing",
    ]))
    S.append(sp(0.3))
    S.append(p(note, "Nota: Voce tera 14 dias de trial gratuito em qualquer plano."))
    S.append(PageBreak())

    # ── 2. PLANOS E ASSINATURA ───────────────────────────────────────
    S.append(p(h1, "2. Planos e Assinatura"))
    S.append(hr())
    S.append(p(route, "/subscription/pricing"))
    S.append(sp(0.3))
    S.append(p(body, "A plataforma oferece tres planos para atender consultorias de todos os tamanhos:"))
    S.append(sp(0.3))

    S.append(tbl(
        ["Plano", "Preco/mes", "Empresas", "Usuarios", "Destaques"],
        [
            ["Starter",    "R$99",  "1",        "5",          "Avaliacoes ilimitadas, Relatorios basicos, Export PDF/Excel"],
            ["Pro",         "R$399", "10",       "50/empresa", "Relatorios avancados, API, Suporte prioritario, SLA 99%"],
            ["Enterprise",  "R$999", "Ilimitado","Ilimitado",  "White-label, SSO, Gerente dedicado, SLA 99.9%"],
        ],
        [2.5, 2.2, 2.2, 2.2, 7.5],
    ))
    S.append(sp(0.5))
    S.extend(bullets([
        "Pagamento via Stripe ou Mercado Pago",
        "Trial gratuito de 14 dias sem cartao de credito",
    ]))
    S.append(sp(0.3))
    S.append(p(h3, "Rota de Checkout"))
    S.append(p(route, "/subscription/checkout"))
    S.append(PageBreak())

    # ── 3. DASHBOARD E ONBOARDING ────────────────────────────────────
    S.append(p(h1, "3. Dashboard e Onboarding"))
    S.append(hr())
    S.append(p(route, "/dashboard"))
    S.append(sp(0.3))
    S.append(p(body, "Apos o primeiro login, o sistema exibe um guia de onboarding passo a passo que orienta voce nas principais funcionalidades da plataforma."))
    S.append(sp(0.3))

    S.append(p(h2, "Cards Principais"))
    S.extend(bullets([
        "Empresas cadastradas",
        "Avaliacoes ativas",
        "Colaboradores totais",
        "Proximos prazos",
    ]))
    S.append(sp(0.3))
    S.append(p(body, "O menu lateral fornece acesso a todas as funcionalidades da plataforma de forma organizada."))
    S.append(sp(0.3))
    S.append(p(h3, "Rota do Onboarding"))
    S.append(p(route, "/guided-workflow"))
    S.append(PageBreak())

    # ── 4. GESTAO DE EMPRESAS-CLIENTES ───────────────────────────────
    S.append(p(h1, "4. Gestao de Empresas-Clientes"))
    S.append(hr())
    S.append(p(route, "/companies"))
    S.append(sp(0.3))
    S.append(p(body, "Voce cria e gerencia as empresas que sao seus clientes. Cada empresa criada fica vinculada a sua consultoria atraves do campo parentTenantId, garantindo isolamento de dados."))
    S.append(sp(0.3))

    S.append(p(h2, "Fluxo de Criacao"))
    S.extend(nums([
        'Acesse <b>"Empresas"</b> no menu lateral',
        'Clique <b>"Nova Empresa"</b>',
        "Preencha: Nome, CNPJ (14 digitos), Endereco, Contato",
        "A empresa e criada automaticamente com:",
    ]))
    S.append(sp(0.2))
    S.extend(bullets([
        "Checklist NR-01 (23 requisitos)",
        "Milestones de conformidade (11 marcos)",
    ]))
    S.append(sp(0.3))
    S.append(p(body, "Voce pode editar ou excluir empresas a qualquer momento."))
    S.append(sp(0.3))
    S.append(p(note, "Nota: O CNPJ deve ser valido (verificacao de digitos)."))
    S.append(PageBreak())

    # ── 5. CONVIDAR USUARIOS ─────────────────────────────────────────
    S.append(p(h1, "5. Convidar Usuarios para Empresas"))
    S.append(hr())
    S.append(p(route, "/user-invites"))
    S.append(sp(0.3))
    S.append(p(body, "Apos criar a empresa, voce precisa convidar usuarios para ela. O sistema de convites permite que voce adicione administradores, analistas e visualizadores."))
    S.append(sp(0.3))

    S.append(p(h2, "Fluxo de Convite"))
    S.extend(nums([
        'Acesse <b>"Convites"</b> no menu lateral',
        'Clique <b>"Novo Convite"</b>',
        "Preencha: Email do usuario, Role (company_admin, analyst, viewer), Tenant (empresa-alvo)",
        "Copie o link de convite gerado",
        "Envie o link ao usuario (email, WhatsApp, etc.)",
        "O usuario acessa o link, cria sua conta e fica vinculado a empresa",
    ]))
    S.append(sp(0.3))
    S.extend(bullets([
        "Voce pode convidar para seu proprio tenant ou para qualquer empresa-filha",
        "Convites expiram em 7 dias (voce pode reenviar)",
    ]))
    S.append(sp(0.3))

    S.append(p(h2, "Roles Disponiveis"))
    S.append(tbl(
        ["Role", "Descricao", "Acesso"],
        [
            ["company_admin", "Administrador da empresa", "Dashboards, relatorios, pessoas"],
            ["analyst",       "Analista",                 "Visualizar dados e relatorios"],
            ["viewer",        "Visualizador",             "Apenas leitura"],
        ],
        [3.5, 4.5, 8.5],
    ))
    S.append(PageBreak())

    # ── 6. SETORES E ORGANOGRAMA ─────────────────────────────────────
    S.append(p(h1, "6. Setores e Organograma"))
    S.append(hr())
    S.append(p(route, "/sectors"))
    S.append(sp(0.3))
    S.append(p(body, "Os setores organizam a estrutura da empresa e sao fundamentais para a segmentacao das avaliacoes COPSOQ-II."))
    S.append(sp(0.3))

    S.append(p(h2, "Criando Setores"))
    S.extend(bullets([
        "Exemplos: Administrativo, Operacional, Comercial, TI, RH",
        "Cada setor tem: nome, responsavel, unidade, turno",
        "Os setores organizam os colaboradores e as avaliacoes",
    ]))
    S.append(sp(0.3))
    S.append(p(warn, "Importante: Crie os setores ANTES de cadastrar colaboradores."))
    S.append(PageBreak())

    # ── 7. CADASTRO DE COLABORADORES ─────────────────────────────────
    S.append(p(h1, "7. Cadastro de Colaboradores"))
    S.append(hr())
    S.append(p(route, "/people"))
    S.append(sp(0.3))
    S.append(p(body, "Adicione colaboradores a cada setor para que eles possam participar das avaliacoes COPSOQ-II."))
    S.append(sp(0.3))

    S.append(p(h2, "Campos do Cadastro"))
    S.extend(bullets([
        "Nome completo",
        "Email corporativo",
        "Cargo",
        "Setor (selecionar entre os setores criados)",
    ]))
    S.append(sp(0.3))
    S.extend(bullets([
        "Import em massa (futuro)",
        "Cada colaborador podera receber convite COPSOQ individual",
    ]))
    S.append(PageBreak())

    # ── 8. AVALIACOES COPSOQ-II ──────────────────────────────────────
    S.append(p(h1, "8. Avaliacoes COPSOQ-II"))
    S.append(hr())
    S.append(p(body, "O COPSOQ-II (Copenhagen Psychosocial Questionnaire) e um questionario padronizado internacionalmente com 76 questoes que mede 12 dimensoes de risco psicossocial no trabalho."))
    S.append(sp(0.3))

    S.append(p(h2, "Fluxo Completo"))
    S.extend(nums([
        "Criar avaliacao: titulo, empresa, setor",
    ]))
    S.append(p(route, "/copsoq"))
    S.extend(nums([
        "Enviar convites: email dos colaboradores",
    ]))
    S.append(p(route, "/copsoq/invites"))
    S.extend(nums([
        "Cada colaborador recebe um link unico",
        "Resposta anonima (sem identificacao do respondente)",
        "Acompanhar: taxa de resposta em tempo real",
    ]))
    S.append(p(route, "/copsoq/tracking"))
    S.append(sp(0.3))
    S.append(p(note, "Nota: Minimo 3 respostas para gerar analytics (anonimizacao)."))
    S.append(sp(0.5))

    S.append(p(h2, "Dimensoes Avaliadas"))
    S.append(tbl(
        ["Dimensao", "O que mede"],
        [
            ["Exigencias quantitativas",      "Volume e ritmo de trabalho"],
            ["Exigencias emocionais",          "Exposicao a situacoes emocionais"],
            ["Influencia no trabalho",         "Autonomia e participacao"],
            ["Possibilidades de desenvolvimento","Crescimento profissional"],
            ["Significado do trabalho",        "Proposito e motivacao"],
            ["Compromisso",                    "Engajamento organizacional"],
            ["Previsibilidade",                "Clareza de expectativas"],
            ["Transparencia de papel",         "Definicao de responsabilidades"],
            ["Recompensas",                    "Reconhecimento"],
            ["Conflitos de papel",             "Demandas conflitantes"],
            ["Apoio social",                   "Suporte de colegas e gestores"],
            ["Comunidade social",              "Qualidade das relacoes"],
        ],
        [6, 10.5],
    ))
    S.append(PageBreak())

    # ── 9. ANALISE DE RESULTADOS ─────────────────────────────────────
    S.append(p(h1, "9. Analise de Resultados"))
    S.append(hr())
    S.append(p(body, "A plataforma oferece diversas ferramentas de analise para interpretar os resultados das avaliacoes COPSOQ-II."))
    S.append(sp(0.3))

    S.append(p(h2, "Analytics COPSOQ"))
    S.append(p(route, "/copsoq/analytics"))
    S.append(p(body, "Scores por dimensao, radar chart e tendencias temporais."))
    S.append(sp(0.3))

    S.append(p(h2, "Dashboard Psicossocial"))
    S.append(p(route, "/psychosocial-dashboard"))
    S.append(p(body, "Visao das 12 dimensoes com semaforo (verde/amarelo/vermelho) indicando o nivel de risco."))
    S.append(sp(0.3))

    S.append(p(h2, "Matriz de Risco"))
    S.append(p(route, "/risk-matrix"))
    S.append(p(body, "Cruzamento de Probabilidade x Severidade para priorizacao de intervencoes."))
    S.append(sp(0.3))

    S.append(p(h2, "Benchmark Setorial"))
    S.append(p(route, "/benchmark"))
    S.append(p(body, "Comparacao dos resultados com medias do setor economico (CNAE)."))
    S.append(sp(0.3))

    S.append(p(h2, "Analise IA"))
    S.append(p(body, "Geracao automatica de insights e recomendacoes baseadas nos dados coletados."))
    S.append(sp(0.3))

    S.append(p(h2, "Tendencias"))
    S.append(p(route, "/assessment-trends"))
    S.append(p(body, "Evolucao dos indicadores ao longo do tempo, permitindo acompanhar a eficacia das intervencoes."))
    S.append(PageBreak())

    # ── 10. PLANOS DE ACAO ───────────────────────────────────────────
    S.append(p(h1, "10. Planos de Acao"))
    S.append(hr())
    S.append(p(route, "/action-plans"))
    S.append(sp(0.3))
    S.append(p(body, "A IA da plataforma sugere intervencoes baseadas nos resultados COPSOQ, facilitando a criacao de planos de acao eficazes."))
    S.append(sp(0.3))

    S.append(p(h2, "Cada Acao Contem"))
    S.extend(bullets([
        "Risco identificado",
        "Controle proposto",
        "Prioridade (alta, media, baixa)",
        "Prazo de implementacao",
        "KPI de acompanhamento",
        "Responsavel pela execucao",
    ]))
    S.append(sp(0.3))

    S.append(p(h2, "Acompanhamento"))
    S.extend(bullets([
        "Cronograma mensal de implementacao",
        "Status: pendente, em andamento, concluido",
        "Historico de alteracoes",
    ]))
    S.append(PageBreak())

    # ── 11. CONFORMIDADE NR-01 ───────────────────────────────────────
    S.append(p(h1, "11. Conformidade NR-01"))
    S.append(hr())
    S.append(p(body, "A plataforma automatiza o acompanhamento da conformidade com a NR-01, garantindo que todas as exigencias regulatorias sejam atendidas."))
    S.append(sp(0.3))

    S.append(p(h2, "Checklist de Requisitos"))
    S.append(p(route, "/compliance-checklist"))
    S.append(p(body, "23 requisitos obrigatorios com status individual de conformidade."))
    S.append(sp(0.3))

    S.append(p(h2, "Timeline de Prazos"))
    S.append(p(route, "/compliance-timeline"))
    S.append(p(body, "Visualizacao temporal dos prazos e marcos de conformidade."))
    S.append(sp(0.3))

    S.append(p(h2, "Milestones"))
    S.append(p(body, "11 marcos automaticos criados ao cadastrar cada empresa, cobrindo todo o ciclo de conformidade."))
    S.append(sp(0.3))

    S.append(p(h2, "Certificado de Conformidade"))
    S.append(p(route, "/compliance-certificate"))
    S.append(p(body, "Emita certificados de conformidade para seus clientes apos atender todos os requisitos."))
    S.append(sp(0.3))
    S.append(p(note, "Nota: Portaria MTE n. 1.419/2024 exige avaliacao de riscos psicossociais."))
    S.append(PageBreak())

    # ── 12. ENTREGAVEIS E RELATORIOS ─────────────────────────────────
    S.append(p(h1, "12. Entregaveis e Relatorios"))
    S.append(hr())
    S.append(p(body, "A plataforma gera diversos documentos profissionais que podem ser entregues aos seus clientes."))
    S.append(sp(0.3))

    S.append(p(h2, "Laudo Tecnico"))
    S.append(p(route, "/laudo-tecnico"))
    S.append(p(body, "Documento formal de avaliacao com todos os dados coletados e analises realizadas."))
    S.append(sp(0.3))

    S.append(p(h2, "Inventario de Riscos"))
    S.append(p(body, "PDF com tabela detalhada contendo: codigo, perigo, risco, severidade e probabilidade."))
    S.append(sp(0.3))

    S.append(p(h2, "Relatorio de Compliance"))
    S.append(p(body, "PDF com status de conformidade de cada requisito da NR-01."))
    S.append(sp(0.3))

    S.append(p(h2, "Exportacao de Dados"))
    S.append(p(route, "/data-export"))
    S.append(p(body, "Exporte dados em formatos CSV e JSON para analises externas."))
    S.append(sp(0.3))

    S.append(p(note, "Nota: Todos os PDFs podem ser baixados ou enviados por email diretamente pela plataforma."))
    S.append(PageBreak())

    # ── 13. MODULO COMERCIAL ─────────────────────────────────────────
    S.append(p(h1, "13. Modulo Comercial"))
    S.append(hr())
    S.append(p(body, "Ferramentas para ajudar voce a gerenciar o lado comercial da sua consultoria."))
    S.append(sp(0.3))

    S.append(p(h2, "Precificacao"))
    S.append(p(route, "/pricing-parameters"))
    S.append(p(body, "Configure precos de servicos oferecidos pela sua consultoria."))
    S.append(sp(0.3))

    S.append(p(h2, "Propostas Comerciais"))
    S.append(p(route, "/proposals"))
    S.append(p(body, "Gere propostas comerciais profissionais em PDF para seus clientes."))
    S.append(sp(0.3))

    S.append(p(h2, "Catalogo de Servicos"))
    S.append(p(route, "/services"))
    S.append(p(body, "Mantenha um catalogo organizado dos servicos que voce oferece."))
    S.append(sp(0.3))

    S.append(p(h2, "CRM Basico"))
    S.append(p(route, "/clients"))
    S.append(p(body, "Gerencie seus clientes e prospects em um CRM integrado."))
    S.append(sp(0.3))

    S.append(p(h2, "Calculadora de Risco"))
    S.append(p(route, "/calculator"))
    S.append(p(body, "Calcule o impacto financeiro dos riscos psicossociais para demonstrar valor aos clientes."))
    S.append(PageBreak())

    # ── 14. SEGURANCA DA CONTA ───────────────────────────────────────
    S.append(p(h1, "14. Seguranca da Conta"))
    S.append(hr())
    S.append(p(body, "Proteja sua conta e os dados dos seus clientes com as funcionalidades de seguranca da plataforma."))
    S.append(sp(0.3))

    S.append(p(h2, "Autenticacao em Dois Fatores (2FA)"))
    S.append(p(route, "/security-dashboard"))
    S.append(p(body, "Ative a autenticacao em dois fatores para adicionar uma camada extra de seguranca ao login."))
    S.append(sp(0.3))

    S.append(p(h2, "Sessoes Ativas"))
    S.append(p(body, "Visualize e revogue sessoes ativas de qualquer dispositivo."))
    S.append(sp(0.3))

    S.append(p(h2, "Politica de Senha"))
    S.extend(bullets([
        "Minimo 8 caracteres",
        "Recomendado usar caracteres especiais",
    ]))
    S.append(sp(0.3))
    S.append(p(warn, "Aviso: Ative o 2FA para proteger sua conta e dados dos clientes."))
    S.append(PageBreak())

    # ── 15. SUPORTE ──────────────────────────────────────────────────
    S.append(p(h1, "15. Suporte"))
    S.append(hr())
    S.append(p(route, "/support"))
    S.append(sp(0.3))
    S.append(p(body, "O sistema de suporte permite que voce entre em contato com a equipe Black Belt para resolver qualquer questao."))
    S.append(sp(0.3))

    S.append(p(h2, "Como Criar um Ticket"))
    S.extend(nums([
        'Acesse <b>"Suporte"</b> no menu lateral',
        'Clique em <b>"Novo Ticket"</b>',
        "Preencha: titulo, descricao detalhada e prioridade",
        "Acompanhe o status e receba respostas da equipe",
    ]))
    S.append(sp(0.3))

    S.append(p(h2, "Categorias de Suporte"))
    S.extend(bullets([
        "<b>Tecnico</b> - Problemas com a plataforma ou funcionalidades",
        "<b>Comercial</b> - Duvidas sobre planos, pagamentos e faturamento",
        "<b>Duvida geral</b> - Orientacoes de uso e boas praticas",
    ]))
    S.append(PageBreak())

    # ── FINAL PAGE ───────────────────────────────────────────────────
    S.append(sp(4))

    # logo BB
    logo2 = Table([["BB"]], colWidths=[3*cm], rowHeights=[1.5*cm])
    logo2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), P1),
        ("TEXTCOLOR", (0, 0), (0, 0), W),
        ("FONTNAME",  (0, 0), (0, 0), "Helvetica-Bold"),
        ("FONTSIZE",  (0, 0), (0, 0), 28),
        ("ALIGN",     (0, 0), (0, 0), "CENTER"),
        ("VALIGN",    (0, 0), (0, 0), "MIDDLE"),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    logo2_wrapper = Table([[logo2]], colWidths=[A4[0] - 4*cm])
    logo2_wrapper.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
    ]))
    S.append(logo2_wrapper)
    S.append(sp(1))

    S.append(p(cover_title, "Black Belt Platform"))
    S.append(sp(0.5))
    S.append(hr())
    S.append(sp(0.5))
    S.append(p(cover_sub, "Gestao de Riscos Psicossociais e Compliance NR-01"))
    S.append(sp(1))
    S.append(p(body, '<para alignment="center"><b>Website:</b> blackbeltconsultoria.com</para>'))
    S.append(sp(0.3))
    S.append(p(body, '<para alignment="center"><b>Email:</b> contato@blackbeltconsultoria.com</para>'))
    S.append(sp(0.3))
    S.append(p(body, '<para alignment="center"><b>Suporte:</b> Acesse /support na plataforma</para>'))
    S.append(sp(2))
    S.append(p(footer_style, "2026 Black Belt Consultoria. Todos os direitos reservados."))

    # ── generate ─────────────────────────────────────────────────────
    doc.build(S, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"PDF gerado: {out}")


if __name__ == "__main__":
    build()
