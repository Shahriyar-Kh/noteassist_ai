# FILE: NoteAssist_AI_Backend/notes/pdf_service.py
# ============================================================================
# PROFESSIONAL PDF EXPORT - v3
#  • Fixed split() contract (no more LayoutError)
#  • Spacious code blocks that breathe
#  • Subtopic numbering: Chapter 1 → Topic 1.1 → Heading 1.1.1, 1.1.2
#  • Running header/footer with page numbers on every page
#  • Professional cover page with decorative border
#  • Color-coded chapter banners
# ============================================================================

from io import BytesIO
from datetime import date
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable, KeepTogether
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
import re
from html import unescape
from html.parser import HTMLParser
import logging

logger = logging.getLogger(__name__)

# ── Page geometry ──────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
LEFT_MARGIN   = 0.85 * inch
RIGHT_MARGIN  = 0.85 * inch
TOP_MARGIN    = 0.9 * inch
BOTTOM_MARGIN = 0.9 * inch
CONTENT_W     = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN


# ============================================================================
# Color Palette
# ============================================================================
class C:
    NAVY        = colors.HexColor('#1a2e4a')
    BLUE        = colors.HexColor('#2563eb')
    BLUE_LIGHT  = colors.HexColor('#3b82f6')
    BLUE_PALE   = colors.HexColor('#eff6ff')
    TEAL        = colors.HexColor('#0891b2')
    TEAL_PALE   = colors.HexColor('#ecfeff')
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
    BLOCKQUOTE  = colors.HexColor('#f8fafc')
    BQ_BORDER   = colors.HexColor('#2563eb')
    WHITE       = colors.white
    BLACK       = colors.black
    CHAPTER_BG  = colors.HexColor('#1e3a5f')


# ============================================================================
# Page-level header / footer  (called by doc.build via onPage callbacks)
# ============================================================================
def _draw_header_footer(canvas, doc, note_title):
    canvas.saveState()
    page_num = canvas.getPageNumber()

    # ── Header (skip page 1 = cover, page 2 = TOC) ──────────────────────
    if page_num > 2:
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(C.TEXT_MUTED)
        canvas.drawString(LEFT_MARGIN, PAGE_H - 0.55 * inch, note_title)
        canvas.drawRightString(
            PAGE_W - RIGHT_MARGIN, PAGE_H - 0.55 * inch,
            'NoteAssist AI'
        )
        # thin rule below header
        canvas.setStrokeColor(C.DIVIDER)
        canvas.setLineWidth(0.5)
        canvas.line(LEFT_MARGIN, PAGE_H - 0.6 * inch,
                    PAGE_W - RIGHT_MARGIN, PAGE_H - 0.6 * inch)

    # ── Footer on every page except cover ───────────────────────────────
    if page_num > 1:
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(C.TEXT_MUTED)
        canvas.setStrokeColor(C.DIVIDER)
        canvas.setLineWidth(0.5)
        canvas.line(LEFT_MARGIN, 0.65 * inch,
                    PAGE_W - RIGHT_MARGIN, 0.65 * inch)
        canvas.drawCentredString(PAGE_W / 2, 0.45 * inch, f'— {page_num} —')

    canvas.restoreState()


# ============================================================================
# Decorative helpers (drawn directly on canvas)
# ============================================================================
class ChapterBanner(Flowable):
    """Full-width dark-blue banner for chapter titles."""
    H = 48

    def __init__(self, text, width=None):
        Flowable.__init__(self)
        self.text  = text
        self._w    = width or CONTENT_W

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.H + 12)

    def draw(self):
        c = self.canv
        w = self._w

        # background rect
        c.setFillColor(C.CHAPTER_BG)
        c.roundRect(0, 6, w, self.H, 6, fill=1, stroke=0)

        # left accent bar
        c.setFillColor(C.BLUE_LIGHT)
        c.rect(0, 6, 5, self.H, fill=1, stroke=0)

        # text
        c.setFillColor(C.WHITE)
        c.setFont('Helvetica-Bold', 14)
        c.drawString(18, 6 + self.H / 2 - 5, self.text)


class TopicLabel(Flowable):
    """Coloured pill for topic headings (1.1, 1.2 …)."""
    H = 34

    def __init__(self, text, width=None):
        Flowable.__init__(self)
        self.text = text
        self._w   = width or CONTENT_W

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.H + 8)

    def draw(self):
        c   = self.canv
        w   = self._w

        c.setFillColor(C.BLUE_PALE)
        c.roundRect(0, 4, w, self.H, 5, fill=1, stroke=0)

        c.setStrokeColor(C.BLUE_LIGHT)
        c.setLineWidth(1.5)
        c.roundRect(0, 4, w, self.H, 5, fill=0, stroke=1)

        c.setFillColor(C.NAVY)
        c.setFont('Helvetica-Bold', 12)
        c.drawString(14, 4 + self.H / 2 - 5, self.text)


class HRule(Flowable):
    """Thin horizontal rule."""
    def __init__(self, width=None, color=None, thickness=0.5, vpad=6):
        Flowable.__init__(self)
        self._w   = width or CONTENT_W
        self.color = color or C.DIVIDER
        self.thick = thickness
        self.vpad  = vpad

    def wrap(self, aw, ah):
        self._w = min(self._w, aw)
        return (self._w, self.thick + self.vpad * 2)

    def draw(self):
        c = self.canv
        c.setStrokeColor(self.color)
        c.setLineWidth(self.thick)
        c.line(0, self.vpad, self._w, self.vpad)


# ============================================================================
# FIXED CodeEditorBlock (split() contract preserved, better visual)
# ============================================================================
class CodeEditorBlock(Flowable):
    LINE_HEIGHT    = 14   # was 12 – more readable
    HEADER_HEIGHT  = 28
    PADDING        = 14   # was 12
    LN_WIDTH       = 38

    def __init__(self, code='', language='python', title=None,
                 show_line_numbers=True, max_width=None,
                 execution_output=None, execution_success=True,
                 _is_continuation=False):
        Flowable.__init__(self)
        self.language          = (language or 'CODE').upper()
        self.title             = title
        self.show_line_numbers = show_line_numbers
        self.max_width         = max_width or CONTENT_W
        self.execution_output  = execution_output
        self.execution_success = execution_success
        self._is_continuation  = _is_continuation
        self.lines             = (code or '').split('\n')

    # ── height helpers ────────────────────────────────────────────────────
    def _body_h(self, n):
        return n * self.LINE_HEIGHT + 2 * self.PADDING

    def _out_h(self):
        if not self.execution_output or self._is_continuation:
            return 0
        return (len(self.execution_output.split('\n'))
                * self.LINE_HEIGHT + 2 * self.PADDING + 22)

    def _total_h(self, n=None):
        if n is None:
            n = len(self.lines)
        return self.HEADER_HEIGHT + self._body_h(n) + self._out_h()

    def _min_h(self):
        return self.HEADER_HEIGHT + self._body_h(1)

    # ── ReportLab protocol ────────────────────────────────────────────────
    def wrap(self, availWidth, availHeight):
        self._avail_width = min(self.max_width, availWidth)
        return (self._avail_width, self._total_h())

    def split(self, availWidth, availHeight):
        if availHeight < self._min_h():
            return []
        if availHeight >= self._total_h():
            return [self]
        usable    = availHeight - self.HEADER_HEIGHT - 2 * self.PADDING
        fits      = max(int(usable // self.LINE_HEIGHT), 1)
        fits      = min(fits, len(self.lines))
        if fits >= len(self.lines):
            return [self]
        label = self.title or self.language
        pa = CodeEditorBlock(
            code='\n'.join(self.lines[:fits]),
            language=self.language.lower(),
            title=label,
            show_line_numbers=self.show_line_numbers,
            max_width=self.max_width,
        )
        pb = CodeEditorBlock(
            code='\n'.join(self.lines[fits:]),
            language=self.language.lower(),
            title=f'{label} (cont.)',
            show_line_numbers=self.show_line_numbers,
            max_width=self.max_width,
            execution_output=self.execution_output,
            execution_success=self.execution_success,
            _is_continuation=True,
        )
        return [pa, pb]

    # ── Draw ──────────────────────────────────────────────────────────────
    def draw(self):
        cv    = self.canv
        width = getattr(self, '_avail_width', CONTENT_W)
        n     = len(self.lines)
        tot_h = self._total_h(n)
        y     = tot_h

        # ── header bar ────────────────────────────────────────────────────
        y -= self.HEADER_HEIGHT
        cv.setFillColor(colors.HexColor('#21262d'))
        cv.roundRect(0, y, width, self.HEADER_HEIGHT, 6, fill=1, stroke=0)

        # traffic lights
        for cx, col in [(12, '#ff5f57'), (28, '#febc2e'), (44, '#28c840')]:
            cv.setFillColor(colors.HexColor(col))
            cv.circle(cx, y + self.HEADER_HEIGHT / 2, 5, fill=1, stroke=0)

        # language / title label (centered)
        cv.setFillColor(colors.HexColor('#8b949e'))
        cv.setFont('Helvetica-Bold', 9)
        cv.drawCentredString(width / 2, y + 9, self.title or self.language)

        # ── code body ─────────────────────────────────────────────────────
        body_h = self._body_h(n)
        y -= body_h

        cv.setFillColor(C.CODE_BG)
        cv.rect(0, y, width, body_h, fill=1, stroke=0)

        if self.show_line_numbers:
            cv.setFillColor(C.CODE_GUTTER)
            cv.rect(0, y, self.LN_WIDTH, body_h, fill=1, stroke=0)
            # gutter right border
            cv.setStrokeColor(colors.HexColor('#21262d'))
            cv.setLineWidth(1)
            cv.line(self.LN_WIDTH, y, self.LN_WIDTH, y + body_h)

        code_y = y + body_h - self.PADDING - 10
        for i, raw_line in enumerate(self.lines):
            if code_y < y:
                break
            if self.show_line_numbers:
                cv.setFillColor(C.CODE_LN)
                cv.setFont('Courier', 9)
                cv.drawRightString(self.LN_WIDTH - 6, code_y, str(i + 1))

            # truncate very long lines gracefully
            line = raw_line.expandtabs(4)
            if len(line) > 110:
                line = line[:107] + '\u2026'

            cv.setFillColor(C.CODE_TEXT)
            cv.setFont('Courier', 10)
            cv.drawString(self.LN_WIDTH + 8, code_y, line)
            code_y -= self.LINE_HEIGHT

        # ── execution output ──────────────────────────────────────────────
        if self.execution_output and not self._is_continuation:
            out_lines = self.execution_output.split('\n')
            out_bh    = len(out_lines) * self.LINE_HEIGHT + 2 * self.PADDING
            y -= out_bh + 22

            cv.setFillColor(colors.HexColor('#161b22'))
            cv.rect(0, y, width, out_bh, fill=1, stroke=0)

            ok = self.execution_success
            lbl_col = C.SUCCESS if ok else C.ERROR
            cv.setFillColor(lbl_col)
            cv.setFont('Helvetica-Bold', 8)
            label_txt = '▶  OUTPUT' if ok else '✕  ERROR'
            cv.drawString(8, y + out_bh + 8, label_txt)

            out_y = y + out_bh - self.PADDING - 10
            cv.setFont('Courier', 9)
            for ln in out_lines:
                if out_y < y:
                    break
                cv.setFillColor(colors.HexColor('#adbac7'))
                cv.drawString(10, out_y, (ln[:110] + '\u2026') if len(ln) > 110 else ln)
                out_y -= self.LINE_HEIGHT

        # ── outer border ──────────────────────────────────────────────────
        cv.setStrokeColor(C.CODE_BORDER)
        cv.setLineWidth(1)
        cv.roundRect(0, 0, width, tot_h, 6, fill=0, stroke=1)


# ============================================================================
# Code detection
# ============================================================================
def detect_code_pattern(text, threshold_lines=3):
    if not text or len(text) < 20:
        return False, None
    lines = text.strip().split('\n')
    if len(lines) < threshold_lines:
        return False, None
    py = [r'^\s*def\s+\w+\s*\(', r'^\s*class\s+\w+[\(:]',
          r'^\s*import\s+\w+', r'^\s*from\s+\w+\s+import',
          r'^\s*if\s+.*:', r'^\s*for\s+\w+\s+in\s+',
          r'^\s*while\s+.*:', r'^\s*return\s+',
          r'^\s*print\s*\(', r'^\s*elif\s+.*:']
    js = [r'^\s*function\s+\w+\s*\(', r'^\s*const\s+\w+\s*=',
          r'^\s*let\s+\w+\s*=', r'=>\s*{', r'^\s*console\.']
    jv = [r'^\s*public\s+', r'^\s*private\s+', r'System\.out\.print',
          r'#include\s*<']
    sc = {l: sum(1 for x in lines if any(re.search(p, x) for p in pat))
          for l, pat in [('python', py), ('javascript', js), ('java', jv)]}
    indented = sum(1 for l in lines if l and l[0] in ' \t') / len(lines)
    best = max(sc, key=sc.get)
    if sc[best] >= 2 or (sc[best] >= 1 and indented > 0.3):
        return True, best
    if len(lines) >= 3 and indented > 0.4:
        return True, 'python'
    return False, None


# ============================================================================
# Rich-text HTML → elements
# ============================================================================
class RichTextHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict           = False
        self.convert_charrefs = True
        self.elements         = []
        self.current_text     = []
        self.tag_stack        = []
        self.list_stack       = []
        self.current_styles   = {}
        self.alignment        = 'LEFT'
        self.in_code_block    = False
        self.code_content     = []
        self.code_lang        = 'python'

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        self.tag_stack.append((tag, ad))
        cls = ad.get('class', '')
        if 'ql-align-center'  in cls: self.alignment = 'CENTER'
        elif 'ql-align-right' in cls: self.alignment = 'RIGHT'
        elif 'ql-align-justify' in cls: self.alignment = 'JUSTIFY'

        if tag == 'pre':
            self._flush()
            self.in_code_block = True
            self.code_content  = []
            m = re.search(r'language-(\w+)', cls)
            self.code_lang = m.group(1) if m else 'python'
        elif tag in ('strong', 'b')  and not self.in_code_block: self.current_text.append('<b>')
        elif tag in ('em', 'i')      and not self.in_code_block: self.current_text.append('<i>')
        elif tag == 'u'              and not self.in_code_block: self.current_text.append('<u>')
        elif tag in ('s', 'strike')  and not self.in_code_block: self.current_text.append('<strike>')
        elif tag == 'code'           and not self.in_code_block:
            self.current_text.append('<font face="Courier" backColor="#f1f5f9" color="#1e40af">')
        elif tag == 'br':
            (self.code_content if self.in_code_block else self.current_text).append('\n')
        elif tag in ('h1','h2','h3','h4'):
            self._flush()
            self.current_styles['heading'] = tag
        elif tag == 'blockquote':
            self._flush()
            self.current_styles['blockquote'] = True
        elif tag in ('ul','ol'):
            self._flush()
            self.list_stack.append(tag)
        elif tag == 'p':
            s = ad.get('style', '')
            if 'center'  in s: self.alignment = 'CENTER'
            elif 'right' in s: self.alignment = 'RIGHT'
            elif 'justify' in s: self.alignment = 'JUSTIFY'
        elif tag == 'span' and 'style' in ad:
            s = ad['style']
            m = re.search(r'color:\s*([^;]+)', s)
            if m: self.current_text.append(f'<font color="{m.group(1).strip()}">')
            m2 = re.search(r'background-color:\s*([^;]+)', s)
            if m2: self.current_text.append(f'<font backColor="{m2.group(1).strip()}">')

    def handle_endtag(self, tag):
        if self.tag_stack and self.tag_stack[-1][0] == tag:
            self.tag_stack.pop()
        if tag == 'pre':
            if self.in_code_block:
                self.elements.append({'text': ''.join(self.code_content),
                    'style': 'code', 'alignment': 'LEFT',
                    'is_list_item': False, 'list_type': None,
                    'is_code': True, 'language': self.code_lang})
                self.in_code_block = False
            return
        if tag in ('strong','b') and not self.in_code_block: self.current_text.append('</b>')
        elif tag in ('em','i')   and not self.in_code_block: self.current_text.append('</i>')
        elif tag == 'u'          and not self.in_code_block: self.current_text.append('</u>')
        elif tag in ('s','strike') and not self.in_code_block: self.current_text.append('</strike>')
        elif tag == 'code'       and not self.in_code_block: self.current_text.append('</font>')
        elif tag in ('h1','h2','h3','h4'):
            self._flush()
            self.current_styles.pop('heading', None)
        elif tag == 'blockquote':
            self._flush()
            self.current_styles.pop('blockquote', None)
        elif tag in ('ul','ol'):
            if self.list_stack and self.list_stack[-1] == tag:
                self.list_stack.pop()
        elif tag in ('li','p'):
            self._flush()
            if tag == 'p': self.alignment = 'LEFT'
        elif tag == 'span':
            self.current_text.append('</font>')

    def handle_data(self, data):
        if self.in_code_block:
            self.code_content.append(data); return
        cleaned = data.strip()
        self.current_text.append(cleaned if cleaned else (' ' if data else ''))

    def _flush(self):
        text = ''.join(self.current_text).strip()
        self.current_text = []
        if not text: return
        if 'heading' in self.current_styles:
            sname = f'CustomHeading{self.current_styles["heading"][1]}'
        elif 'blockquote' in self.current_styles:
            sname = 'CustomBlockquote'
        elif self.list_stack:
            sname = 'CustomListItem'
        else:
            sname = 'CustomBody'
        self.elements.append({'text': text, 'style': sname,
            'alignment': self.alignment,
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

    # ── styles ───────────────────────────────────────────────────────────
    def _make_styles(self):
        base = getSampleStyleSheet()
        def S(name, **kw):
            return ParagraphStyle(name, parent=kw.pop('parent', base['Normal']), **kw)

        return {
            # Title page
            'cover_kicker':  S('CK',  fontSize=11, textColor=C.BLUE_LIGHT,
                                fontName='Helvetica-Bold', alignment=TA_CENTER,
                                spaceBefore=0, spaceAfter=8),
            'cover_title':   S('CT',  fontSize=32, textColor=C.WHITE,
                                fontName='Helvetica-Bold', alignment=TA_CENTER,
                                leading=40, spaceBefore=0, spaceAfter=16),
            'cover_meta':    S('CM',  fontSize=10, textColor=colors.HexColor('#94a3b8'),
                                alignment=TA_CENTER, leading=16, spaceAfter=6),
            'cover_tags':    S('CTG', fontSize=9,  textColor=colors.HexColor('#64748b'),
                                alignment=TA_CENTER, leading=14, spaceAfter=0),

            # TOC
            'toc_h':         S('TOH', fontSize=20, textColor=C.NAVY,
                                fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=0),
            'toc_chap':      S('TCH', fontSize=11, textColor=C.NAVY,
                                fontName='Helvetica-Bold', spaceAfter=3, spaceBefore=10,
                                leftIndent=0),
            'toc_topic':     S('TTP', fontSize=10, textColor=C.TEXT_MED,
                                spaceAfter=2, leftIndent=18),

            # Body heading styles (within explanation)
            'SubHeading1':   S('SH1', parent=base['Heading1'], fontSize=13,
                                textColor=C.NAVY, fontName='Helvetica-Bold',
                                spaceBefore=16, spaceAfter=6, leading=18, keepWithNext=1),
            'SubHeading2':   S('SH2', parent=base['Heading2'], fontSize=11,
                                textColor=C.BLUE,  fontName='Helvetica-Bold',
                                spaceBefore=12, spaceAfter=4, leading=16, keepWithNext=1),
            'SubHeading3':   S('SH3', parent=base['Heading3'], fontSize=10,
                                textColor=C.TEAL,  fontName='Helvetica-BoldOblique',
                                spaceBefore=8, spaceAfter=3, leading=14, keepWithNext=1),

            'CustomHeading1': S('CH1', parent=base['Heading1'], fontSize=13,
                                textColor=C.NAVY, fontName='Helvetica-Bold',
                                spaceBefore=16, spaceAfter=6, leading=18, keepWithNext=1),
            'CustomHeading2': S('CH2', parent=base['Heading2'], fontSize=11,
                                textColor=C.BLUE, fontName='Helvetica-Bold',
                                spaceBefore=12, spaceAfter=4, leading=16, keepWithNext=1),
            'CustomHeading3': S('CH3', parent=base['Heading3'], fontSize=10,
                                textColor=C.TEAL, fontName='Helvetica-BoldOblique',
                                spaceBefore=8, spaceAfter=3, leading=14, keepWithNext=1),
            'CustomHeading4': S('CH4', parent=base['Heading3'], fontSize=10,
                                textColor=C.TEXT_MED, fontName='Helvetica-BoldOblique',
                                spaceBefore=6, spaceAfter=2, leading=13, keepWithNext=1),

            # Body text
            'CustomBody':     S('CB', fontSize=10.5, leading=17, alignment=TA_JUSTIFY,
                                spaceAfter=7, textColor=C.TEXT, firstLineIndent=0),
            'CustomBlockquote': S('CBQ', fontSize=10, leading=16,
                                leftIndent=22, rightIndent=22,
                                spaceBefore=10, spaceAfter=10,
                                fontName='Helvetica-Oblique',
                                textColor=C.TEXT_MED,
                                backColor=C.BLOCKQUOTE,
                                borderPadding=(8, 12, 8, 12)),
            'CustomListItem': S('CLI', fontSize=10.5, leading=17,
                                leftIndent=28, firstLineIndent=0,
                                spaceAfter=3, textColor=C.TEXT),
            'bullet':         S('BUL', fontSize=10.5, leading=17,
                                leftIndent=28, firstLineIndent=0,
                                spaceAfter=3, textColor=C.TEXT),

            # Misc
            'section_label':  S('SL', fontSize=9, textColor=C.BLUE_LIGHT,
                                fontName='Helvetica-Bold', spaceBefore=14,
                                spaceAfter=4, leading=12),
            'source_line':    S('SOL', fontSize=9, textColor=C.TEXT_MUTED,
                                fontName='Helvetica-Oblique', spaceAfter=4, leading=13),

            # References
            'ref_title':      S('RT', parent=base['Heading1'], fontSize=16,
                                textColor=C.NAVY, fontName='Helvetica-Bold',
                                spaceAfter=14, leading=20),
            'ref_item':       S('RI', fontSize=9.5, leading=14, leftIndent=22,
                                firstLineIndent=-22, spaceAfter=6, textColor=C.TEXT),
            'ref_url':        S('RU', fontSize=8.5, leftIndent=22, spaceAfter=10,
                                fontName='Courier', textColor=C.BLUE),
        }

    # ── public entry ─────────────────────────────────────────────────────
    def export(self):
        buf = BytesIO()
        note_title = self.note.title

        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
            topMargin=TOP_MARGIN,   bottomMargin=BOTTOM_MARGIN,
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
            onFirstPage=lambda cv, d: _draw_header_footer(cv, d, note_title),
            onLaterPages=lambda cv, d: _draw_header_footer(cv, d, note_title),
        )

        data = buf.getvalue()
        buf.close()
        logger.info(f'PDF generated for note {self.note.id}: {len(data):,} bytes')
        return ContentFile(data, name=f'note_{self.note.slug}_{date.today()}.pdf')

    # ── Cover page ────────────────────────────────────────────────────────
    def _cover(self, story):
        # Dark hero background via table
        bg_data = [['']]
        tbl = Table(bg_data, colWidths=[CONTENT_W], rowHeights=[3.8 * inch])
        tbl.setStyle(TableStyle([
            ('BACKGROUND',   (0, 0), (-1, -1), C.CHAPTER_BG),
            ('ROUNDEDCORNERS', [10]),
            ('TOPPADDING',   (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 0),
        ]))

        # Build cover card with text on dark background using canvas directly
        story.append(Spacer(1, 0.6 * inch))
        # Kicker
        story.append(Paragraph(
            '<font color="#60a5fa">◆  STUDY NOTES</font>',
            self.styles['cover_kicker']
        ))
        story.append(Spacer(1, 0.15 * inch))

        # Title on white background (simulated with a colored paragraph)
        title_style = ParagraphStyle(
            'CoverTitle2', parent=self.styles['cover_title'],
            textColor=C.NAVY, backColor=colors.white,
            borderPadding=(12, 20, 12, 20),
        )
        story.append(Paragraph(self.note.title, title_style))
        story.append(Spacer(1, 0.4 * inch))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2, vpad=0))
        story.append(Spacer(1, 0.3 * inch))

        created = self.note.created_at.strftime('%B %d, %Y')
        updated = self.note.updated_at.strftime('%B %d, %Y')
        story.append(Paragraph(
            f'Created: <b>{created}</b>  ·  Last Updated: <b>{updated}</b>  ·  '
            f'Status: <b>{self.note.get_status_display()}</b>',
            self.styles['cover_meta']
        ))

        if self.note.tags:
            story.append(Spacer(1, 0.15 * inch))
            story.append(Paragraph(
                'Keywords: ' + ' · '.join(self.note.tags),
                self.styles['cover_tags']
            ))

        story.append(Spacer(1, 1.8 * inch))
        story.append(HRule(color=C.DIVIDER, thickness=0.5, vpad=0))
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph(
            '<font color="#94a3b8" size="8">Generated by NoteAssist AI · Professional Note Management</font>',
            self.styles['cover_meta']
        ))

    # ── TOC ──────────────────────────────────────────────────────────────
    def _toc(self, story):
        story.append(Paragraph('Table of Contents', self.styles['toc_h']))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2))
        story.append(Spacer(1, 0.2 * inch))

        rows = []
        cn = 1
        for ch in self.note.chapters.all().order_by('order'):
            # Chapter row
            rows.append([
                Paragraph(f'<b>{cn}. {ch.title}</b>', self.styles['toc_chap']),
                Paragraph(f'<font color="#94a3b8">{ch.topics.count()} topics</font>',
                          ParagraphStyle('TR', parent=self.styles['toc_chap'],
                                         alignment=TA_RIGHT, textColor=C.TEXT_MUTED))
            ])
            tn = 1
            for tp in ch.topics.all().order_by('order'):
                rows.append([
                    Paragraph(f'  {cn}.{tn}  {tp.name}', self.styles['toc_topic']),
                    Paragraph('', self.styles['toc_topic']),
                ])
                tn += 1
            cn += 1

        if rows:
            t = Table(rows, colWidths=[CONTENT_W * 0.85, CONTENT_W * 0.15])
            t.setStyle(TableStyle([
                ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING',    (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LINEBELOW',     (0, 0), (-1, -2), 0.3, C.DIVIDER),
            ]))
            story.append(t)

    # ── Main content ──────────────────────────────────────────────────────
    def _content(self, story):
        sources     = {}
        src_counter = 1
        cn          = 1

        for ch in self.note.chapters.all().order_by('order'):
            story.append(ChapterBanner(f'Chapter {cn}  ·  {ch.title}'))
            story.append(Spacer(1, 0.18 * inch))

            tn = 1
            for tp in ch.topics.all().order_by('order'):
                # Topic label banner
                topic_label = f'{cn}.{tn}   {tp.name}'
                topic_items = [TopicLabel(topic_label), Spacer(1, 0.12 * inch)]

                # Explanation
                if tp.explanation:
                    exp_items, heading_counter = self._render_explanation(
                        tp.explanation.content, cn, tn
                    )
                    topic_items.extend(exp_items)
                    topic_items.append(Spacer(1, 0.08 * inch))

                # Code snippet (from dedicated code_snippet field)
                if tp.code_snippet:
                    clean = unescape(re.sub(r'<[^>]+>', '', tp.code_snippet.code))
                    topic_items.append(Spacer(1, 0.08 * inch))
                    topic_items.append(Paragraph('Practical Example', self.styles['section_label']))
                    topic_items.append(Spacer(1, 0.06 * inch))
                    topic_items.append(CodeEditorBlock(
                        code=clean,
                        language=tp.code_snippet.language,
                        title=f'{tp.code_snippet.language.upper()} · Example Code',
                        show_line_numbers=True,
                    ))
                    topic_items.append(Spacer(1, 0.12 * inch))

                # Source
                if tp.source:
                    key = tp.source.url
                    if key not in sources:
                        sources[key] = {'number': src_counter,
                                        'title': tp.source.title, 'url': tp.source.url}
                        src_counter += 1
                    topic_items.append(Paragraph(
                        f'<font color="#94a3b8">📎 Source [{sources[key]["number"]}]: '
                        f'{tp.source.title}</font>',
                        self.styles['source_line']
                    ))

                topic_items.append(Spacer(1, 0.22 * inch))

                # Keep topic label + first paragraph together to avoid orphan headers
                if len(topic_items) > 2:
                    story.append(KeepTogether(topic_items[:3]))
                    story.extend(topic_items[3:])
                else:
                    story.extend(topic_items)

                tn += 1

            cn += 1
            story.append(Spacer(1, 0.3 * inch))

        return sources

    # ── Render explanation HTML → story items ────────────────────────────
    def _render_explanation(self, html_content, chapter_num, topic_num):
        """
        Parse rich-text HTML and build story items.
        h2 → subtopic 1.1.1, h3 → 1.1.1.1, etc.
        Returns (items, final_heading_counter)
        """
        parser = RichTextHTMLParser()
        parser.feed(html_content)
        elements = parser.get_elements()

        items           = []
        list_counter    = 1
        h2_counter      = 0
        h3_counter      = 0

        for elem in elements:
            text      = elem['text']
            alignment = elem['alignment']

            # ── Inline code block ──────────────────────────────────────
            if elem.get('is_code'):
                items.append(Spacer(1, 0.1 * inch))
                items.append(CodeEditorBlock(
                    code=unescape(text),
                    language=elem.get('language') or 'python',
                    title=f"{(elem.get('language') or 'code').upper()} Code",
                    show_line_numbers=True,
                ))
                items.append(Spacer(1, 0.12 * inch))
                continue

            # ── Auto-detect code patterns ─────────────────────────────
            is_code, lang = detect_code_pattern(text)
            if is_code:
                items.append(Spacer(1, 0.1 * inch))
                items.append(CodeEditorBlock(
                    code=unescape(text),
                    language=lang or 'python',
                    title=f'{(lang or "code").upper()} Code',
                    show_line_numbers=True,
                ))
                items.append(Spacer(1, 0.12 * inch))
                continue

            sname = elem['style']

            # ── Numbered headings (subtopics) ─────────────────────────
            if sname == 'CustomHeading2':
                h2_counter += 1
                h3_counter  = 0
                numbered = f'{chapter_num}.{topic_num}.{h2_counter}  {text}'
                items.append(Paragraph(numbered, self.styles['SubHeading1']))
                list_counter = 1
                continue

            if sname == 'CustomHeading3':
                h3_counter += 1
                numbered = f'{chapter_num}.{topic_num}.{h2_counter}.{h3_counter}  {text}'
                items.append(Paragraph(numbered, self.styles['SubHeading2']))
                list_counter = 1
                continue

            if sname == 'CustomHeading1':
                # h1 inside explanation — treat like h2 for numbering
                h2_counter += 1
                h3_counter  = 0
                numbered = f'{chapter_num}.{topic_num}.{h2_counter}  {text}'
                items.append(Paragraph(numbered, self.styles['SubHeading1']))
                list_counter = 1
                continue

            if sname in ('CustomHeading4',):
                items.append(Paragraph(text, self.styles['CustomHeading4']))
                continue

            # ── Alignment variant ─────────────────────────────────────
            base_style = self.styles.get(sname, self.styles['CustomBody'])
            if alignment == 'CENTER':
                style = ParagraphStyle('_c', parent=base_style, alignment=TA_CENTER)
            elif alignment == 'RIGHT':
                style = ParagraphStyle('_r', parent=base_style, alignment=TA_RIGHT)
            else:
                style = base_style

            # ── List items ────────────────────────────────────────────
            if elem['is_list_item']:
                bullet = '•' if elem['list_type'] == 'ul' else f'{list_counter}.'
                if elem['list_type'] != 'ul':
                    list_counter += 1
                items.append(Paragraph(f'{bullet}  {text}', self.styles['bullet']))
            else:
                items.append(Paragraph(text, style))
                list_counter = 1

        return items, h2_counter

    # ── References ───────────────────────────────────────────────────────
    def _references(self, story, sources):
        story.append(Paragraph('References', self.styles['ref_title']))
        story.append(HRule(color=C.BLUE_LIGHT, thickness=2))
        story.append(Spacer(1, 0.15 * inch))
        for src in sorted(sources.values(), key=lambda x: x['number']):
            story.append(Paragraph(
                f'[{src["number"]}]  {src["title"]}', self.styles['ref_item']
            ))
            story.append(Paragraph(
                f"<link href='{src['url']}'>{src['url']}</link>",
                self.styles['ref_url']
            ))


# ============================================================================
# Public entry
# ============================================================================
def export_note_to_pdf(note):
    return PDFExportService(note).export()