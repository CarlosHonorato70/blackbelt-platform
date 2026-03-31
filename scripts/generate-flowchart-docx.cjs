const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const accent = '1B365D';
const accentLight = 'E8EEF4';

function headerCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: accent, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })]
  });
}

function cell(text, width, shade) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: accentLight, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20 })] })]
  });
}

const steps = [
  { num: '1', title: 'Entrada', desc: 'Consultor digita CNPJ + n\u00famero de funcion\u00e1rios + email da empresa', actor: 'Consultor', auto: 'Manual' },
  { num: '2', title: 'Consulta Receita Federal', desc: 'Busca autom\u00e1tica de dados da empresa (CNPJ, CNAE, porte, endere\u00e7o)', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '3', title: 'Cadastro da Empresa', desc: 'Cria tenant, 18 itens checklist NR-01, 11 milestones com prazos', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '4', title: 'Pr\u00e9-Proposta', desc: 'Calcula pre\u00e7o por porte/setor, aplica descontos, gera documento', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '5', title: 'Envio da Pr\u00e9-Proposta', desc: 'Email HTML profissional com bot\u00f5es Aprovar/Recusar via API Brevo', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '6', title: 'Aprova\u00e7\u00e3o + Conta', desc: 'Empresa clica Aprovar no email. Sistema cria conta e envia credenciais', actor: 'Empresa', auto: 'Autom\u00e1tico' },
  { num: '7', title: 'Cadastro de Dados', desc: 'Empresa faz login, cadastra setores e colaboradores (manual ou planilha XLSX/CSV)', actor: 'Empresa', auto: 'Manual' },
  { num: '8', title: 'Envio COPSOQ-II', desc: 'Envia question\u00e1rio por email para todos os colaboradores (tokens \u00fanicos, prazo 7 dias)', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '9', title: 'Respostas COPSOQ', desc: '76 perguntas, 12 dimens\u00f5es psicossociais, respostas an\u00f4nimas. Parcial aceito', actor: 'Colaboradores', auto: 'Manual' },
  { num: '10', title: 'Relat\u00f3rio + Invent\u00e1rio', desc: 'M\u00e9dias das 12 dimens\u00f5es, invent\u00e1rio de riscos, plano de a\u00e7\u00e3o com prazos, PCMSO', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '11', title: 'Programa de Treinamento', desc: '6 m\u00f3dulos (8 horas total): NR-01, fatores de risco, preven\u00e7\u00e3o, lideran\u00e7a', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '12', title: 'Certifica\u00e7\u00e3o NR-01', desc: 'Checklist conforme, milestones completos, certificado BB-CERT v\u00e1lido por 1 ano', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '13', title: 'Proposta Final', desc: 'Baseada nos servi\u00e7os executados. ROI estimado. Pagamento em 3 parcelas (40/30/30)', actor: 'SamurAI', auto: 'Autom\u00e1tico' },
  { num: '14', title: 'Pagamento', desc: 'Email com dados banc\u00e1rios/PIX. Consultoria confirma cada parcela. PDFs bloqueados', actor: 'Consultoria', auto: 'Manual' },
  { num: '15', title: 'Entrega Final', desc: '7 PDFs liberados ap\u00f3s pagamento 100% confirmado. Processo finalizado!', actor: 'Sistema', auto: 'Autom\u00e1tico' },
];

const dims = [
  ['1', 'Demanda', 'Carga de trabalho, ritmo, exig\u00eancias'],
  ['2', 'Controle', 'Autonomia, participa\u00e7\u00e3o nas decis\u00f5es'],
  ['3', 'Apoio Social', 'Suporte de colegas e gestores'],
  ['4', 'Lideran\u00e7a', 'Qualidade da gest\u00e3o'],
  ['5', 'Comunidade', 'Rela\u00e7\u00f5es interpessoais'],
  ['6', 'Significado', 'Sentido no trabalho'],
  ['7', 'Confian\u00e7a', 'Confian\u00e7a na organiza\u00e7\u00e3o'],
  ['8', 'Justi\u00e7a', 'Equidade nos processos'],
  ['9', 'Inseguran\u00e7a', 'Medo de perder emprego'],
  ['10', 'Sa\u00fade Mental', 'Estado psicol\u00f3gico geral'],
  ['11', 'Burnout', 'Exaust\u00e3o emocional'],
  ['12', 'Viol\u00eancia', 'Ass\u00e9dio e conflitos'],
];

const pdfs = [
  ['Proposta Comercial', 'Servi\u00e7os + valores + condi\u00e7\u00f5es de pagamento'],
  ['Relat\u00f3rio COPSOQ-II', 'Resultados das 12 dimens\u00f5es psicossociais'],
  ['Invent\u00e1rio de Riscos', 'Riscos identificados e classificados por n\u00edvel'],
  ['Plano de A\u00e7\u00e3o', 'A\u00e7\u00f5es corretivas com prazos 30/60/90 dias'],
  ['Programa de Treinamento', '6 m\u00f3dulos + cronograma (8 horas)'],
  ['Checklist de Conformidade', '18 itens NR-01 verificados'],
  ['Certificado NR-01', 'Certifica\u00e7\u00e3o v\u00e1lida por 1 ano'],
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: accent, font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: accent, font: 'Arial' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 4 } },
          children: [
            new TextRun({ text: 'Black Belt Consultoria', bold: true, font: 'Arial', size: 18, color: accent }),
            new TextRun({ text: '    |    Fluxograma SamurAI NR-01', font: 'Arial', size: 18, color: '666666' }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
          children: [
            new TextRun({ text: 'Confidencial | Black Belt Consultoria SST | ', font: 'Arial', size: 16, color: '999999' }),
            new TextRun({ text: 'P\u00e1gina ', font: 'Arial', size: 16, color: '999999' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '999999' }),
          ]
        })]
      })
    },
    children: [
      // TITLE PAGE
      new Paragraph({ spacing: { after: 600 }, children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [new TextRun({ text: 'FLUXOGRAMA COMPLETO', bold: true, font: 'Arial', size: 44, color: accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: 'SamurAI \u2014 Processo NR-01', bold: true, font: 'Arial', size: 36, color: accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 8 } },
        children: [new TextRun({ text: 'Fluxo completo desde o primeiro contato at\u00e9 a entrega final dos PDFs', font: 'Arial', size: 22, color: '666666', italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 },
        children: [new TextRun({ text: 'Black Belt Consultoria SST', bold: true, font: 'Arial', size: 24, color: accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'contato@blackbeltconsultoria.com', font: 'Arial', size: 20, color: '666666' })] }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 1
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. Fluxo Completo em 15 Etapas')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Vis\u00e3o geral de todas as etapas do processo NR-01 conduzido pelo agente SamurAI.', font: 'Arial', size: 20 })] }),

      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [600, 1800, 3506, 1600, 2000],
        rows: [
          new TableRow({ children: [
            headerCell('#', 600), headerCell('Etapa', 1800), headerCell('Descri\u00e7\u00e3o', 3506),
            headerCell('Ator', 1600), headerCell('Execu\u00e7\u00e3o', 2000)
          ]}),
          ...steps.map((s, i) => new TableRow({ children: [
            cell(s.num, 600, i % 2 === 0), cell(s.title, 1800, i % 2 === 0),
            cell(s.desc, 3506, i % 2 === 0), cell(s.actor, 1600, i % 2 === 0),
            cell(s.auto, 2000, i % 2 === 0)
          ]}))
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 2
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. Fluxo Visual Detalhado')] }),

      ...steps.flatMap((s, i) => [
        new Paragraph({ spacing: { before: 200, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accent, space: 4 } },
          children: [
            new TextRun({ text: `Etapa ${s.num}: `, bold: true, font: 'Arial', size: 24, color: accent }),
            new TextRun({ text: s.title, bold: true, font: 'Arial', size: 24 }),
          ] }),
        new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Ator: ', bold: true, font: 'Arial', size: 20 }),
            new TextRun({ text: s.actor, font: 'Arial', size: 20 }),
          ] }),
        new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Execu\u00e7\u00e3o: ', bold: true, font: 'Arial', size: 20 }),
            new TextRun({ text: s.auto, font: 'Arial', size: 20 }),
          ] }),
        new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 100 },
          children: [
            new TextRun({ text: 'Descri\u00e7\u00e3o: ', bold: true, font: 'Arial', size: 20 }),
            new TextRun({ text: s.desc, font: 'Arial', size: 20 }),
          ] }),
        ...(i < steps.length - 1 ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [new TextRun({ text: '\u25BC', font: 'Arial', size: 28, color: accent })] })] : []),
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 3
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. Dimens\u00f5es COPSOQ-II')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'O question\u00e1rio COPSOQ-II avalia 12 dimens\u00f5es psicossociais com 76 perguntas.', font: 'Arial', size: 20 })] }),

      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [600, 2400, 6506],
        rows: [
          new TableRow({ children: [headerCell('#', 600), headerCell('Dimens\u00e3o', 2400), headerCell('O que mede', 6506)] }),
          ...dims.map((d, i) => new TableRow({ children: [
            cell(d[0], 600, i % 2 === 0), cell(d[1], 2400, i % 2 === 0), cell(d[2], 6506, i % 2 === 0)
          ]}))
        ]
      }),

      new Paragraph({ spacing: { before: 400 } }),

      // SECTION 4
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. Documentos Gerados (7 PDFs)')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Todos os documentos s\u00e3o gerados automaticamente e liberados ap\u00f3s confirma\u00e7\u00e3o de pagamento.', font: 'Arial', size: 20 })] }),

      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [3500, 6006],
        rows: [
          new TableRow({ children: [headerCell('Documento', 3500), headerCell('Conte\u00fado', 6006)] }),
          ...pdfs.map((p, i) => new TableRow({ children: [
            cell(p[0], 3500, i % 2 === 0), cell(p[1], 6006, i % 2 === 0)
          ]}))
        ]
      }),

      new Paragraph({ spacing: { before: 400 } }),

      // SECTION 5
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. Recupera\u00e7\u00e3o de Chat por CNPJ')] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Quando o consultor digita um CNPJ de empresa j\u00e1 cadastrada, o SamurAI:', font: 'Arial', size: 20 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'N\u00c3O pede n\u00famero de funcion\u00e1rios ou email novamente', font: 'Arial', size: 20 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Mostra o STATUS ATUAL do processo (em andamento, aguardando, completo)', font: 'Arial', size: 20 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Oferece a pr\u00f3xima a\u00e7\u00e3o pendente com bot\u00e3o contextual', font: 'Arial', size: 20 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Se tudo completo: exibe links dos PDFs para download', font: 'Arial', size: 20 })] }),

      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Black Belt Consultoria SST', bold: true, font: 'Arial', size: 20, color: accent })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'contato@blackbeltconsultoria.com | blackbeltconsultoria.com', font: 'Arial', size: 18, color: '999999' })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('Fluxograma_SamurAI_NR01.docx', buf);
  console.log('DOCX criado com sucesso:', buf.length, 'bytes');
});
