# FILE: NoteAssist_AI_Backend/notes/pdf_service.py
# ============================================================================
# PROFESSIONAL PDF EXPORT – v4  (clean, no duplicate numbers, no ■ boxes)
#
# Key fixes vs v3:
#   • _clean_text()  strips ■ U+25A0 and similar box chars that render black
#   • _render_explanation()  NO longer auto-prefixes section numbers → avoids
#     "1.2.0.1 1.2.1 Install Python" double-numbering (AI already numbers)
#   • Headings styled hierarchically but without extra numeric prefix
#   • Code blocks: strip raw ■ from code content too
#   • split() contract preserved (no LayoutError)
# ============================================================================

from io import BytesIO
from datetime import date
import re
from html import unescape
from html.parser import HTMLParser
import logging

from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable, KeepTogether
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT

logger = logging.getLogger(__name__)

# ── Page geometry ────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
L_MAR = R_MAR = 0.85 * inch
T_MAR = B_MAR = 0.90 * inch
CW    = PAGE_W - L_MAR - R_MAR          # usable content width


# ============================================================================
# Unicode cleaner
# ============================================================================
# Characters that have no glyph in Helvetica/Courier → render as black boxes
_BOX_CHARS = (
    '\u25A0',  # ■  BLACK SQUARE
    '\u25A1',  # □  WHITE SQUARE
    '\u25AA',  # ▪  BLACK SMALL SQUARE
    '\u25AB',  # ▫  WHITE SMALL SQUARE
    '\u25FB',  # ◻
    '\u25FC',  # ◼
    '\u25FD',  # ◽
    '\u25FE',  # ◾
    '\u2B1B',  # ⬛
    '\u2B1C',  # ⬜
    '\uFFFD',  # replacement char
)

def _clean(text: str) -> str:
    """Strip box-like unicode that fails to render in standard PDF fonts."""
    if not text:
        return text
    for ch in _BOX_CHARS:
        text = text.replace(ch, '')
    # collapse multiple spaces that might result
    text = re.sub(r'  +', ' ', text).strip()
    return text


# ============================================================================
# Color Palette
# ============================================================================
class C:
    NAVY        = colors.HexColor('#1a2e4a')
    BLUE        = colors.HexColor('#2563eb')
    BLUE_LIGHT  = colors.HexColor('#3b82f6')
    BLUE_PALE   = colors.HexColor('#eff6ff')
    TEAL        = colors.HexColor('#0d7490')
    TEXT        = colors.HexColor('#1e293b')
    TEXT_MED    = colors.HexColor('#475569')
    TEXT_MUTED  = colors.HexColor('#94a3b8')
    DIVIDER     = colors.HexColor('#e2e8f0')
    CODE_BG     = colors.HexColor('#0d1117')
    CODE_GUTTER = colors.HexColor('#161b22')
    CODE_TEXT   = colors.HexColor('#e6edf3')
    CODE_LN     = colors.HexColor('#484f58')
    CODE_BORDER = colors.HexColor('#30363d')
    SUCCESS     = colors.HexColor('#22c55e')
    ERROR       = colors.HexColor('#ef4444')
    BLOCK_BG    = colors.HexColor('#f8fafc')
    CHAPTER_BG  = colors.HexColor('#1e3a5f')
    WHITE       = colors.white


# ============================================================================
# Page header / footer
# ============================================================================
def _page_decor(canvas, doc, note_title: str):
    canvas.saveState()
    pg = canvas.getPageNumber()

    if pg > 2:                          # header — skip cover + TOC pages
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(C.TEXT_MUTED)
        canvas.drawString(L_MAR, PAGE_H - 0.52 * inch, _clean(note_title))
        canvas.drawRightString(PAGE_W - R_MAR, PAGE_H - 0.52 * inch, 'NoteAssist AI')
        canvas.setStrokeColor(C.DIVIDER)
        canvas.setLineWidth(0.5)
        canvas.line(L_MAR, PAGE_H - 0.57 * inch, PAGE_W - R_MAR, PAGE_H - 0.57 * inch)

    if pg > 1:                          # footer — every page except cover
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(C.TEXT_MUTED)
        canvas.setStrokeColor(C.DIVIDER)
        canvas.setLineWidth(0.5)
        canvas.line(L_MAR, 0.62 * inch, PAGE_W - R_MAR, 0.62 * inch)
        canvas.drawCentredString(PAGE_W / 2, 0.42 * inch, f'— {pg} —')

    canvas.restoreState()


# ============================================================================
# Custom Flowables
# ============================================================================

class ChapterBanner(Flowable):
    """Dark navy full-width banner used for chapter headings."""
    H = 44

    def __init__(self, text, width=None):
        Flowable.__init__(self)
        self.text = _clean(text)
        self._w   = width or CW

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.H + 10)

    def draw(self):
        cv, w = self.canv, self._w
        cv.setFillColor(C.CHAPTER_BG)
        cv.roundRect(0, 5, w, self.H, 6, fill=1, stroke=0)
        cv.setFillColor(C.BLUE_LIGHT)
        cv.rect(0, 5, 5, self.H, fill=1, stroke=0)
        cv.setFillColor(C.WHITE)
        cv.setFont('Helvetica-Bold', 13)
        cv.drawString(16, 5 + self.H / 2 - 5, self.text)


class TopicLabel(Flowable):
    """Blue-tinted pill used for topic headings (e.g. 1.1 Topic Name)."""
    H = 32

    def __init__(self, text, width=None):
        Flowable.__init__(self)
        self.text = _clean(text)
        self._w   = width or CW

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.H + 8)

    def draw(self):
        cv, w = self.canv, self._w
        cv.setFillColor(C.BLUE_PALE)
        cv.roundRect(0, 4, w, self.H, 4, fill=1, stroke=0)
        cv.setStrokeColor(C.BLUE_LIGHT)
        cv.setLineWidth(1.2)
        cv.roundRect(0, 4, w, self.H, 4, fill=0, stroke=1)
        cv.setFillColor(C.NAVY)
        cv.setFont('Helvetica-Bold', 11)
        cv.drawString(12, 4 + self.H / 2 - 5, self.text)


class HRule(Flowable):
    """Thin horizontal divider."""
    def __init__(self, width=None, color=None, thickness=0.5, vpad=5):
        Flowable.__init__(self)
        self._w    = width or CW
        self.color = color or C.DIVIDER
        self.thick = thickness
        self.vpad  = vpad

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.thick + self.vpad * 2)

    def draw(self):
        cv = self.canv
        cv.setStrokeColor(self.color)
        cv.setLineWidth(self.thick)
        cv.line(0, self.vpad, self._w, self.vpad)


# ============================================================================
# CodeEditorBlock  (split() contract preserved)
# ============================================================================
class CodeEditorBlock(Flowable):
    LINE_H  = 14
    HDR_H   = 26
    PAD     = 12
    LN_W    = 36

    def __init__(self, code='', language='python', title=None,
                 show_line_numbers=True, max_width=None,
                 execution_output=None, execution_success=True,
                 _is_continuation=False):
        Flowable.__init__(self)
        self.language         = (language or 'CODE').upper()
        self.title            = _clean(title) if title else None
        self.show_ln          = show_line_numbers
        self.max_width        = max_width or CW
        self.exec_out         = execution_output
        self.exec_ok          = execution_success
        self._cont            = _is_continuation
        # clean box chars from code content too
        raw = _clean(code or '')
        self.lines            = raw.split('\n')

    # heights
    def _body_h(self, n): return n * self.LINE_H + 2 * self.PAD
    def _out_h(self):
        if not self.exec_out or self._cont: return 0
        return len(self.exec_out.split('\n')) * self.LINE_H + 2 * self.PAD + 20
    def _total_h(self, n=None):
        if n is None: n = len(self.lines)
        return self.HDR_H + self._body_h(n) + self._out_h()
    def _min_h(self): return self.HDR_H + self._body_h(1)

    # ReportLab protocol
    def wrap(self, aw, ah):
        self._aw = min(self.max_width, aw)
        return (self._aw, self._total_h())

    def split(self, aw, ah):
        if ah < self._min_h(): return []
        if ah >= self._total_h(): return [self]
        fits = max(int((ah - self.HDR_H - 2 * self.PAD) // self.LINE_H), 1)
        fits = min(fits, len(self.lines))
        if fits >= len(self.lines): return [self]
        lbl = self.title or self.language
        pa = CodeEditorBlock('\n'.join(self.lines[:fits]),
                             self.language.lower(), lbl,
                             self.show_ln, self.max_width)
        pb = CodeEditorBlock('\n'.join(self.lines[fits:]),
                             self.language.lower(), f'{lbl} (cont.)',
                             self.show_ln, self.max_width,
                             self.exec_out, self.exec_ok, True)
        return [pa, pb]

    def draw(self):
        cv    = self.canv
        w     = getattr(self, '_aw', CW)
        n     = len(self.lines)
        tot_h = self._total_h(n)
        y     = tot_h

        # header bar
        y -= self.HDR_H
        cv.setFillColor(colors.HexColor('#21262d'))
        cv.roundRect(0, y, w, self.HDR_H, 5, fill=1, stroke=0)
        for cx, col in [(11, '#ff5f57'), (26, '#febc2e'), (41, '#28c840')]:
            cv.setFillColor(colors.HexColor(col))
            cv.circle(cx, y + self.HDR_H / 2, 4.5, fill=1, stroke=0)
        cv.setFillColor(colors.HexColor('#8b949e'))
        cv.setFont('Helvetica-Bold', 8.5)
        cv.drawCentredString(w / 2, y + 8, self.title or self.language)

        # code body
        bh = self._body_h(n)
        y -= bh
        cv.setFillColor(C.CODE_BG)
        cv.rect(0, y, w, bh, fill=1, stroke=0)
        if self.show_ln:
            cv.setFillColor(C.CODE_GUTTER)
            cv.rect(0, y, self.LN_W, bh, fill=1, stroke=0)
            cv.setStrokeColor(colors.HexColor('#21262d'))
            cv.setLineWidth(0.8)
            cv.line(self.LN_W, y, self.LN_W, y + bh)

        code_y = y + bh - self.PAD - 9
        for i, raw in enumerate(self.lines):
            if code_y < y: break
            if self.show_ln:
                cv.setFillColor(C.CODE_LN)
                cv.setFont('Courier', 8.5)
                cv.drawRightString(self.LN_W - 5, code_y, str(i + 1))
            line = raw.expandtabs(4)
            if len(line) > 110: line = line[:107] + '\u2026'
            cv.setFillColor(C.CODE_TEXT)
            cv.setFont('Courier', 9.5)
            cv.drawString(self.LN_W + 7, code_y, line)
            code_y -= self.LINE_H

        # execution output
        if self.exec_out and not self._cont:
            out_lines = self.exec_out.split('\n')
            obh = len(out_lines) * self.LINE_H + 2 * self.PAD
            y  -= obh + 20
            cv.setFillColor(colors.HexColor('#161b22'))
            cv.rect(0, y, w, obh, fill=1, stroke=0)
            cv.setFillColor(C.SUCCESS if self.exec_ok else C.ERROR)
            cv.setFont('Helvetica-Bold', 8)
            cv.drawString(8, y + obh + 7, 'OUTPUT' if self.exec_ok else 'ERROR')
            oy = y + obh - self.PAD - 9
            cv.setFont('Courier', 8.5)
            for ln in out_lines:
                if oy < y: break
                cv.setFillColor(colors.HexColor('#adbac7'))
                cv.drawString(10, oy, (ln[:110] + '\u2026') if len(ln) > 110 else ln)
                oy -= self.LINE_H

        # border
        cv.setStrokeColor(C.CODE_BORDER)
        cv.setLineWidth(0.8)
        cv.roundRect(0, 0, w, tot_h, 5, fill=0, stroke=1)


# ============================================================================
# Code auto-detection
# ============================================================================
def detect_code_pattern(text, threshold_lines=3):
    if not text or len(text) < 20: return False, None
    lines = text.strip().split('\n')
    if len(lines) < threshold_lines: return False, None
    py = [r'^\s*def\s+\w+\s*\(', r'^\s*class\s+\w+[\(:]',
          r'^\s*import\s+\w+', r'^\s*from\s+\w+\s+import',
          r'^\s*if\s+.*:', r'^\s*for\s+\w+\s+in\s+',
          r'^\s*while\s+.*:', r'^\s*return\s+',
          r'^\s*print\s*\(', r'^\s*elif\s+.*:']
    js = [r'^\s*function\s+\w+\s*\(', r'^\s*const\s+\w+\s*=',
          r'^\s*let\s+\w+\s*=', r'=>\s*{', r'^\s*console\.']
    jv = [r'^\s*public\s+', r'^\s*private\s+',
          r'System\.out\.print', r'#include\s*<']
    scores = {lang: sum(1 for l in lines if any(re.search(p, l) for p in pats))
              for lang, pats in [('python', py), ('javascript', js), ('java', jv)]}
    indent = sum(1 for l in lines if l and l[0] in ' \t') / len(lines)
    best = max(scores, key=scores.get)
    if scores[best] >= 2 or (scores[best] >= 1 and indent > 0.3):
        return True, best
    if len(lines) >= 3 and indent > 0.4:
        return True, 'python'
    return False, None


# ============================================================================
# Rich-text HTML parser
# ============================================================================
class RichTextHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict           = False
        self.convert_charrefs = True
        self.elements         = []
        self.cur_text         = []
        self.tag_stack        = []
        self.list_stack       = []
        self.cur_styles       = {}
        self.align            = 'LEFT'
        self.in_code          = False
        self.code_buf         = []
        self.code_lang        = 'python'

    def handle_starttag(self, tag, attrs):
        ad  = dict(attrs)
        cls = ad.get('class', '')
        self.tag_stack.append((tag, ad))

        if   'ql-align-center'  in cls: self.align = 'CENTER'
        elif 'ql-align-right'   in cls: self.align = 'RIGHT'
        elif 'ql-align-justify' in cls: self.align = 'JUSTIFY'

        if tag == 'pre':
            self._flush()
            self.in_code  = True
            self.code_buf = []
            m = re.search(r'language-(\w+)', cls)
            self.code_lang = m.group(1) if m else 'python'
        elif tag in ('strong','b') and not self.in_code: self.cur_text.append('<b>')
        elif tag in ('em','i')    and not self.in_code: self.cur_text.append('<i>')
        elif tag == 'u'           and not self.in_code: self.cur_text.append('<u>')
        elif tag in ('s','strike') and not self.in_code: self.cur_text.append('<strike>')
        elif tag == 'code'        and not self.in_code:
            self.cur_text.append('<font face="Courier" backColor="#f1f5f9" color="#1e40af">')
        elif tag == 'br':
            (self.code_buf if self.in_code else self.cur_text).append('\n')
        elif tag in ('h1','h2','h3','h4'):
            self._flush()
            self.cur_styles['heading'] = tag
        elif tag == 'blockquote':
            self._flush()
            self.cur_styles['blockquote'] = True
        elif tag in ('ul','ol'):
            self._flush()
            self.list_stack.append(tag)
        elif tag == 'p':
            s = ad.get('style','')
            if 'center'  in s: self.align = 'CENTER'
            elif 'right' in s: self.align = 'RIGHT'
            elif 'justify' in s: self.align = 'JUSTIFY'
        elif tag == 'span' and 'style' in ad:
            s  = ad['style']
            mc = re.search(r'color:\s*([^;]+)', s)
            if mc: self.cur_text.append(f'<font color="{mc.group(1).strip()}">')
            mb = re.search(r'background-color:\s*([^;]+)', s)
            if mb: self.cur_text.append(f'<font backColor="{mb.group(1).strip()}">')

    def handle_endtag(self, tag):
        if self.tag_stack and self.tag_stack[-1][0] == tag:
            self.tag_stack.pop()

        if tag == 'pre':
            if self.in_code:
                self.elements.append({'text': ''.join(self.code_buf),
                    'style':'code','alignment':'LEFT','is_list_item':False,
                    'list_type':None,'is_code':True,'language':self.code_lang})
                self.in_code = False
            return

        if   tag in ('strong','b') and not self.in_code: self.cur_text.append('</b>')
        elif tag in ('em','i')     and not self.in_code: self.cur_text.append('</i>')
        elif tag == 'u'            and not self.in_code: self.cur_text.append('</u>')
        elif tag in ('s','strike') and not self.in_code: self.cur_text.append('</strike>')
        elif tag == 'code'         and not self.in_code: self.cur_text.append('</font>')
        elif tag in ('h1','h2','h3','h4'):
            self._flush(); self.cur_styles.pop('heading', None)
        elif tag == 'blockquote':
            self._flush(); self.cur_styles.pop('blockquote', None)
        elif tag in ('ul','ol'):
            if self.list_stack and self.list_stack[-1] == tag: self.list_stack.pop()
        elif tag in ('li','p'):
            self._flush()
            if tag == 'p': self.align = 'LEFT'
        elif tag == 'span':
            self.cur_text.append('</font>')

    def handle_data(self, data):
        if self.in_code:
            self.code_buf.append(data)
            return
        cleaned = data.strip()
        self.cur_text.append(cleaned if cleaned else (' ' if data else ''))

    def _flush(self):
        raw  = ''.join(self.cur_text).strip()
        self.cur_text = []
        text = _clean(raw)
        if not text: return
        if 'heading' in self.cur_styles:
            sname = f'CustomHeading{self.cur_styles["heading"][1]}'
        elif 'blockquote' in self.cur_styles:
            sname = 'CustomBlockquote'
        elif self.list_stack:
            sname = 'CustomListItem'
        else:
            sname = 'CustomBody'
        self.elements.append({'text': text, 'style': sname,
            'alignment': self.align,
            'is_list_item': bool(self.list_stack),
            'list_type': self.list_stack[-1] if self.list_stack else None,
            'is_code': False, 'language': None})

    def get_elements(self):
        self._flush()
        return self.elements


# ============================================================================
# PDF Export Service
# ============================================================================
class PDFExportService:
    def __init__(self, note):
        self.note   = note
        self.styles = self._make_styles()

    # ── styles ───────────────────────────────────────────────────────────────
    def _make_styles(self):
        base = getSampleStyleSheet()
        def S(name, **kw):
            return ParagraphStyle(name, parent=kw.pop('parent', base['Normal']), **kw)

        return {
            # Cover
            'cover_kicker': S('CK', fontSize=11, textColor=C.BLUE_LIGHT,
                               fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=10),
            'cover_title':  S('CT', fontSize=30, textColor=C.NAVY,
                               fontName='Helvetica-Bold', alignment=TA_CENTER,
                               leading=38, spaceAfter=14),
            'cover_meta':   S('CM', fontSize=10, textColor=C.TEXT_MUTED,
                               alignment=TA_CENTER, leading=16, spaceAfter=5),
            'cover_tags':   S('CG', fontSize=9,  textColor=C.TEXT_MED,
                               alignment=TA_CENTER, leading=14),

            # TOC
            'toc_h':    S('TH',  fontSize=20, textColor=C.NAVY,
                           fontName='Helvetica-Bold', spaceAfter=8),
            'toc_chap': S('TC',  fontSize=11, textColor=C.NAVY,
                           fontName='Helvetica-Bold', spaceAfter=3, spaceBefore=10),
            'toc_top':  S('TT',  fontSize=10, textColor=C.TEXT_MED,
                           spaceAfter=2, leftIndent=20),

            # ── Explanation headings (NO auto-numbers added) ──────────────
            # h1 inside explanation → large section heading
            'CustomHeading1': S('EH1', parent=base['Heading1'],
                                 fontSize=12, textColor=C.NAVY,
                                 fontName='Helvetica-Bold',
                                 spaceBefore=14, spaceAfter=5, leading=17,
                                 keepWithNext=1),
            # h2 → sub-section
            'CustomHeading2': S('EH2', parent=base['Heading2'],
                                 fontSize=11, textColor=C.BLUE,
                                 fontName='Helvetica-Bold',
                                 spaceBefore=11, spaceAfter=4, leading=15,
                                 keepWithNext=1),
            # h3 → sub-sub-section
            'CustomHeading3': S('EH3', parent=base['Heading3'],
                                 fontSize=10.5, textColor=C.TEAL,
                                 fontName='Helvetica-Bold',
                                 spaceBefore=8, spaceAfter=3, leading=14,
                                 keepWithNext=1),
            # h4 → minor label
            'CustomHeading4': S('EH4', parent=base['Normal'],
                                 fontSize=10, textColor=C.TEXT_MED,
                                 fontName='Helvetica-BoldOblique',
                                 spaceBefore=6, spaceAfter=2, leading=13,
                                 keepWithNext=1),

            # Body
            'CustomBody':     S('CB', fontSize=10.5, leading=17,
                                 alignment=TA_JUSTIFY, spaceAfter=7,
                                 textColor=C.TEXT),
            'CustomBlockquote': S('CBQ', fontSize=10, leading=16,
                                   leftIndent=20, rightIndent=20,
                                   spaceBefore=9, spaceAfter=9,
                                   fontName='Helvetica-Oblique',
                                   textColor=C.TEXT_MED,
                                   backColor=C.BLOCK_BG,
                                   borderPadding=(7, 10, 7, 10)),
            'CustomListItem': S('CLI', fontSize=10.5, leading=16,
                                 leftIndent=26, spaceAfter=3, textColor=C.TEXT),
            'bullet':         S('BUL', fontSize=10.5, leading=16,
                                 leftIndent=26, spaceAfter=3, textColor=C.TEXT),

            # Misc
            'section_label': S('SL',  fontSize=9, textColor=C.BLUE_LIGHT,
                                fontName='Helvetica-Bold', spaceBefore=12,
                                spaceAfter=4, leading=12),
            'source_line':   S('SRC', fontSize=9, textColor=C.TEXT_MUTED,
                                fontName='Helvetica-Oblique', spaceAfter=4, leading=13),

            # References
            'ref_title': S('RT', parent=base['Heading1'], fontSize=15,
                            textColor=C.NAVY, fontName='Helvetica-Bold',
                            spaceAfter=12, leading=19),
            'ref_item':  S('RI', fontSize=9.5, leading=14, leftIndent=20,
                            firstLineIndent=-20, spaceAfter=5, textColor=C.TEXT),
            'ref_url':   S('RU', fontSize=8.5, leftIndent=20, spaceAfter=10,
                            fontName='Courier', textColor=C.BLUE),
        }

    # ── export ───────────────────────────────────────────────────────────────
    def export(self):
        buf        = BytesIO()
        note_title = _clean(self.note.title)

        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=L_MAR, rightMargin=R_MAR,
            topMargin=T_MAR,  bottomMargin=B_MAR,
            allowSplitting=1,
        )

        story = []
        self._cover(story)
        story.append(PageBreak())
        self._toc(story)
        story.append(PageBreak())
        sources = self._content(story)
        if sources:
            story.append(PageBreak())
            self._references(story, sources)

        doc.build(
            story,
            onFirstPage=lambda cv, d: _page_decor(cv, d, note_title),
            onLaterPages=lambda cv, d: _page_decor(cv, d, note_title),
        )

        data = buf.getvalue()
        buf.close()
        logger.info(f'PDF generated for note {self.note.id}: {len(data):,} bytes')
        return ContentFile(data, name=f'note_{self.note.slug}_{date.today()}.pdf')

    # ── Cover ─────────────────────────────────────────────────────────────────
    def _cover(self, story):
        story.append(Spacer(1, 1.0 * inch))
        story.append(Paragraph(
            '<font color="#3b82f6">◆  STUDY NOTES</font>',
            self.styles['cover_kicker']
        ))
        story.append(Spacer(1, 0.25 * inch))
        story.append(Paragraph(_clean(self.note.title), self.styles['cover_title']))
        story.append(Spacer(1, 0.35 * inch))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2, vpad=0))
        story.append(Spacer(1, 0.3 * inch))

        created = self.note.created_at.strftime('%B %d, %Y')
        updated = self.note.updated_at.strftime('%B %d, %Y')
        story.append(Paragraph(
            f'Created: <b>{created}</b>  ·  '
            f'Last Updated: <b>{updated}</b>  ·  '
            f'Status: <b>{self.note.get_status_display()}</b>',
            self.styles['cover_meta']
        ))

        if self.note.tags:
            story.append(Spacer(1, 0.12 * inch))
            story.append(Paragraph(
                'Keywords: ' + '  ·  '.join(_clean(t) for t in self.note.tags),
                self.styles['cover_tags']
            ))

        story.append(Spacer(1, 2.5 * inch))
        story.append(HRule(color=C.DIVIDER, vpad=0))
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph(
            '<font color="#94a3b8" size="8">'
            'Generated by NoteAssist AI  ·  Professional Note Management'
            '</font>',
            self.styles['cover_meta']
        ))

    # ── TOC ──────────────────────────────────────────────────────────────────
    def _toc(self, story):
        story.append(Paragraph('Table of Contents', self.styles['toc_h']))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2))
        story.append(Spacer(1, 0.18 * inch))

        rows = []
        cn   = 1
        for ch in self.note.chapters.all().order_by('order'):
            rows.append([
                Paragraph(f'<b>{cn}.  {_clean(ch.title)}</b>', self.styles['toc_chap']),
                Paragraph(
                    f'<font color="#94a3b8">{ch.topics.count()} topics</font>',
                    ParagraphStyle('TR', parent=self.styles['toc_chap'],
                                   alignment=TA_RIGHT, textColor=C.TEXT_MUTED)
                ),
            ])
            tn = 1
            for tp in ch.topics.all().order_by('order'):
                rows.append([
                    Paragraph(f'    {cn}.{tn}  {_clean(tp.name)}', self.styles['toc_top']),
                    Paragraph('', self.styles['toc_top']),
                ])
                tn += 1
            cn += 1

        if rows:
            t = Table(rows, colWidths=[CW * 0.85, CW * 0.15])
            t.setStyle(TableStyle([
                ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING',    (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LINEBELOW',     (0, 0), (-1, -2), 0.3, C.DIVIDER),
            ]))
            story.append(t)

    # ── Chapters & topics ────────────────────────────────────────────────────
    def _content(self, story):
        sources     = {}
        src_counter = 1
        cn          = 1

        for ch in self.note.chapters.all().order_by('order'):
            story.append(ChapterBanner(f'Chapter {cn}  ·  {_clean(ch.title)}'))
            story.append(Spacer(1, 0.16 * inch))

            tn = 1
            for tp in ch.topics.all().order_by('order'):
                items = [
                    TopicLabel(f'{cn}.{tn}   {_clean(tp.name)}'),
                    Spacer(1, 0.1 * inch),
                ]

                # Explanation
                if tp.explanation:
                    exp = self._render_explanation(tp.explanation.content)
                    items.extend(exp)
                    items.append(Spacer(1, 0.06 * inch))

                # Code snippet (dedicated field)
                if tp.code_snippet:
                    clean_code = _clean(unescape(re.sub(r'<[^>]+>', '', tp.code_snippet.code)))
                    items += [
                        Spacer(1, 0.06 * inch),
                        Paragraph('Practical Example', self.styles['section_label']),
                        Spacer(1, 0.05 * inch),
                        CodeEditorBlock(
                            code=clean_code,
                            language=tp.code_snippet.language,
                            title=f'{tp.code_snippet.language.upper()} · Example Code',
                            show_line_numbers=True,
                        ),
                        Spacer(1, 0.1 * inch),
                    ]

                # Source citation
                if tp.source:
                    key = tp.source.url
                    if key not in sources:
                        sources[key] = {'number': src_counter,
                                        'title': _clean(tp.source.title),
                                        'url': tp.source.url}
                        src_counter += 1
                    items.append(Paragraph(
                        f'<font color="#94a3b8">Source [{sources[key]["number"]}]: '
                        f'{_clean(tp.source.title)}</font>',
                        self.styles['source_line']
                    ))

                items.append(Spacer(1, 0.2 * inch))

                # Keep label + first body item together
                if len(items) > 2:
                    story.append(KeepTogether(items[:3]))
                    story.extend(items[3:])
                else:
                    story.extend(items)

                tn += 1

            cn += 1
            story.append(Spacer(1, 0.25 * inch))

        return sources

    # ── Render explanation HTML ──────────────────────────────────────────────
    def _render_explanation(self, html_content: str) -> list:
        """
        Convert rich-text HTML to story items.

        Heading strategy:
          h1 → CustomHeading1  (large section, no extra numbering)
          h2 → CustomHeading2  (sub-section,   no extra numbering)
          h3 → CustomHeading3  (minor label,   no extra numbering)
          h4 → CustomHeading4  (note/tip label)

        Rationale: The AI content already includes its own numbering
        (e.g. "1.2.1 Install Python", "2. Comparison Operators").
        Adding another numeric prefix creates ugly doubles like
        "1.2.0.1 1.2.1 Install Python".  We style-only instead.
        """
        parser = RichTextHTMLParser()
        parser.feed(html_content)
        elements = parser.get_elements()

        items        = []
        list_counter = 1

        for elem in elements:
            text  = elem['text']      # already _clean()'d by _flush()
            align = elem['alignment']

            # ── explicit code block (from <pre>) ──────────────────────
            if elem.get('is_code'):
                items += [
                    Spacer(1, 0.08 * inch),
                    CodeEditorBlock(
                        code=unescape(text),
                        language=elem.get('language') or 'python',
                        title=f"{(elem.get('language') or 'code').upper()} Code",
                        show_line_numbers=True,
                    ),
                    Spacer(1, 0.1 * inch),
                ]
                continue

            # ── auto-detect code in plain paragraphs ──────────────────
            is_code, lang = detect_code_pattern(text)
            if is_code:
                items += [
                    Spacer(1, 0.08 * inch),
                    CodeEditorBlock(
                        code=unescape(text),
                        language=lang or 'python',
                        title=f'{(lang or "code").upper()} Code',
                        show_line_numbers=True,
                    ),
                    Spacer(1, 0.1 * inch),
                ]
                continue

            sname = elem['style']

            # ── headings (styled only, NO numeric prefix added) ───────
            if sname in ('CustomHeading1', 'CustomHeading2',
                         'CustomHeading3', 'CustomHeading4'):
                items.append(Paragraph(text, self.styles[sname]))
                list_counter = 1
                continue

            # ── alignment variant ─────────────────────────────────────
            base_st = self.styles.get(sname, self.styles['CustomBody'])
            if align == 'CENTER':
                style = ParagraphStyle('_c', parent=base_st, alignment=TA_CENTER)
            elif align == 'RIGHT':
                style = ParagraphStyle('_r', parent=base_st, alignment=TA_RIGHT)
            else:
                style = base_st

            # ── list items ────────────────────────────────────────────
            if elem['is_list_item']:
                bullet = '•' if elem['list_type'] == 'ul' else f'{list_counter}.'
                if elem['list_type'] != 'ul':
                    list_counter += 1
                items.append(Paragraph(f'{bullet}  {text}', self.styles['bullet']))
            else:
                items.append(Paragraph(text, style))
                list_counter = 1

        return items

    # ── References ───────────────────────────────────────────────────────────
    def _references(self, story, sources):
        story.append(Paragraph('References', self.styles['ref_title']))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2))
        story.append(Spacer(1, 0.12 * inch))
        for src in sorted(sources.values(), key=lambda x: x['number']):
            story.append(Paragraph(
                f'[{src["number"]}]  {src["title"]}',
                self.styles['ref_item']
            ))
            story.append(Paragraph(
                f"<link href=\"{src['url']}\">{src['url']}</link>",
                self.styles['ref_url']
            ))


# ============================================================================
# Public entry point
# ============================================================================
def export_note_to_pdf(note):
    return PDFExportService(note).export()