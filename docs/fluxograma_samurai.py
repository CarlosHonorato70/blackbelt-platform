#!/usr/bin/env python3
"""Gera fluxograma visual do processo SamurAI - BlackBelt Platform"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas

W, H = landscape(A4)

# Cores
BLUE = HexColor("#1e40af")
BLUE_LIGHT = HexColor("#dbeafe")
GREEN = HexColor("#16a34a")
GREEN_LIGHT = HexColor("#dcfce7")
ORANGE = HexColor("#ea580c")
ORANGE_LIGHT = HexColor("#fff7ed")
RED = HexColor("#dc2626")
RED_LIGHT = HexColor("#fef2f2")
PURPLE = HexColor("#7c3aed")
PURPLE_LIGHT = HexColor("#f5f3ff")
GRAY = HexColor("#6b7280")
GRAY_LIGHT = HexColor("#f3f4f6")
DARK = HexColor("#1f2937")
GOLD = HexColor("#d97706")
GOLD_LIGHT = HexColor("#fffbeb")

def draw_rounded_rect(c, x, y, w, h, r, fill_color, stroke_color=None):
    c.saveState()
    c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(1.5)
    else:
        c.setStrokeColor(fill_color)
    p = c.beginPath()
    p.roundRect(x, y, w, h, r)
    p.close()
    c.drawPath(p, fill=1, stroke=1 if stroke_color else 0)
    c.restoreState()

def draw_arrow(c, x1, y1, x2, y2, color=GRAY):
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(2)
    c.line(x1, y1, x2, y2)
    # Arrowhead
    import math
    angle = math.atan2(y2-y1, x2-x1)
    size = 8
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - size*math.cos(angle-0.4), y2 - size*math.sin(angle-0.4))
    p.lineTo(x2 - size*math.cos(angle+0.4), y2 - size*math.sin(angle+0.4))
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()

def draw_step(c, x, y, w, h, number, title, subtitle, bg, border, num_bg):
    draw_rounded_rect(c, x, y, w, h, 8, bg, border)
    # Number circle
    cx = x + 18
    cy = y + h - 18
    c.saveState()
    c.setFillColor(num_bg)
    c.circle(cx, cy, 12, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(cx, cy - 4, str(number))
    c.restoreState()
    # Title
    c.saveState()
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    tx = x + 35
    c.drawString(tx, y + h - 22, title)
    # Subtitle
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    lines = subtitle.split("\n")
    for i, line in enumerate(lines):
        c.drawString(tx, y + h - 34 - i*10, line)
    c.restoreState()

def create_pdf():
    c = canvas.Canvas("docs/Fluxograma_SamurAI_BlackBelt.pdf", pagesize=landscape(A4))

    # Background
    c.setFillColor(HexColor("#f8fafc"))
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Header bar
    draw_rounded_rect(c, 20, H-70, W-40, 55, 10, BLUE)
    c.saveState()
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, H-52, "SamurAI - Fluxo Completo NR-01")
    c.setFont("Helvetica", 12)
    c.drawString(40, H-67, "Black Belt Consultoria | Gestao de Riscos Psicossociais")
    c.setFont("Helvetica", 10)
    c.drawRightString(W-40, H-52, "blackbeltconsultoria.com")
    c.restoreState()

    # === ROW 1 ===
    row1_y = H - 155
    sw = 160  # step width
    sh = 70   # step height
    gap = 12

    steps_row1 = [
        (1, "Inserir CNPJ", "Consultor digita CNPJ\n+ funcionarios + email", BLUE_LIGHT, BLUE, BLUE),
        (2, "Consulta Receita", "Busca automatica\nna Receita Federal", BLUE_LIGHT, BLUE, BLUE),
        (3, "Cadastro Empresa", "Cria tenant + checklist\nNR-01 automatico", GREEN_LIGHT, GREEN, GREEN),
        (4, "Pre-Proposta", "Gera estimativa com\nbase no porte/setor", ORANGE_LIGHT, ORANGE, ORANGE),
        (5, "Editar Proposta", "Modal visual para\najustar valores/itens", ORANGE_LIGHT, ORANGE, ORANGE),
    ]

    x = 30
    positions_r1 = []
    for i, (num, title, sub, bg, border, nbg) in enumerate(steps_row1):
        draw_step(c, x, row1_y, sw, sh, num, title, sub, bg, border, nbg)
        positions_r1.append((x, row1_y))
        if i < len(steps_row1) - 1:
            draw_arrow(c, x + sw, row1_y + sh/2, x + sw + gap, row1_y + sh/2, border)
        x += sw + gap

    # Arrow down from step 5 to step 6
    last_x_r1 = positions_r1[-1][0] + sw/2

    # === ROW 2 ===
    row2_y = H - 250

    steps_row2 = [
        (6, "Enviar por Email", "Email com proposta\n+ botoes Aprovar/Recusar", GREEN_LIGHT, GREEN, GREEN),
        (7, "Aprovacao Email", "Empresa clica Aprovar\nno email recebido", GREEN_LIGHT, GREEN, GREEN),
        (8, "Criar Conta", "Auto-cria usuario +\nenvia credenciais", PURPLE_LIGHT, PURPLE, PURPLE),
        (9, "Cadastrar Pessoas", "Empresa cadastra setores\ne colaboradores", PURPLE_LIGHT, PURPLE, PURPLE),
        (10, "Enviar COPSOQ", "Dispara questionarios\npor email", RED_LIGHT, RED, RED),
    ]

    # Draw from right to left (reverse direction)
    x = 30 + (sw + gap) * 4
    positions_r2 = []
    for i, (num, title, sub, bg, border, nbg) in enumerate(steps_row2):
        px = 30 + (sw + gap) * (4 - i)
        draw_step(c, px, row2_y, sw, sh, num, title, sub, bg, border, nbg)
        positions_r2.append((px, row2_y))
        if i < len(steps_row2) - 1:
            next_px = 30 + (sw + gap) * (4 - i - 1)
            draw_arrow(c, px, row2_y + sh/2, next_px + sw, row2_y + sh/2, border)

    # Arrow from row1 last to row2 first
    draw_arrow(c, last_x_r1, row1_y, last_x_r1, row2_y + sh, ORANGE)

    # === ROW 3 ===
    row3_y = H - 345

    steps_row3 = [
        (11, "Respostas COPSOQ", "Colaboradores respondem\n(anonimo, 7 dias)", RED_LIGHT, RED, RED),
        (12, "Gerar Relatorio", "Analise automatica\ndos resultados", GOLD_LIGHT, GOLD, GOLD),
        (13, "Inventario Riscos", "Mapeamento completo\nde riscos psicossociais", GOLD_LIGHT, GOLD, GOLD),
        (14, "Plano de Acao", "Acoes corretivas com\nprazos e responsaveis", GOLD_LIGHT, GOLD, GOLD),
        (15, "Proposta Final", "Proposta definitiva com\nvalores reais do servico", GREEN_LIGHT, GREEN, GREEN),
    ]

    x = 30
    positions_r3 = []
    for i, (num, title, sub, bg, border, nbg) in enumerate(steps_row3):
        draw_step(c, x, row3_y, sw, sh, num, title, sub, bg, border, nbg)
        positions_r3.append((x, row3_y))
        if i < len(steps_row3) - 1:
            draw_arrow(c, x + sw, row3_y + sh/2, x + sw + gap, row3_y + sh/2, border)
        x += sw + gap

    # Arrow from row2 last (step 10, leftmost) to row3 first
    step10_x = positions_r2[-1][0] + sw/2
    draw_arrow(c, step10_x, row2_y, step10_x, row3_y + sh, RED)

    # === ROW 4 (Final) ===
    row4_y = H - 440

    steps_row4 = [
        (16, "Aprovar + Pagar", "Empresa aprova proposta\nfinal e paga parcelas", GREEN_LIGHT, GREEN, GREEN),
        (17, "Liberar PDFs", "Todos os documentos\nliberados para download", BLUE_LIGHT, BLUE, BLUE),
        (18, "Entrega Final", "7 PDFs: Proposta, COPSOQ,\nInventario, Plano, etc.", BLUE_LIGHT, BLUE, BLUE),
    ]

    # Draw from right to left
    x = 30 + (sw + gap) * 4
    positions_r4 = []
    for i, (num, title, sub, bg, border, nbg) in enumerate(steps_row4):
        px = 30 + (sw + gap) * (4 - i)
        draw_step(c, px, row4_y, sw, sh, num, title, sub, bg, border, nbg)
        positions_r4.append((px, row4_y))
        if i < len(steps_row4) - 1:
            next_px = 30 + (sw + gap) * (4 - i - 1)
            draw_arrow(c, px, row4_y + sh/2, next_px + sw, row4_y + sh/2, border)

    # Arrow from row3 last to row4 first
    last_x_r3 = positions_r3[-1][0] + sw/2
    draw_arrow(c, last_x_r3, row3_y, last_x_r3, row4_y + sh, GREEN)

    # === LEGEND ===
    legend_y = 25
    c.saveState()
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(DARK)
    c.drawString(30, legend_y + 15, "Legenda:")

    legends = [
        (BLUE, "Consultoria"), (GREEN, "Aprovacao/Envio"),
        (ORANGE, "Proposta"), (PURPLE, "Empresa"),
        (RED, "COPSOQ-II"), (GOLD, "Analise NR-01"),
    ]
    lx = 90
    for color, label in legends:
        c.setFillColor(color)
        c.circle(lx, legend_y + 17, 5, fill=1, stroke=0)
        c.setFillColor(DARK)
        c.setFont("Helvetica", 8)
        c.drawString(lx + 8, legend_y + 13, label)
        lx += 95
    c.restoreState()

    # === DELIVERABLES BOX ===
    bx = 30 + (sw + gap) * 2
    by = row4_y - 5
    bw = sw * 3 + gap * 2
    bh = 65
    draw_rounded_rect(c, bx, by - bh, bw, bh, 8, GRAY_LIGHT, GRAY)
    c.saveState()
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(bx + bw/2, by - 16, "Documentos Entregues (7 PDFs)")
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    docs = [
        "Proposta Comercial | Relatorio COPSOQ-II | Inventario de Riscos",
        "Plano de Acao | Programa de Treinamento | Checklist de Conformidade",
        "Certificado de Conformidade NR-01"
    ]
    for i, doc in enumerate(docs):
        c.drawCentredString(bx + bw/2, by - 32 - i*11, doc)
    c.restoreState()

    # Footer
    c.saveState()
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 10, "Black Belt Consultoria SST | contato@blackbeltconsultoria.com | blackbeltconsultoria.com")
    c.restoreState()

    c.save()
    print("PDF criado: docs/Fluxograma_SamurAI_BlackBelt.pdf")

if __name__ == "__main__":
    create_pdf()
