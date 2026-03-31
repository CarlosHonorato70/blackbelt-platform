"""
Guia da Empresa — Black Belt Platform
PDF completo para empresas-clientes da plataforma.
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

OUTPUT = os.path.join(os.path.dirname(__file__), "GUIA_EMPRESA.pdf")

# Colors
P1 = HexColor("#4C1D95")  # purple dark
P2 = HexColor("#7C3AED")  # purple medium
P3 = HexColor("#EDE9FE")  # purple light
G1 = HexColor("#111827")  # gray 900
G2 = HexColor("#374151")  # gray 700
G3 = HexColor("#6B7280")  # gray 500
G4 = HexColor("#D1D5DB")  # gray 300
G5 = HexColor("#F3F4F6")  # gray 100
W = colors.white
GREEN = HexColor("#059669")
RED = HexColor("#DC2626")
AMBER = HexColor("#D97706")
BLUE = HexColor("#2563EB")

# ── Styles ──────────────────────────────────────────────────────────────────

def S():
    d = {}

    d["cover_title"] = ParagraphStyle("ct", fontName="Helvetica-Bold", fontSize=30, leading=36, textColor=P1, alignment=TA_CENTER, spaceAfter=8)
    d["cover_sub"] = ParagraphStyle("cs", fontName="Helvetica", fontSize=14, leading=20, textColor=G3, alignment=TA_CENTER, spaceAfter=6)
    d["cover_tag"] = ParagraphStyle("ctg", fontName="Helvetica-Bold", fontSize=11, leading=16, textColor=P2, alignment=TA_CENTER, spaceAfter=4)

    d["h1"] = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=20, leading=26, textColor=P1, spaceBefore=28, spaceAfter=10)
    d["h2"] = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=15, leading=20, textColor=G1, spaceBefore=18, spaceAfter=6)
    d["h3"] = ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=G2, spaceBefore=12, spaceAfter=4)

    d["body"] = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=14, textColor=G2, alignment=TA_JUSTIFY, spaceAfter=6)
    d["body_bold"] = ParagraphStyle("bb", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=G2, spaceAfter=4)
    d["bullet"] = ParagraphStyle("bul", fontName="Helvetica", fontSize=10, leading=14, textColor=G2, leftIndent=18, spaceAfter=3, bulletIndent=6)
    d["num"] = ParagraphStyle("num", fontName="Helvetica", fontSize=10, leading=14, textColor=G2, leftIndent=18, spaceAfter=3)
    d["route"] = ParagraphStyle("route", fontName="Courier", fontSize=9, leading=13, textColor=P2, spaceAfter=6, leftIndent=4)
    d["note"] = ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=9, leading=13, textColor=G3, leftIndent=12, spaceAfter=6)
    d["warn"] = ParagraphStyle("warn", fontName="Helvetica-Bold", fontSize=9, leading=13, textColor=AMBER, leftIndent=12, spaceAfter=6)
    d["footer"] = ParagraphStyle("ft", fontName="Helvetica", fontSize=8, leading=10, textColor=G3, alignment=TA_CENTER)
    d["toc"] = ParagraphStyle("toc", fontName="Helvetica", fontSize=11, leading=20, textColor=G2, leftIndent=8)

    return d


def tbl(headers, rows, widths=None):
    data = [headers] + rows
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), P1),
        ("TEXTCOLOR", (0, 0), (-1, 0), W),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), G2),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [W, G5]),
        ("GRID", (0, 0), (-1, -1), 0.5, G4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(G3)
    canvas.drawCentredString(A4[0] / 2, 15 * mm, f"Black Belt Platform  |  Guia da Empresa  |  Pagina {doc.page}")
    canvas.restoreState()


def build():
    s = S()
    doc = SimpleDocTemplate(OUTPUT, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2.5*cm)
    story = []
    WW = doc.width

    def p(style, text):
        story.append(Paragraph(text, s[style]))

    def sp(h=6):
        story.append(Spacer(1, h))

    def hr():
        story.append(HRFlowable(width="100%", thickness=1, color=P3, spaceAfter=8, spaceBefore=8))

    def bullets(items):
        for i in items:
            p("bullet", f"\u2022  {i}")

    def nums(items):
        for idx, i in enumerate(items, 1):
            p("num", f"{idx}. {i}")

    # ════════════════════════════════════════════════════════════════════════
    # CAPA
    # ════════════════════════════════════════════════════════════════════════
    sp(60)
    p("cover_tag", "GUIA DE UTILIZACAO")
    sp(20)
    story.append(Paragraph("BB", ParagraphStyle("logo", fontName="Helvetica-Bold", fontSize=52, textColor=W, alignment=TA_CENTER, backColor=P2, borderPadding=18, spaceAfter=24)))
    sp(20)
    p("cover_title", "Guia da Empresa")
    p("cover_sub", "Black Belt Platform")
    sp(8)
    story.append(HRFlowable(width="30%", thickness=2, color=P2, spaceAfter=12))
    p("cover_sub", "Manual para empresas-clientes")
    p("cover_sub", "Gestao de Riscos Psicossociais e Compliance NR-01")
    sp(50)
    p("cover_tag", "blackbeltconsultoria.com")
    story.append(Paragraph("contato@blackbeltconsultoria.com", ParagraphStyle("cemail", fontName="Helvetica", fontSize=10, textColor=G3, alignment=TA_CENTER)))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # SUMARIO
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "Sumario")
    sp(4)
    toc = [
        "1. Introducao",
        "2. Recebendo o Convite",
        "3. Primeiro Acesso e Dashboard",
        "4. Setores e Colaboradores",
        "5. Questionario COPSOQ-II",
        "6. Dashboard Executivo",
        "7. Dashboard Psicossocial",
        "8. Matriz de Risco",
        "9. Benchmark Setorial",
        "10. Conformidade NR-01",
        "11. Relatorios e Laudos",
        "12. Canal Anonimo de Denuncias",
        "13. Suporte",
        "14. Limites de Acesso",
    ]
    for item in toc:
        p("toc", item)
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 1. INTRODUCAO
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "1. Introducao")
    hr()

    p("body", "A Black Belt Platform e utilizada pela sua consultoria SST para avaliar riscos psicossociais no ambiente de trabalho da sua empresa. Como empresa-cliente, voce tem acesso aos resultados, relatorios e ferramentas de conformidade disponibilizados pela consultoria.")

    p("body", "Sua conta foi criada pela consultoria que atende sua empresa. A plataforma atende a Portaria MTE n. 1.419/2024 (NR-01), que estabelece a obrigatoriedade de avaliacao e gestao de riscos psicossociais.")

    p("h2", "O que voce pode fazer na plataforma")
    bullets([
        "Visualizar resultados das avaliacoes psicossociais",
        "Acompanhar dashboards executivos e psicossociais",
        "Consultar a matriz de risco e o benchmark setorial",
        "Acessar relatorios e laudos tecnicos",
        "Monitorar conformidade NR-01 (checklist, timeline, certificado)",
        "Utilizar o canal anonimo de denuncias",
        "Criar tickets de suporte",
    ])

    p("note", "Nota: Seu acesso e de VISUALIZACAO — a gestao das avaliacoes e feita pela consultoria.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 2. RECEBENDO O CONVITE
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "2. Recebendo o Convite")
    hr()

    p("body", "Sua consultoria ira enviar um link de convite por email ou mensagem para que voce acesse a plataforma. Este link e pessoal e de uso unico.")

    p("h2", "Fluxo de Acesso")
    nums([
        "Receba o link de convite da consultoria",
        "Clique no link (formato: blackbeltconsultoria.com/accept-invite?token=...)",
        "Crie sua conta: nome, email e senha",
        "Apos o login, voce sera direcionado ao dashboard da sua empresa",
    ])

    sp(8)
    p("note", "Nota: O link de convite expira em 7 dias. Se expirar, solicite um novo a sua consultoria.")
    p("warn", "Aviso: Nao compartilhe o link de convite — ele e pessoal e de uso unico.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 3. PRIMEIRO ACESSO E DASHBOARD
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "3. Primeiro Acesso e Dashboard")
    hr()

    p("route", "Rota: /dashboard")

    p("body", "Apos o login, voce sera direcionado ao dashboard principal da sua empresa. Esta e a tela inicial com um resumo completo da situacao.")

    p("h2", "O que voce encontra no Dashboard")
    bullets([
        "Status da avaliacao atual",
        "Indicadores de risco (semaforo: verde, amarelo, vermelho)",
        "Proximos prazos de conformidade",
        "Acoes pendentes",
    ])

    p("h2", "Menu Lateral")
    p("body", "O menu lateral apresenta todas as funcionalidades disponiveis para o seu perfil de empresa. Navegue pelas opcoes para acessar dashboards, relatorios, conformidade e suporte.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 4. SETORES E COLABORADORES
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "4. Setores e Colaboradores")
    hr()

    p("h2", "Setores")
    p("route", "Rota: /sectors")
    p("body", "Visualize os setores cadastrados da sua empresa. Os setores representam as areas organizacionais como Administrativo, Operacional, Comercial, entre outros. Cada setor pode ter seus resultados analisados individualmente nos dashboards.")

    p("h2", "Pessoas")
    p("route", "Rota: /people")
    p("body", "Visualize os colaboradores cadastrados por setor. A listagem mostra nome, setor, cargo e status de participacao nas avaliacoes.")

    p("note", "Nota: Os setores e colaboradores sao cadastrados pela consultoria. Se precisar de alteracoes, entre em contato com ela.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 5. QUESTIONARIO COPSOQ-II
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "5. Questionario COPSOQ-II")
    hr()

    p("body", "O questionario COPSOQ-II (Copenhagen Psychosocial Questionnaire) e o instrumento utilizado pela plataforma para medir 12 dimensoes de risco psicossocial no ambiente de trabalho.")

    p("body", "Seus colaboradores receberao um link por email para responder ao questionario. A participacao e fundamental para gerar resultados confiáveis.")

    p("h2", "Caracteristicas do Questionario")
    bullets([
        "76 questoes divididas em 9 secoes",
        "Resposta anonima (ninguem sabera quem respondeu o que)",
        "Tempo estimado: 15-20 minutos",
        "Resposta pelo celular ou computador",
    ])

    p("h2", "Estrutura das Secoes")
    sp(4)
    story.append(tbl(
        ["Secao", "Questoes", "Tema"],
        [
            ["Dados demograficos", "5", "Perfil do respondente"],
            ["Exigencias do trabalho", "8", "Carga e ritmo"],
            ["Organizacao do trabalho", "10", "Autonomia e desenvolvimento"],
            ["Relacoes no trabalho", "8", "Apoio e comunidade"],
            ["Interface trabalho-individuo", "8", "Satisfacao e significado"],
            ["Valores no local", "8", "Confianca e justica"],
            ["Saude e bem-estar", "10", "Saude geral e stress"],
            ["Comportamentos ofensivos", "8", "Assedio e violencia"],
            ["Comentarios", "1", "Observacoes livres"],
        ],
        [WW * 0.40, WW * 0.15, WW * 0.45],
    ))

    sp(8)
    p("warn", "Aviso: Incentive TODOS os colaboradores a responder. Minimo 3 respostas para gerar resultados.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 6. DASHBOARD EXECUTIVO
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "6. Dashboard Executivo")
    hr()

    p("route", "Rota: /executive-dashboard")

    p("body", "O Dashboard Executivo apresenta uma visao consolidada dos indicadores-chave de risco psicossocial da sua empresa.")

    p("h2", "O que voce encontra")
    bullets([
        "Score geral de risco psicossocial",
        "Comparacao de resultados entre setores",
        "Evolucao ao longo do tempo (se houver avaliacoes anteriores)",
        "Indicadores resumidos para tomada de decisao",
    ])

    p("body", "Este dashboard e ideal para gestores e diretores que precisam de uma visao rapida e objetiva da situacao da empresa.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 7. DASHBOARD PSICOSSOCIAL
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "7. Dashboard Psicossocial")
    hr()

    p("route", "Rota: /psychosocial-dashboard")

    p("body", "O Dashboard Psicossocial detalha os resultados das 12 dimensoes avaliadas pelo COPSOQ-II, com semaforo de risco para cada uma.")

    p("h2", "Classificacao de Risco")
    sp(4)
    story.append(tbl(
        ["Cor", "Classificacao", "Score"],
        [
            ["Verde", "Risco baixo", "Ate 33%"],
            ["Amarelo", "Risco medio", "34% a 66%"],
            ["Vermelho", "Risco alto", "Acima de 67%"],
        ],
        [WW * 0.20, WW * 0.35, WW * 0.45],
    ))

    sp(8)
    p("h2", "Recursos Visuais")
    bullets([
        "Radar chart com visao de todas as 12 dimensoes simultaneamente",
        "Detalhamento por setor — compare areas da empresa",
        "Graficos de barras com scores individuais por dimensao",
    ])

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 8. MATRIZ DE RISCO
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "8. Matriz de Risco")
    hr()

    p("route", "Rota: /risk-matrix")

    p("body", "A Matriz de Risco apresenta um grafico de Probabilidade x Severidade que identifica os riscos mais criticos da sua empresa.")

    p("h2", "Como funciona")
    bullets([
        "Eixo X: Probabilidade de ocorrencia do risco",
        "Eixo Y: Severidade do impacto",
        "Cada ponto representa uma dimensao de risco avaliada",
        "Priorizacao automatica de acoes de intervencao",
    ])

    p("h2", "Cores da Matriz")
    sp(4)
    story.append(tbl(
        ["Cor", "Nivel", "Acao Recomendada"],
        [
            ["Verde", "Aceitavel", "Manter monitoramento"],
            ["Amarelo", "Atencao", "Planejar intervencao"],
            ["Laranja", "Alto", "Intervencao prioritaria"],
            ["Vermelho", "Critico", "Acao imediata necessaria"],
        ],
        [WW * 0.20, WW * 0.25, WW * 0.55],
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 9. BENCHMARK SETORIAL
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "9. Benchmark Setorial")
    hr()

    p("route", "Rota: /benchmark")

    p("body", "O Benchmark Setorial compara os resultados da sua empresa com a media do setor, utilizando o codigo CNAE como referencia.")

    p("h2", "O que voce pode analisar")
    bullets([
        "Dimensoes acima da media do setor (pontos de atencao)",
        "Dimensoes abaixo da media (pontos fortes)",
        "Posicionamento relativo da empresa no cenario setorial",
        "Contextualizacao dos resultados para tomada de decisao",
    ])

    p("note", "Nota: O benchmark usa dados anonimizados e agregados de todas as empresas do mesmo setor cadastradas na plataforma.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 10. CONFORMIDADE NR-01
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "10. Conformidade NR-01")
    hr()

    p("body", "A secao de Conformidade NR-01 reune todas as ferramentas para acompanhar o cumprimento dos requisitos da norma regulamentadora.")

    p("h2", "Checklist de Conformidade")
    p("route", "Rota: /compliance-checklist")
    p("body", "Lista com 23 requisitos obrigatorios da NR-01 que sua empresa precisa atender. Cada item mostra o status atual (pendente, em andamento, concluido).")

    p("h2", "Timeline de Conformidade")
    p("route", "Rota: /compliance-timeline")
    p("body", "Visualizacao dos prazos e marcos de conformidade em formato de linha do tempo. Permite acompanhar o progresso das atividades ao longo do periodo.")

    p("h2", "Certificado de Conformidade")
    p("route", "Rota: /compliance-certificate")
    p("body", "Emissao de certificado de conformidade apos o atendimento de todos os requisitos. Este documento pode ser utilizado para fins de fiscalizacao e auditoria.")

    p("h2", "Milestones Automaticos")
    p("body", "A plataforma acompanha automaticamente os seguintes marcos de conformidade:")
    nums([
        "Capacitacao da equipe",
        "Aplicacao do questionario",
        "Analise dos resultados",
        "Documentacao PGR",
        "Plano de acao",
        "Implementacao de controles",
        "Monitoramento continuo",
        "Revisao periodica",
    ])

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 11. RELATORIOS E LAUDOS
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "11. Relatorios e Laudos")
    hr()

    p("h2", "Laudo Tecnico")
    p("route", "Rota: /laudo-tecnico")
    p("body", "Documento formal que pode ser apresentado em caso de fiscalizacao. O laudo contem os resultados completos da avaliacao psicossocial, metodologia utilizada e recomendacoes tecnicas.")

    p("h2", "Relatorios de Compliance")
    p("route", "Rota: /compliance-reports")
    p("body", "Relatorios detalhados sobre o status de conformidade da empresa com a NR-01. Inclui percentual de atendimento, itens pendentes e historico de evolucao.")

    p("h2", "Exportacao")
    bullets([
        "Exportacao de relatorios em formato PDF",
        "Documentos prontos para apresentacao a gestores e auditores",
    ])

    p("note", "Nota: Os relatorios sao gerados pela consultoria e disponibilizados para voce na plataforma.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 12. CANAL ANONIMO DE DENUNCIAS
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "12. Canal Anonimo de Denuncias")
    hr()

    p("route", "Rota: /anonymous-report")

    p("body", "O Canal Anonimo e um recurso seguro para que colaboradores possam reportar situacoes de risco sem identificacao.")

    p("h2", "O que pode ser reportado")
    bullets([
        "Assedio moral ou sexual",
        "Condicoes inseguras de trabalho",
        "Violacoes de normas internas ou externas",
        "Outras situacoes de risco psicossocial",
    ])

    p("h2", "Garantias do Canal")
    bullets([
        "Totalmente anonimo — sem identificacao do denunciante",
        "Registro seguro e criptografado",
        "Denuncias sao encaminhadas para a consultoria responsavel",
        "Acompanhamento do status sem exposicao de identidade",
    ])

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 13. SUPORTE
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "13. Suporte")
    hr()

    p("route", "Rota: /support")

    p("body", "O sistema de suporte permite que voce registre problemas, duvidas ou solicitacoes diretamente na plataforma.")

    p("h2", "Criando um Ticket")
    p("body", "Para criar um ticket de suporte, preencha:")
    bullets([
        "Titulo descritivo do problema ou solicitacao",
        "Descricao detalhada com o maximo de informacoes",
        "Prioridade: baixa, media, alta ou critica",
    ])

    p("h2", "Acompanhamento")
    bullets([
        "Acompanhe o status do ticket na propria plataforma",
        "Receba notificacoes quando houver respostas",
        "Historico completo de interacoes armazenado",
    ])

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # 14. LIMITES DE ACESSO
    # ════════════════════════════════════════════════════════════════════════
    p("h1", "14. Limites de Acesso")
    hr()

    p("h2", "O que voce NAO pode fazer")
    p("body", "A empresa-cliente tem acesso restrito a funcionalidades de visualizacao e suporte. As seguintes funcionalidades sao EXCLUSIVAS da consultoria ou do administrador da plataforma:")

    sp(4)
    story.append(tbl(
        ["Funcionalidade", "Quem pode", "Empresa pode?"],
        [
            ["Criar empresas", "Consultoria", "Nao"],
            ["Convidar usuarios", "Admin / Consultoria", "Nao"],
            ["Criar avaliacoes COPSOQ", "Consultoria", "Nao"],
            ["Enviar convites COPSOQ", "Consultoria", "Nao"],
            ["Ver audit logs", "Admin / Consultoria", "Nao"],
            ["Gerenciar assinaturas", "Admin", "Nao"],
            ["Acessar painel admin", "Admin", "Nao"],
            ["Impersonar tenants", "Admin", "Nao"],
            ["Configurar RBAC", "Admin", "Nao"],
            ["Ver dashboards e relatorios", "Todos", "Sim"],
            ["Responder COPSOQ", "Colaboradores", "Sim (via link)"],
            ["Criar tickets de suporte", "Todos", "Sim"],
            ["Canal anonimo", "Todos", "Sim"],
        ],
        [WW * 0.40, WW * 0.30, WW * 0.30],
    ))

    sp(8)
    p("note", "Nota: Se voce precisar de uma funcionalidade que nao esta disponivel, entre em contato com sua consultoria.")

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # PAGINA FINAL — CONTATO
    # ════════════════════════════════════════════════════════════════════════
    sp(80)
    story.append(Paragraph("BB", ParagraphStyle("logo2", fontName="Helvetica-Bold", fontSize=44, textColor=W, alignment=TA_CENTER, backColor=P2, borderPadding=14, spaceAfter=20)))
    sp(20)
    p("cover_title", "Black Belt Platform")
    sp(8)
    story.append(HRFlowable(width="30%", thickness=2, color=P2, spaceAfter=16))
    p("cover_sub", "Gestao de Riscos Psicossociais e Compliance NR-01")
    sp(20)
    p("cover_tag", "blackbeltconsultoria.com")
    story.append(Paragraph("contato@blackbeltconsultoria.com", ParagraphStyle("cemail2", fontName="Helvetica", fontSize=10, textColor=G3, alignment=TA_CENTER, spaceAfter=6)))
    sp(30)
    p("cover_sub", "Obrigado por utilizar a Black Belt Platform.")
    p("cover_sub", "Em caso de duvidas, entre em contato com sua consultoria.")

    # ── Build ──
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"PDF gerado: {OUTPUT}")


if __name__ == "__main__":
    build()
