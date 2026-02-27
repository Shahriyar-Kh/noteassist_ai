# FILE: NoteAssist_AI_Backend/notes/pdf_service.py
# ============================================================================
# FINAL FIX: ReportLab LayoutError "Splitting error(n==2)" resolved
#
# Root cause: split() must guarantee S[0] fits within availHeight.
# If even one line can't fit, return [] so ReportLab forces a page break.
# ============================================================================

from io import BytesIO
from datetime import date
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
import re
from html import unescape
from html.parser import HTMLParser
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# Color Palette
# ============================================================================
class IEEEColors:
    PRIMARY          = colors.HexColor('#1a365d')
    SECONDARY        = colors.HexColor('#2c5282')
    ACCENT           = colors.HexColor('#3182ce')
    TEXT_PRIMARY     = colors.HexColor('#1a202c')
    TEXT_SECONDARY   = colors.HexColor('#4a5568')
    TEXT_MUTED       = colors.HexColor('#718096')
    CODE_BG          = colors.HexColor('#1e1e1e')
    CODE_BORDER      = colors.HexColor('#3c3c3c')
    CODE_TEXT        = colors.HexColor('#d4d4d4')
    OUTPUT_SUCCESS   = colors.HexColor('#3fb950')
    OUTPUT_ERROR     = colors.HexColor('#f85149')
    BLOCKQUOTE_BG    = colors.HexColor('#edf2f7')
    BLOCKQUOTE_BORDER= colors.HexColor('#3182ce')
    DIVIDER          = colors.HexColor('#e2e8f0')
    DIVIDER_ACCENT   = colors.HexColor('#3182ce')


# ============================================================================
# SectionDivider (unchanged)
# ============================================================================
class SectionDivider(Flowable):
    def __init__(self, width=6.5 * inch, style='line'):
        Flowable.__init__(self)
        self.width = width
        self.style = style

    def wrap(self, availWidth, availHeight):
        return (min(self.width, availWidth), 20)

    def draw(self):
        canvas = self.canv
        width = min(self.width, 6.5 * inch)
        if self.style == 'line':
            canvas.setStrokeColor(IEEEColors.DIVIDER)
            canvas.setLineWidth(0.5)
            canvas.line(0, 10, width, 10)
        elif self.style == 'dots':
            canvas.setFillColor(IEEEColors.DIVIDER)
            for i in range(0, int(width), 8):
                canvas.circle(i + 4, 10, 1, fill=1, stroke=0)
        elif self.style == 'accent':
            canvas.setStrokeColor(IEEEColors.DIVIDER_ACCENT)
            canvas.setLineWidth(2)
            center = width / 2
            canvas.line(center - 40, 10, center + 40, 10)


# ============================================================================
# FIXED CodeEditorBlock
# ============================================================================
class CodeEditorBlock(Flowable):
    """
    VS Code-style code block with correct ReportLab split() contract.

    ReportLab split() contract (MUST obey):
      - Return []          → nothing fits; ReportLab inserts a page break and retries
      - Return [self]      → everything fits on this page
      - Return [A, B]      → A fits within availHeight, B goes to next page(s)

    The previous bug: split() returned [A, B] where A.wrap() could still exceed
    availHeight, causing "Splitting error(n==2)".

    Fix: compute exactly how many lines fit, build A so its height ≤ availHeight,
    and return [] if even the header + 1 line won't fit.
    """

    # Geometry constants
    LINE_HEIGHT    = 12
    HEADER_HEIGHT  = 24
    PADDING        = 12
    LN_WIDTH       = 35   # line-number gutter width

    def __init__(self, code='', language='python', title=None,
                 show_line_numbers=True, max_width=None,
                 execution_output=None, execution_success=True,
                 _is_continuation=False):
        Flowable.__init__(self)
        self.language          = (language or 'CODE').upper()
        self.title             = title
        self.show_line_numbers = show_line_numbers
        self.max_width         = max_width or 6.5 * inch
        self.execution_output  = execution_output
        self.execution_success = execution_success
        self._is_continuation  = _is_continuation   # suppresses output on split pieces

        # All lines – no truncation
        self.lines = (code or '').split('\n')

    # ── private helpers ──────────────────────────────────────────────────────

    def _code_body_height(self, n_lines):
        """Height of the code body (not including the header bar)."""
        return n_lines * self.LINE_HEIGHT + 2 * self.PADDING

    def _output_height(self):
        if not self.execution_output or self._is_continuation:
            return 0
        out_lines = self.execution_output.split('\n')
        return len(out_lines) * self.LINE_HEIGHT + 2 * self.PADDING + 20

    def _total_height(self, n_lines=None):
        if n_lines is None:
            n_lines = len(self.lines)
        return self.HEADER_HEIGHT + self._code_body_height(n_lines) + self._output_height()

    def _min_height(self):
        """Minimum height to show the header + at least 1 line."""
        return self.HEADER_HEIGHT + self._code_body_height(1)

    # ── ReportLab protocol ───────────────────────────────────────────────────

    def wrap(self, availWidth, availHeight):
        self._avail_width = min(self.max_width, availWidth)
        # Claim exactly the height this block needs (may exceed availHeight;
        # ReportLab will call split() if so).
        h = self._total_height()
        return (self._avail_width, h)

    def split(self, availWidth, availHeight):
        """
        Called by ReportLab when wrap() height > availHeight.

        Returns:
          []       → can't fit even one line; let ReportLab move to next page
          [self]   → everything fits (shouldn't normally reach here, but safe)
          [A, B]   → A fits on this page, B continues on next page(s)
        """
        # Can't fit even the minimum (header + 1 line)?
        if availHeight < self._min_height():
            return []   # Signal: push entirely to next page

        # Everything fits after all (e.g. availHeight grew)?
        if availHeight >= self._total_height():
            return [self]

        # How many lines fit within availHeight?
        usable = availHeight - self.HEADER_HEIGHT - 2 * self.PADDING
        lines_fit = max(int(usable // self.LINE_HEIGHT), 1)

        # Clamp so we don't exceed what we actually have
        lines_fit = min(lines_fit, len(self.lines))

        if lines_fit >= len(self.lines):
            return [self]

        first_lines = self.lines[:lines_fit]
        rest_lines  = self.lines[lines_fit:]

        label = self.title or self.language

        # Part A: fits on the current page
        part_a = CodeEditorBlock(
            code               = '\n'.join(first_lines),
            language           = self.language.lower(),
            title              = label,
            show_line_numbers  = self.show_line_numbers,
            max_width          = self.max_width,
            # No output on first part; show it only on the final part
            _is_continuation   = False,
        )

        # Part B: continues on the next page(s)
        part_b = CodeEditorBlock(
            code               = '\n'.join(rest_lines),
            language           = self.language.lower(),
            title              = f'{label} (cont.)',
            show_line_numbers  = self.show_line_numbers,
            max_width          = self.max_width,
            execution_output   = self.execution_output,
            execution_success  = self.execution_success,
            _is_continuation   = True,
        )

        return [part_a, part_b]

    # ── Drawing ──────────────────────────────────────────────────────────────

    def draw(self):
        canvas  = self.canv
        width   = getattr(self, '_avail_width', min(self.max_width, 6.5 * inch))
        n_lines = len(self.lines)

        total_h = self._total_height(n_lines)
        y       = total_h   # start from top, move downward

        # ── Header bar ──────────────────────────────────────────────────────
        y -= self.HEADER_HEIGHT
        canvas.setFillColor(colors.HexColor('#2d2d2d'))
        canvas.roundRect(0, y, width, self.HEADER_HEIGHT, 4, fill=1, stroke=0)

        for cx, col in [(14, '#ff5f56'), (30, '#ffbd2e'), (46, '#27c93f')]:
            canvas.setFillColor(colors.HexColor(col))
            canvas.circle(cx, y + self.HEADER_HEIGHT / 2, 5, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor('#888888'))
        canvas.setFont('Helvetica-Bold', 9)
        canvas.drawCentredString(width / 2, y + 7, self.title or self.language)

        # ── Code area ────────────────────────────────────────────────────────
        code_h = self._code_body_height(n_lines)
        y -= code_h

        canvas.setFillColor(colors.HexColor('#1e1e1e'))
        canvas.rect(0, y, width, code_h, fill=1, stroke=0)

        if self.show_line_numbers:
            canvas.setFillColor(colors.HexColor('#252526'))
            canvas.rect(0, y, self.LN_WIDTH, code_h, fill=1, stroke=0)

        code_y = y + code_h - self.PADDING - 10
        for i, line in enumerate(self.lines):
            if code_y < y:
                break
            if self.show_line_numbers:
                canvas.setFillColor(colors.HexColor('#858585'))
                canvas.setFont('Courier', 9)
                canvas.drawRightString(self.LN_WIDTH - 8, code_y, str(i + 1))

            canvas.setFillColor(colors.HexColor('#d4d4d4'))
            canvas.setFont('Courier', 10)
            display = (line[:120] + '\u2026') if len(line) > 120 else line
            canvas.drawString(self.LN_WIDTH + 8, code_y, display)
            code_y -= self.LINE_HEIGHT

        # ── Execution output (only on last part) ─────────────────────────────
        if self.execution_output and not self._is_continuation:
            out_lines  = self.execution_output.split('\n')
            out_body_h = len(out_lines) * self.LINE_HEIGHT + 2 * self.PADDING
            out_total  = out_body_h + 20
            y -= out_total

            canvas.setFillColor(colors.HexColor('#1a1a1a'))
            canvas.rect(0, y, width, out_body_h, fill=1, stroke=0)

            ok = self.execution_success
            canvas.setFillColor(colors.HexColor('#3fb950') if ok else colors.HexColor('#f85149'))
            canvas.setFont('Helvetica-Bold', 9)
            canvas.drawString(10, y + out_body_h + 6, '> OUTPUT' if ok else '> ERROR')

            out_y = y + out_body_h - self.PADDING - 10
            canvas.setFont('Courier', 9)
            for ln in out_lines:
                if out_y < y:
                    break
                canvas.setFillColor(colors.HexColor('#d4d4d4'))
                canvas.drawString(12, out_y, (ln[:120] + '\u2026') if len(ln) > 120 else ln)
                out_y -= self.LINE_HEIGHT

        # ── Border ───────────────────────────────────────────────────────────
        canvas.setStrokeColor(colors.HexColor('#3c3c3c'))
        canvas.setLineWidth(1)
        canvas.roundRect(0, 0, width, total_h, 4, fill=0, stroke=1)


# ============================================================================
# Code detection helpers (unchanged)
# ============================================================================

def detect_code_pattern(text, threshold_lines=3):
    if not text or len(text) < 20:
        return False, None
    lines = text.strip().split('\n')
    if len(lines) < threshold_lines:
        return False, None

    python_patterns = [
        r'^\s*def\s+\w+\s*\(', r'^\s*class\s+\w+[\(:]',
        r'^\s*import\s+\w+', r'^\s*from\s+\w+\s+import',
        r'^\s*if\s+.*:', r'^\s*for\s+\w+\s+in\s+',
        r'^\s*while\s+.*:', r'^\s*return\s+',
        r'^\s*print\s*\(', r'^\s*elif\s+.*:', r'^\s*except\s*.*:',
    ]
    js_patterns = [
        r'^\s*function\s+\w+\s*\(', r'^\s*const\s+\w+\s*=',
        r'^\s*let\s+\w+\s*=', r'^\s*var\s+\w+\s*=',
        r'=>\s*{', r'^\s*console\.', r'^\s*export\s+',
        r'^\s*import\s+.*\s+from',
    ]
    java_patterns = [
        r'^\s*public\s+(static\s+)?', r'^\s*private\s+',
        r'^\s*protected\s+', r'^\s*void\s+\w+\s*\(',
        r'^\s*int\s+\w+\s*[=;(]', r'^\s*String\s+\w+',
        r'System\.out\.print', r'#include\s*<', r'^\s*using\s+namespace',
    ]

    python_score = sum(1 for l in lines if any(re.search(p, l) for p in python_patterns))
    js_score     = sum(1 for l in lines if any(re.search(p, l) for p in js_patterns))
    java_score   = sum(1 for l in lines if any(re.search(p, l) for p in java_patterns))

    indented     = sum(1 for l in lines if l and l[0] in ' \t')
    indent_ratio = indented / len(lines)

    max_score = max(python_score, js_score, java_score)
    if max_score >= 2 or (max_score >= 1 and indent_ratio > 0.3):
        if python_score == max_score:
            return True, 'python'
        if js_score == max_score:
            return True, 'javascript'
        return True, 'java'
    if len(lines) >= 3 and indent_ratio > 0.4:
        return True, 'python'
    return False, None


# ============================================================================
# HTML → PDF element parser (unchanged from original)
# ============================================================================

class RichTextHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.elements = []
        self.current_text = []
        self.tag_stack = []
        self.list_stack = []
        self.current_styles = {}
        self.alignment = 'LEFT'
        self.in_code_block = False
        self.code_block_content = []
        self.code_language = 'python'

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tag_stack.append((tag, attrs_dict))
        if 'class' in attrs_dict:
            cls = attrs_dict['class']
            if 'ql-align-center' in cls:  self.alignment = 'CENTER'
            elif 'ql-align-right' in cls: self.alignment = 'RIGHT'
            elif 'ql-align-justify' in cls: self.alignment = 'JUSTIFY'

        if tag == 'pre':
            self._flush_paragraph()
            self.in_code_block = True
            self.code_block_content = []
            if 'class' in attrs_dict:
                m = re.search(r'language-(\w+)', attrs_dict['class'])
                self.code_language = m.group(1) if m else 'python'
            else:
                self.code_language = 'python'
        elif tag in ('strong', 'b') and not self.in_code_block:
            self.current_text.append('<b>')
        elif tag in ('em', 'i') and not self.in_code_block:
            self.current_text.append('<i>')
        elif tag == 'u' and not self.in_code_block:
            self.current_text.append('<u>')
        elif tag in ('s', 'strike') and not self.in_code_block:
            self.current_text.append('<strike>')
        elif tag == 'code' and not self.in_code_block:
            self.current_text.append('<font face="Courier" backColor="#f0f0f0">')
        elif tag == 'br':
            if self.in_code_block:
                self.code_block_content.append('\n')
            else:
                self.current_text.append('<br/>')
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self._flush_paragraph()
            self.current_styles['heading'] = tag
        elif tag == 'blockquote':
            self._flush_paragraph()
            self.current_styles['blockquote'] = True
        elif tag in ('ul', 'ol'):
            self._flush_paragraph()
            self.list_stack.append(tag)
        elif tag == 'p':
            if 'style' in attrs_dict:
                s = attrs_dict['style']
                if 'text-align: center'  in s: self.alignment = 'CENTER'
                elif 'text-align: right' in s: self.alignment = 'RIGHT'
                elif 'text-align: justify' in s: self.alignment = 'JUSTIFY'
        elif tag == 'span' and 'style' in attrs_dict:
            s = attrs_dict['style']
            cm = re.search(r'color:\s*([^;]+)', s)
            if cm: self.current_text.append(f'<font color="{cm.group(1).strip()}">')
            bm = re.search(r'background-color:\s*([^;]+)', s)
            if bm: self.current_text.append(f'<font backColor="{bm.group(1).strip()}">')

    def handle_endtag(self, tag):
        if not self.tag_stack:
            return
        last_tag, _ = self.tag_stack[-1]
        if last_tag == tag:
            self.tag_stack.pop()

        if tag == 'pre':
            if self.in_code_block:
                self.elements.append({
                    'text': ''.join(self.code_block_content),
                    'style': 'code', 'alignment': 'LEFT',
                    'is_list_item': False, 'list_type': None,
                    'is_code': True, 'language': self.code_language,
                })
                self.in_code_block = False
                self.code_block_content = []
            return

        if tag in ('strong', 'b') and not self.in_code_block:
            self.current_text.append('</b>')
        elif tag in ('em', 'i') and not self.in_code_block:
            self.current_text.append('</i>')
        elif tag == 'u' and not self.in_code_block:
            self.current_text.append('</u>')
        elif tag in ('s', 'strike') and not self.in_code_block:
            self.current_text.append('</strike>')
        elif tag == 'code' and not self.in_code_block:
            self.current_text.append('</font>')
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self._flush_paragraph()
            self.current_styles.pop('heading', None)
        elif tag == 'blockquote':
            self._flush_paragraph()
            self.current_styles.pop('blockquote', None)
        elif tag in ('ul', 'ol'):
            if self.list_stack and self.list_stack[-1] == tag:
                self.list_stack.pop()
        elif tag == 'li':
            self._flush_paragraph()
        elif tag == 'p':
            self._flush_paragraph()
            self.alignment = 'LEFT'
        elif tag == 'span':
            self.current_text.append('</font>')

    def handle_data(self, data):
        if self.in_code_block:
            self.code_block_content.append(data)
            return
        if self.tag_stack and self.tag_stack[-1][0] in ('pre', 'code'):
            self.current_text.append(data)
        else:
            cleaned = data.strip()
            if cleaned:
                self.current_text.append(cleaned)
            elif data and not cleaned:
                self.current_text.append(' ')

    def _flush_paragraph(self):
        if not self.current_text:
            return
        text = ''.join(self.current_text).strip()
        if not text:
            self.current_text = []
            return
        if 'heading' in self.current_styles:
            style_name = f'CustomHeading{self.current_styles["heading"][1]}'
        elif 'blockquote' in self.current_styles:
            style_name = 'CustomBlockquote'
        elif self.list_stack:
            style_name = 'CustomListItem'
        else:
            style_name = 'CustomBody'
        self.elements.append({
            'text': text, 'style': style_name,
            'alignment': self.alignment,
            'is_list_item': bool(self.list_stack),
            'list_type': self.list_stack[-1] if self.list_stack else None,
            'is_code': False, 'language': None,
        })
        self.current_text = []

    def get_elements(self):
        self._flush_paragraph()
        return self.elements


# ============================================================================
# PDF Export Service
# ============================================================================

class PDFExportService:
    def __init__(self, note):
        self.note   = note
        self.styles = self._setup_ieee_styles()

    def _setup_ieee_styles(self):
        base = getSampleStyleSheet()
        def S(name, **kw):
            parent = kw.pop('parent', base['Normal'])
            return ParagraphStyle(name, parent=parent, **kw)

        return {
            'title':           S('IEEETitle',     parent=base['Heading1'], fontSize=28,
                                  textColor=IEEEColors.PRIMARY, spaceAfter=24,
                                  alignment=TA_CENTER, fontName='Helvetica-Bold', leading=34),
            'subtitle':        S('IEEESubtitle',  fontSize=12, textColor=IEEEColors.TEXT_SECONDARY,
                                  spaceAfter=12, alignment=TA_CENTER, leading=18),
            'metadata':        S('IEEEMetadata',  fontSize=10, textColor=IEEEColors.TEXT_MUTED,
                                  spaceAfter=6, alignment=TA_CENTER, leading=14),
            'toc_title':       S('TOCTitle',      parent=base['Heading1'], fontSize=18,
                                  textColor=IEEEColors.PRIMARY, spaceAfter=24,
                                  fontName='Helvetica-Bold', leading=22, alignment=TA_LEFT),
            'chapter':         S('IEEEChapter',   parent=base['Heading1'], fontSize=16,
                                  textColor=IEEEColors.PRIMARY, spaceAfter=12, spaceBefore=24,
                                  fontName='Helvetica-Bold', leading=20, keepWithNext=1),
            'topic':           S('IEEETopic',     parent=base['Heading2'], fontSize=13,
                                  textColor=IEEEColors.SECONDARY, spaceAfter=8, spaceBefore=18,
                                  fontName='Helvetica-Bold', leading=16, keepWithNext=1),
            'section_label':   S('SectionLabel',  fontSize=10, textColor=IEEEColors.ACCENT,
                                  spaceBefore=16, spaceAfter=6, fontName='Helvetica-Bold', leading=12),
            'CustomHeading1':  S('CH1', parent=base['Heading1'], fontSize=14,
                                  textColor=IEEEColors.PRIMARY, spaceAfter=8, spaceBefore=16,
                                  fontName='Helvetica-Bold', leading=18),
            'CustomHeading2':  S('CH2', parent=base['Heading2'], fontSize=12,
                                  textColor=IEEEColors.SECONDARY, spaceAfter=6, spaceBefore=12,
                                  fontName='Helvetica-Bold', leading=16),
            'CustomHeading3':  S('CH3', parent=base['Heading3'], fontSize=11,
                                  textColor=IEEEColors.SECONDARY, spaceAfter=6, spaceBefore=10,
                                  fontName='Helvetica-Bold', leading=14),
            'CustomBody':      S('IEEEBody', fontSize=10, leading=16, alignment=TA_JUSTIFY,
                                  spaceAfter=8, textColor=IEEEColors.TEXT_PRIMARY),
            'CustomBlockquote':S('IEEEBQ',   fontSize=10, leading=16, leftIndent=20,
                                  rightIndent=20, spaceAfter=12, spaceBefore=12,
                                  fontName='Helvetica-Oblique',
                                  textColor=IEEEColors.TEXT_SECONDARY,
                                  backColor=IEEEColors.BLOCKQUOTE_BG, borderPadding=10),
            'CustomListItem':  S('IEEELI',   fontSize=10, leading=16, leftIndent=25,
                                  spaceAfter=4, bulletIndent=10,
                                  textColor=IEEEColors.TEXT_PRIMARY),
            'bullet':          S('IEEEBullet', fontSize=10, leading=16, leftIndent=25,
                                  bulletIndent=10, spaceAfter=4,
                                  textColor=IEEEColors.TEXT_PRIMARY),
            'code':            S('IEEECode', parent=base['Code'], fontSize=9, leading=13,
                                  leftIndent=12, rightIndent=12,
                                  backColor=IEEEColors.CODE_BG,
                                  textColor=IEEEColors.CODE_TEXT,
                                  borderColor=IEEEColors.CODE_BORDER,
                                  borderWidth=1, borderPadding=12,
                                  fontName='Courier', spaceAfter=12, spaceBefore=8),
            'toc_chapter':     S('TOCChap', fontSize=11, textColor=IEEEColors.PRIMARY,
                                  fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=8),
            'toc_topic':       S('TOCTopic', fontSize=10, textColor=IEEEColors.TEXT_PRIMARY,
                                  spaceAfter=4, leftIndent=20),
            'reference_title': S('RefTitle', parent=base['Heading1'], fontSize=14,
                                  textColor=IEEEColors.PRIMARY, spaceAfter=16,
                                  fontName='Helvetica-Bold', leading=18),
            'reference_item':  S('RefItem',  fontSize=9, leading=14, leftIndent=20,
                                  firstLineIndent=-20, spaceAfter=8,
                                  textColor=IEEEColors.TEXT_PRIMARY),
            'reference_url':   S('RefURL',   fontSize=8, leftIndent=20, spaceAfter=12,
                                  fontName='Courier', textColor=IEEEColors.ACCENT),
        }

    # ── export ───────────────────────────────────────────────────────────────

    def export(self):
        """Build PDF into BytesIO; return as ContentFile (no disk I/O)."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
            allowSplitting=1,
        )

        story = []
        self._add_title_page(story)
        story.append(PageBreak())
        self._add_table_of_contents(story)
        story.append(PageBreak())
        sources = self._add_chapters_and_topics(story)
        if sources:
            story.append(PageBreak())
            self._add_references(story, sources)

        doc.build(story)

        pdf_bytes = buffer.getvalue()
        buffer.close()
        logger.info(f"PDF generated for note {self.note.id}: {len(pdf_bytes):,} bytes")
        return ContentFile(pdf_bytes, name=f"note_{self.note.slug}_{date.today()}.pdf")

    # ── title page ───────────────────────────────────────────────────────────

    def _add_title_page(self, story):
        story.append(Spacer(1, 1.5 * inch))
        story.append(Paragraph("STUDY NOTES", self.styles['metadata']))
        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph(self.note.title, self.styles['title']))
        story.append(Spacer(1, 0.4 * inch))
        story.append(SectionDivider(style='accent'))
        story.append(Spacer(1, 0.4 * inch))

        created = self.note.created_at.strftime('%B %d, %Y')
        updated = self.note.updated_at.strftime('%B %d, %Y')
        story.append(Paragraph(
            f'<para alignment="center"><font size="10" color="#4a5568">'
            f'<b>Created:</b> {created}<br/>'
            f'<b>Last Updated:</b> {updated}<br/>'
            f'<b>Status:</b> {self.note.get_status_display()}</font></para>',
            self.styles['subtitle'],
        ))
        story.append(Spacer(1, 0.5 * inch))
        if self.note.tags:
            story.append(Paragraph(
                f'<para alignment="center"><font size="9" color="#718096">'
                f'<b>Keywords:</b> {", ".join(self.note.tags)}</font></para>',
                self.styles['subtitle'],
            ))
        story.append(Spacer(1, 1.5 * inch))
        story.append(Paragraph(
            '<para alignment="center"><font size="9" color="#a0aec0">'
            'Generated by NoteAssist AI<br/>Professional Note Management System'
            '</font></para>',
            self.styles['metadata'],
        ))

    # ── TOC ──────────────────────────────────────────────────────────────────

    def _add_table_of_contents(self, story):
        story.append(Paragraph("TABLE OF CONTENTS", self.styles['toc_title']))
        story.append(Spacer(1, 0.2 * inch))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.3 * inch))

        rows = []
        cn = 1
        for chapter in self.note.chapters.all().order_by('order'):
            rows.append([Paragraph(f"<b>{cn}. {chapter.title}</b>", self.styles['toc_chapter'])])
            tn = 1
            for topic in chapter.topics.all().order_by('order'):
                rows.append([Paragraph(f"{cn}.{tn} {topic.name}", self.styles['toc_topic'])])
                tn += 1
            cn += 1

        if rows:
            t = Table(rows, colWidths=[6 * inch])
            t.setStyle(TableStyle([
                ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING',    (0, 0), (-1, -1), 4),
            ]))
            story.append(t)

    # ── chapters & topics ────────────────────────────────────────────────────

    def _add_chapters_and_topics(self, story):
        all_sources    = {}
        source_counter = 1
        chapter_num    = 1

        for chapter in self.note.chapters.all().order_by('order'):
            story.append(Paragraph(f"{chapter_num}. {chapter.title}", self.styles['chapter']))
            story.append(SectionDivider(style='line'))
            story.append(Spacer(1, 0.15 * inch))

            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                story.append(Paragraph(
                    f"{chapter_num}.{topic_num} {topic.name}", self.styles['topic']
                ))
                story.append(Spacer(1, 0.1 * inch))

                # Explanation
                if topic.explanation:
                    parser = RichTextHTMLParser()
                    parser.feed(topic.explanation.content)
                    list_counter = 1
                    for elem in parser.get_elements():
                        text      = elem['text']
                        alignment = elem['alignment']

                        if elem.get('is_code'):
                            story.append(Spacer(1, 0.1 * inch))
                            story.append(CodeEditorBlock(
                                code=unescape(text),
                                language=elem.get('language', 'python') or 'python',
                                title=f"{(elem.get('language') or 'code').upper()} Code",
                                show_line_numbers=True,
                            ))
                            story.append(Spacer(1, 0.15 * inch))
                            continue

                        is_code, lang = detect_code_pattern(text)
                        if is_code:
                            story.append(Spacer(1, 0.1 * inch))
                            story.append(CodeEditorBlock(
                                code=unescape(text),
                                language=lang or 'python',
                                title=f"{(lang or 'python').upper()} Code",
                                show_line_numbers=True,
                            ))
                            story.append(Spacer(1, 0.15 * inch))
                            continue

                        base_style = self.styles.get(elem['style'], self.styles['CustomBody'])
                        if alignment == 'CENTER':
                            style = ParagraphStyle('_c', parent=base_style, alignment=TA_CENTER)
                        elif alignment == 'RIGHT':
                            style = ParagraphStyle('_r', parent=base_style, alignment=TA_RIGHT)
                        elif alignment == 'JUSTIFY':
                            style = ParagraphStyle('_j', parent=base_style, alignment=TA_JUSTIFY)
                        else:
                            style = base_style

                        if elem['is_list_item']:
                            bullet = '•' if elem['list_type'] == 'ul' else f'{list_counter}.'
                            if elem['list_type'] != 'ul':
                                list_counter += 1
                            story.append(Paragraph(f"{bullet}  {text}", self.styles['bullet']))
                        else:
                            story.append(Paragraph(text, style))
                            list_counter = 1
                        story.append(Spacer(1, 0.04 * inch))

                    story.append(Spacer(1, 0.1 * inch))

                # Code snippet
                if topic.code_snippet:
                    story.append(Spacer(1, 0.1 * inch))
                    story.append(Paragraph("Practical Example", self.styles['section_label']))
                    story.append(Spacer(1, 0.08 * inch))
                    clean = unescape(re.sub(r'<[^>]+>', '', topic.code_snippet.code))
                    story.append(CodeEditorBlock(
                        code=clean,
                        language=topic.code_snippet.language,
                        title=f"{topic.code_snippet.language.upper()} Code",
                        show_line_numbers=True,
                    ))
                    story.append(Spacer(1, 0.15 * inch))

                # Source citation
                if topic.source:
                    key = topic.source.url
                    if key not in all_sources:
                        all_sources[key] = {
                            'number': source_counter,
                            'title':  topic.source.title,
                            'url':    topic.source.url,
                        }
                        source_counter += 1
                    story.append(Paragraph(
                        f'<i><font color="#718096">Source: [{all_sources[key]["number"]}]</font></i>',
                        self.styles['CustomBody'],
                    ))

                story.append(Spacer(1, 0.2 * inch))
                topic_num    += 1

            chapter_num += 1
            story.append(Spacer(1, 0.3 * inch))

        return all_sources

    # ── references ───────────────────────────────────────────────────────────

    def _add_references(self, story, sources):
        story.append(Paragraph("REFERENCES", self.styles['reference_title']))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.2 * inch))
        for src in sorted(sources.values(), key=lambda x: x['number']):
            story.append(Paragraph(
                f"[{src['number']}] {src['title']}", self.styles['reference_item']
            ))
            story.append(Paragraph(
                f"<link href='{src['url']}'>{src['url']}</link>",
                self.styles['reference_url'],
            ))


# ============================================================================
# Public entry point
# ============================================================================

def export_note_to_pdf(note):
    return PDFExportService(note).export()