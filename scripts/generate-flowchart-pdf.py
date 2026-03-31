# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
import os

output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Fluxograma_SamurAI_NR01.pdf")
accent = HexColor('#1B365D')
accent_light = HexColor('#E8EEF4')
gray = HexColor('#666666')

doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=25*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=24, textColor=accent, spaceAfter=6))
styles.add(ParagraphStyle('CustomSubtitle', parent=styles['Normal'], fontSize=14, textColor=accent, alignment=TA_CENTER, spaceBefore=4, spaceAfter=4))
styles.add(ParagraphStyle('CustomH1', parent=styles['Heading1'], fontSize=16, textColor=accent, spaceBefore=20, spaceAfter=10))
styles.add(ParagraphStyle('CustomH2', parent=styles['Heading2'], fontSize=13, textColor=accent, spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle('CustomBody', parent=styles['Normal'], fontSize=10, spaceBefore=4, spaceAfter=4))
styles.add(ParagraphStyle('CustomCenter', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=gray))
styles.add(ParagraphStyle('StepTitle', parent=styles['Normal'], fontSize=11, textColor=accent, spaceBefore=10, spaceAfter=4))
styles.add(ParagraphStyle('BulletItem', parent=styles['Normal'], fontSize=10, leftIndent=20, spaceBefore=2, spaceAfter=2))
styles.add(ParagraphStyle('Arrow', parent=styles['Normal'], fontSize=16, alignment=TA_CENTER, textColor=accent, spaceBefore=2, spaceAfter=2))

story = []

# TITLE PAGE
story.append(Spacer(1, 60))
story.append(Paragraph("FLUXOGRAMA COMPLETO", styles['CustomTitle']))
story.append(Paragraph("SamurAI \u2014 Processo NR-01", styles['CustomSubtitle']))
story.append(Spacer(1, 10))
story.append(Paragraph("Fluxo completo desde o primeiro contato at\u00e9 a entrega final dos PDFs", styles['CustomCenter']))
story.append(Spacer(1, 30))
story.append(Paragraph("<b>Black Belt Consultoria SST</b>", styles['CustomCenter']))
story.append(Paragraph("contato@blackbeltconsultoria.com", styles['CustomCenter']))
story.append(PageBreak())

# SECTION 1: TABLE
story.append(Paragraph("1. Fluxo Completo em 15 Etapas", styles['CustomH1']))
story.append(Paragraph("Vis\u00e3o geral de todas as etapas do processo NR-01 conduzido pelo agente SamurAI.", styles['CustomBody']))

steps = [
    ["#", "Etapa", "Descri\u00e7\u00e3o", "Ator", "Exec."],
    ["1", "Entrada", "Consultor digita CNPJ + funcion\u00e1rios + email", "Consultor", "Manual"],
    ["2", "Receita Federal", "Busca autom\u00e1tica de dados da empresa", "SamurAI", "Auto"],
    ["3", "Cadastro", "Cria tenant, 18 itens checklist, 11 milestones", "SamurAI", "Auto"],
    ["4", "Pr\u00e9-Proposta", "Calcula pre\u00e7o por porte/setor", "SamurAI", "Auto"],
    ["5", "Envio Email", "Email HTML com Aprovar/Recusar via Brevo", "SamurAI", "Auto"],
    ["6", "Aprova\u00e7\u00e3o", "Empresa aprova. Cria conta + credenciais", "Empresa", "Auto"],
    ["7", "Cadastro Dados", "Empresa cadastra setores e colaboradores", "Empresa", "Manual"],
    ["8", "COPSOQ-II", "Envia question\u00e1rio por email (tokens \u00fanicos)", "SamurAI", "Auto"],
    ["9", "Respostas", "76 perguntas, 12 dimens\u00f5es, an\u00f4nimas", "Colaboradores", "Manual"],
    ["10", "Relat\u00f3rio", "Invent\u00e1rio de riscos + plano de a\u00e7\u00e3o", "SamurAI", "Auto"],
    ["11", "Treinamento", "6 m\u00f3dulos, 8 horas total", "SamurAI", "Auto"],
    ["12", "Certifica\u00e7\u00e3o", "Checklist conforme + certificado NR-01", "SamurAI", "Auto"],
    ["13", "Proposta Final", "Baseada nos servi\u00e7os. 3 parcelas", "SamurAI", "Auto"],
    ["14", "Pagamento", "Email com PIX. Consultoria confirma", "Consultoria", "Manual"],
    ["15", "Entrega", "7 PDFs liberados ap\u00f3s pagamento", "Sistema", "Auto"],
]

col_widths = [25, 80, 220, 70, 40]
table = Table(steps, colWidths=col_widths)
table_style = [
    ('BACKGROUND', (0, 0), (-1, 0), accent),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (4, 0), (4, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
]
for i in range(1, len(steps)):
    if i % 2 == 0:
        table_style.append(('BACKGROUND', (0, i), (-1, i), accent_light))
table.setStyle(TableStyle(table_style))
story.append(table)
story.append(PageBreak())

# SECTION 2: VISUAL FLOW
story.append(Paragraph("2. Fluxo Visual Detalhado", styles['CustomH1']))

step_details = [
    ("1", "Entrada", "Consultor", "Manual", "Consultor digita CNPJ + n\u00famero de funcion\u00e1rios + email da empresa no SamurAI"),
    ("2", "Consulta Receita Federal", "SamurAI", "Autom\u00e1tico", "Busca autom\u00e1tica: raz\u00e3o social, CNAE, porte, endere\u00e7o, telefone, email"),
    ("3", "Cadastro da Empresa", "SamurAI", "Autom\u00e1tico", "Cria tenant da empresa, 18 itens de checklist NR-01, 11 milestones com prazos progressivos"),
    ("4", "Gera\u00e7\u00e3o da Pr\u00e9-Proposta", "SamurAI", "Autom\u00e1tico", "Calcula pre\u00e7o por porte/setor, aplica descontos por volume, gera documento com tabelas"),
    ("5", "Envio da Pr\u00e9-Proposta", "SamurAI", "Autom\u00e1tico", "Email HTML profissional com bot\u00f5es Aprovar/Recusar via API Brevo"),
    ("6", "Aprova\u00e7\u00e3o + Cria\u00e7\u00e3o de Conta", "Empresa", "Autom\u00e1tico", "Empresa clica Aprovar no email. Sistema cria usu\u00e1rio vinculado ao tenant e envia email de boas-vindas com credenciais"),
    ("7", "Cadastro de Dados", "Empresa", "Manual", "Empresa faz login na plataforma, cadastra setores e colaboradores (manual ou importa\u00e7\u00e3o de planilha XLSX/CSV/ODS)"),
    ("8", "Envio do COPSOQ-II", "SamurAI", "Autom\u00e1tico", "Busca emails dos colaboradores no banco de dados, cria assessment, gera tokens \u00fanicos por convite, envia emails individuais. Prazo: 7 dias"),
    ("9", "Respostas dos Colaboradores", "Colaboradores", "Manual", "Question\u00e1rio com 76 perguntas avaliando 12 dimens\u00f5es psicossociais. Respostas an\u00f4nimas. Resposta parcial aceita"),
    ("10", "Relat\u00f3rio + Invent\u00e1rio de Riscos", "SamurAI", "Autom\u00e1tico", "Calcula m\u00e9dias das 12 dimens\u00f5es, gera relat\u00f3rio COPSOQ-II, cria invent\u00e1rio de riscos classificados, plano de a\u00e7\u00e3o com prazos 30/60/90 dias, recomenda\u00e7\u00f5es PCMSO"),
    ("11", "Programa de Treinamento", "SamurAI", "Autom\u00e1tico", "Cria 6 m\u00f3dulos (8 horas total): NR-01, fatores de risco, preven\u00e7\u00e3o, canal an\u00f4nimo, lideran\u00e7a e sa\u00fade, avalia\u00e7\u00e3o"),
    ("12", "Certifica\u00e7\u00e3o NR-01", "SamurAI", "Autom\u00e1tico", "Marca 18 itens do checklist como conforme, completa milestones, emite certificado BB-CERT v\u00e1lido por 1 ano"),
    ("13", "Proposta Final", "SamurAI", "Autom\u00e1tico", "Baseada nos servi\u00e7os executados. Inclui ROI estimado. Pagamento em 3 parcelas (40/30/30). Edit\u00e1vel antes do envio"),
    ("14", "Pagamento", "Consultoria", "Manual", "Email com dados banc\u00e1rios/PIX da consultoria. 3 parcelas. Consultoria confirma cada pagamento. PDFs bloqueados at\u00e9 quita\u00e7\u00e3o"),
    ("15", "Entrega Final", "Sistema", "Autom\u00e1tico", "7 PDFs liberados ap\u00f3s pagamento 100% confirmado: Proposta, COPSOQ-II, Invent\u00e1rio, Plano de A\u00e7\u00e3o, Treinamento, Checklist, Certificado"),
]

for i, (num, title, actor, exec_type, desc) in enumerate(step_details):
    story.append(Paragraph(f"<b>Etapa {num}: {title}</b>", styles['StepTitle']))
    story.append(Paragraph(f"\u2022 <b>Ator:</b> {actor} | <b>Execu\u00e7\u00e3o:</b> {exec_type}", styles['BulletItem']))
    story.append(Paragraph(f"\u2022 {desc}", styles['BulletItem']))
    if i < len(step_details) - 1:
        story.append(Paragraph("\u25BC", styles['Arrow']))

story.append(PageBreak())

# SECTION 3: COPSOQ
story.append(Paragraph("3. Dimens\u00f5es COPSOQ-II", styles['CustomH1']))
story.append(Paragraph("O question\u00e1rio COPSOQ-II avalia 12 dimens\u00f5es psicossociais com 76 perguntas.", styles['CustomBody']))

dims = [
    ["#", "Dimens\u00e3o", "O que mede"],
    ["1", "Demanda", "Carga de trabalho, ritmo, exig\u00eancias"],
    ["2", "Controle", "Autonomia, participa\u00e7\u00e3o nas decis\u00f5es"],
    ["3", "Apoio Social", "Suporte de colegas e gestores"],
    ["4", "Lideran\u00e7a", "Qualidade da gest\u00e3o"],
    ["5", "Comunidade", "Rela\u00e7\u00f5es interpessoais"],
    ["6", "Significado", "Sentido no trabalho"],
    ["7", "Confian\u00e7a", "Confian\u00e7a na organiza\u00e7\u00e3o"],
    ["8", "Justi\u00e7a", "Equidade nos processos"],
    ["9", "Inseguran\u00e7a", "Medo de perder emprego"],
    ["10", "Sa\u00fade Mental", "Estado psicol\u00f3gico geral"],
    ["11", "Burnout", "Exaust\u00e3o emocional"],
    ["12", "Viol\u00eancia", "Ass\u00e9dio e conflitos"],
]

dims_table = Table(dims, colWidths=[25, 90, 320])
dims_style = [
    ('BACKGROUND', (0, 0), (-1, 0), accent),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]
for i in range(1, len(dims)):
    if i % 2 == 0:
        dims_style.append(('BACKGROUND', (0, i), (-1, i), accent_light))
dims_table.setStyle(TableStyle(dims_style))
story.append(dims_table)

story.append(Spacer(1, 20))

# SECTION 4: PDFs
story.append(Paragraph("4. Documentos Gerados (7 PDFs)", styles['CustomH1']))
story.append(Paragraph("Todos os documentos s\u00e3o gerados automaticamente e liberados ap\u00f3s confirma\u00e7\u00e3o de pagamento.", styles['CustomBody']))

pdfs = [
    ["Documento", "Conte\u00fado"],
    ["Proposta Comercial", "Servi\u00e7os + valores + condi\u00e7\u00f5es de pagamento"],
    ["Relat\u00f3rio COPSOQ-II", "Resultados das 12 dimens\u00f5es psicossociais"],
    ["Invent\u00e1rio de Riscos", "Riscos identificados e classificados por n\u00edvel"],
    ["Plano de A\u00e7\u00e3o", "A\u00e7\u00f5es corretivas com prazos 30/60/90 dias"],
    ["Programa de Treinamento", "6 m\u00f3dulos + cronograma (8 horas)"],
    ["Checklist de Conformidade", "18 itens NR-01 verificados"],
    ["Certificado NR-01", "Certifica\u00e7\u00e3o v\u00e1lida por 1 ano"],
]

pdf_table = Table(pdfs, colWidths=[150, 285])
pdf_style = [
    ('BACKGROUND', (0, 0), (-1, 0), accent),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]
for i in range(1, len(pdfs)):
    if i % 2 == 0:
        pdf_style.append(('BACKGROUND', (0, i), (-1, i), accent_light))
pdf_table.setStyle(TableStyle(pdf_style))
story.append(pdf_table)

story.append(Spacer(1, 20))

# SECTION 5: RECOVERY
story.append(Paragraph("5. Recupera\u00e7\u00e3o de Chat por CNPJ", styles['CustomH1']))
story.append(Paragraph("Quando o consultor digita um CNPJ de empresa j\u00e1 cadastrada, o SamurAI:", styles['CustomBody']))
story.append(Paragraph("\u2022 N\u00c3O pede n\u00famero de funcion\u00e1rios ou email novamente", styles['BulletItem']))
story.append(Paragraph("\u2022 Mostra o STATUS ATUAL do processo (em andamento, aguardando, completo)", styles['BulletItem']))
story.append(Paragraph("\u2022 Oferece a pr\u00f3xima a\u00e7\u00e3o pendente com bot\u00e3o contextual", styles['BulletItem']))
story.append(Paragraph("\u2022 Se tudo completo: exibe links dos PDFs para download", styles['BulletItem']))

story.append(Spacer(1, 40))
story.append(Paragraph("<b>Black Belt Consultoria SST</b>", styles['CustomCenter']))
story.append(Paragraph("contato@blackbeltconsultoria.com | blackbeltconsultoria.com", styles['CustomCenter']))

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(accent)
    canvas.drawString(20*mm, A4[1] - 12*mm, "Black Belt Consultoria")
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(gray)
    canvas.drawString(75*mm, A4[1] - 12*mm, "|    Fluxograma SamurAI NR-01")
    canvas.setStrokeColor(accent)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, A4[1] - 14*mm, A4[0] - 20*mm, A4[1] - 14*mm)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(gray)
    canvas.drawCentredString(A4[0]/2, 10*mm, f"Confidencial | Black Belt Consultoria SST | P\u00e1gina {canvas.getPageNumber()}")
    canvas.setStrokeColor(HexColor('#CCCCCC'))
    canvas.line(20*mm, 14*mm, A4[0] - 20*mm, 14*mm)
    canvas.restoreState()

doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
print(f"PDF criado com sucesso: {output_path}")
