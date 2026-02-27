# FILE: NoteAssist_AI_Backend/notes/pdf_service.py
# ============================================================================
# FIXED: Enhanced PDF Export Service - handles PDFs of any size
#   • Removed arbitrary MAX_LINES cap on code blocks
#   • Code blocks now paginate correctly instead of truncating
#   • ReportLab uses streaming (BytesIO) - no file-size limit
#   • Returned as Django ContentFile so it works for both download & Drive
# ============================================================================

from io import BytesIO
from datetime import date
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Preformatted, ListFlowable, ListItem, Flowable,
    KeepInFrame
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
import re
from html import unescape
from html.parser import HTMLParser
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# IEEE-Style Color Palette
# ============================================================================
class IEEEColors:
    PRIMARY = colors.HexColor('#1a365d')
    SECONDARY = colors.HexColor('#2c5282')
    ACCENT = colors.HexColor('#3182ce')
    TEXT_PRIMARY = colors.HexColor('#1a202c')
    TEXT_SECONDARY = colors.HexColor('#4a5568')
    TEXT_MUTED = colors.HexColor('#718096')
    CODE_BG = colors.HexColor('#1e1e1e')
    CODE_BORDER = colors.HexColor('#3c3c3c')
    CODE_TEXT = colors.HexColor('#d4d4d4')
    OUTPUT_SUCCESS = colors.HexColor('#3fb950')
    OUTPUT_ERROR = colors.HexColor('#f85149')
    BLOCKQUOTE_BG = colors.HexColor('#edf2f7')
    BLOCKQUOTE_BORDER = colors.HexColor('#3182ce')
    DIVIDER = colors.HexColor('#e2e8f0')
    DIVIDER_ACCENT = colors.HexColor('#3182ce')


# ============================================================================
# FIXED CodeEditorBlock - no MAX_LINES truncation; proper page-split support
# ============================================================================
class CodeEditorBlock(Flowable):
    """
    VS Code-style code block.

    FIX: Removed the MAX_LINES=50 hard cap.  Large code is now split across
    pages via split() instead of being silently truncated.
    """

    MIN_WIDTH = 50
    MIN_HEIGHT = 20

    def __init__(self, code, language='python', title=None,
                 show_line_numbers=True, max_width=None,
                 execution_output=None, execution_success=True):
        Flowable.__init__(self)
        self.language = (language or 'CODE').upper()
        self.title = title
        self.show_line_numbers = show_line_numbers
        self.max_width = max_width or 6.5 * inch
        self.execution_output = execution_output
        self.execution_success = execution_success

        # Store ALL lines - no truncation
        self.lines = (code or '').split('\n')
        self.code = code or ''

        # Geometry
        self.line_height = 12
        self.header_height = 24
        self.padding = 12
        self.line_number_width = 35 if show_line_numbers else 0

        self._update_heights()

    def _update_heights(self):
        self.code_height = len(self.lines) * self.line_height + 2 * self.padding
        self.output_height = 0
        if self.execution_output:
            out_lines = self.execution_output.split('\n')
            self.output_height = len(out_lines) * self.line_height + 2 * self.padding + 20
        self.total_height = self.header_height + self.code_height + self.output_height

    # ── ReportLab protocol ───────────────────────────────────────────────────

    def wrap(self, availWidth, availHeight):
        width = max(min(self.max_width, availWidth), self.MIN_WIDTH)
        height = max(min(self.total_height, availHeight or self.total_height), self.MIN_HEIGHT)
        self._render_height = height
        self._render_width = width
        return (width, height)

    def split(self, availWidth, availHeight):
        """
        FIX: Properly split large code blocks across pages.
        Returns two CodeEditorBlocks: one that fits, one with the remainder.
        """
        usable_height = availHeight - self.header_height - 2 * self.padding
        lines_that_fit = max(int(usable_height // self.line_height), 1)

        if lines_that_fit >= len(self.lines):
            # Everything fits on this page
            return [self]

        # Split lines into two parts
        first_lines = self.lines[:lines_that_fit]
        rest_lines = self.lines[lines_that_fit:]

        block1 = CodeEditorBlock(
            code='\n'.join(first_lines),
            language=self.language.lower(),
            title=self.title,
            show_line_numbers=self.show_line_numbers,
            max_width=self.max_width,
            # No output on continuation pages
        )

        block2 = CodeEditorBlock(
            code='\n'.join(rest_lines),
            language=self.language.lower(),
            title=(self.title or self.language) + ' (continued)',
            show_line_numbers=self.show_line_numbers,
            max_width=self.max_width,
            execution_output=self.execution_output,
            execution_success=self.execution_success,
        )

        return [block1, block2]

    def draw(self):
        canvas = self.canv
        width = min(self.max_width, 6.5 * inch)
        render_h = getattr(self, '_render_height', self.total_height)

        if render_h < self.MIN_HEIGHT:
            return

        y = render_h

        # Header bar
        if y >= self.header_height:
            y -= self.header_height
            canvas.setFillColor(colors.HexColor('#2d2d2d'))
            canvas.roundRect(0, y, width, self.header_height, 4, fill=1, stroke=0)
            for cx, col in [(14, '#ff5f56'), (30, '#ffbd2e'), (46, '#27c93f')]:
                canvas.setFillColor(colors.HexColor(col))
                canvas.circle(cx, y + self.header_height / 2, 5, fill=1, stroke=0)
            canvas.setFillColor(colors.HexColor('#888888'))
            canvas.setFont('Helvetica-Bold', 9)
            canvas.drawCentredString(width / 2, y + 7, self.title or self.language)

        # Code area
        code_h = min(self.code_height, y)
        if code_h > 0:
            y -= code_h
            canvas.setFillColor(colors.HexColor('#1e1e1e'))
            canvas.rect(0, y, width, code_h, fill=1, stroke=0)

            if self.show_line_numbers:
                canvas.setFillColor(colors.HexColor('#252526'))
                canvas.rect(0, y, self.line_number_width, code_h, fill=1, stroke=0)

            code_y = y + code_h - self.padding - 10
            for i, line in enumerate(self.lines):
                if code_y < y:
                    break
                if self.show_line_numbers:
                    canvas.setFillColor(colors.HexColor('#858585'))
                    canvas.setFont('Courier', 9)
                    canvas.drawRightString(self.line_number_width - 8, code_y, str(i + 1))
                canvas.setFillColor(colors.HexColor('#d4d4d4'))
                canvas.setFont('Courier', 10)
                # Limit line display width but don't truncate stored data
                display = (line[:120] + '…') if len(line) > 120 else line
                canvas.drawString(self.line_number_width + 8, code_y, display)
                code_y -= self.line_height

        # Execution output
        if self.execution_output and y > 20:
            out_h = min(self.output_height, y)
            y -= 20
            canvas.setFillColor(colors.HexColor('#1a1a1a'))
            canvas.rect(0, y - (out_h - 20), width, out_h - 20, fill=1, stroke=0)
            ok = self.execution_success
            canvas.setFillColor(colors.HexColor('#3fb950') if ok else colors.HexColor('#f85149'))
            canvas.setFont('Helvetica-Bold', 9)
            canvas.drawString(10, y - 12, '> OUTPUT' if ok else '> ERROR')
            out_y = y - 28
            canvas.setFont('Courier', 9)
            for ln in self.execution_output.split('\n'):
                if out_y < 0:
                    break
                canvas.drawString(12, out_y, (ln[:120] + '…') if len(ln) > 120 else ln)
                out_y -= self.line_height

        # Border
        canvas.setStrokeColor(colors.HexColor('#3c3c3c'))
        canvas.setLineWidth(1)
        canvas.roundRect(0, 0, width, render_h, 4, fill=0, stroke=1)


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
# Code Detection (unchanged)
# ============================================================================

def detect_code_pattern(text, threshold_lines=3):
    if not text or len(text) < 20:
        return False, None
    lines = text.strip().split('\n')
    if len(lines) < threshold_lines:
        return False, None

    python_patterns = [
        r'^\s*def\s+\w+\s*\(', r'^\s*class\s+\w+[\(:]', r'^\s*import\s+\w+',
        r'^\s*from\s+\w+\s+import', r'^\s*if\s+.*:', r'^\s*for\s+\w+\s+in\s+',
        r'^\s*while\s+.*:', r'^\s*return\s+', r'^\s*print\s*\(',
        r'^\s*elif\s+.*:', r'^\s*except\s*.*:',
    ]
    js_patterns = [
        r'^\s*function\s+\w+\s*\(', r'^\s*const\s+\w+\s*=', r'^\s*let\s+\w+\s*=',
        r'^\s*var\s+\w+\s*=', r'=>\s*{', r'^\s*console\.', r'^\s*export\s+', r'^\s*import\s+.*\s+from',
    ]
    java_patterns = [
        r'^\s*public\s+(static\s+)?', r'^\s*private\s+', r'^\s*protected\s+',
        r'^\s*void\s+\w+\s*\(', r'^\s*int\s+\w+\s*[=;(]', r'^\s*String\s+\w+',
        r'System\.out\.print', r'#include\s*<', r'^\s*using\s+namespace',
    ]

    python_score = sum(1 for line in lines if any(re.search(p, line) for p in python_patterns))
    js_score = sum(1 for line in lines if any(re.search(p, line) for p in js_patterns))
    java_score = sum(1 for line in lines if any(re.search(p, line) for p in java_patterns))

    indented = sum(1 for line in lines if line and line[0] in ' \t')
    indent_ratio = indented / len(lines)

    max_score = max(python_score, js_score, java_score)
    if max_score >= 2 or (max_score >= 1 and indent_ratio > 0.3):
        if python_score == max_score:
            return True, 'python'
        elif js_score == max_score:
            return True, 'javascript'
        return True, 'java'
    if len(lines) >= 3 and indent_ratio > 0.4:
        return True, 'python'
    return False, None


# ============================================================================
# HTML Parser (unchanged - kept for reference)
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
            if 'ql-align-center' in attrs_dict['class']:
                self.alignment = 'CENTER'
            elif 'ql-align-right' in attrs_dict['class']:
                self.alignment = 'RIGHT'
            elif 'ql-align-justify' in attrs_dict['class']:
                self.alignment = 'JUSTIFY'
        if tag == 'pre':
            self._flush_paragraph()
            self.in_code_block = True
            self.code_block_content = []
            if 'class' in attrs_dict:
                lang_match = re.search(r'language-(\w+)', attrs_dict['class'])
                self.code_language = lang_match.group(1) if lang_match else 'python'
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
                style = attrs_dict['style']
                if 'text-align: center' in style:
                    self.alignment = 'CENTER'
                elif 'text-align: right' in style:
                    self.alignment = 'RIGHT'
                elif 'text-align: justify' in style:
                    self.alignment = 'JUSTIFY'
        elif tag == 'span' and 'style' in attrs_dict:
            style = attrs_dict['style']
            color_match = re.search(r'color:\s*([^;]+)', style)
            if color_match:
                self.current_text.append(f'<font color="{color_match.group(1).strip()}">')
            bg_match = re.search(r'background-color:\s*([^;]+)', style)
            if bg_match:
                self.current_text.append(f'<font backColor="{bg_match.group(1).strip()}">')

    def handle_endtag(self, tag):
        if not self.tag_stack:
            return
        last_tag, _ = self.tag_stack[-1]
        if last_tag == tag:
            self.tag_stack.pop()
        if tag == 'pre':
            if self.in_code_block:
                code_text = ''.join(self.code_block_content)
                self.elements.append({
                    'text': code_text, 'style': 'code', 'alignment': 'LEFT',
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
            'text': text, 'style': style_name, 'alignment': self.alignment,
            'is_list_item': bool(self.list_stack),
            'list_type': self.list_stack[-1] if self.list_stack else None,
            'is_code': False, 'language': None,
        })
        self.current_text = []

    def get_elements(self):
        self._flush_paragraph()
        return self.elements


# ============================================================================
# PDF Export Service - FIXED for any-size PDFs
# ============================================================================

class PDFExportService:
    def __init__(self, note):
        self.note = note
        self.styles = self._setup_ieee_styles()
        self.page_width = A4[0] - 2 * inch

    def _setup_ieee_styles(self):
        base_styles = getSampleStyleSheet()
        return {
            'title': ParagraphStyle('IEEETitle', parent=base_styles['Heading1'],
                fontSize=28, textColor=IEEEColors.PRIMARY, spaceAfter=24, alignment=TA_CENTER,
                fontName='Helvetica-Bold', leading=34),
            'subtitle': ParagraphStyle('IEEESubtitle', parent=base_styles['Normal'],
                fontSize=12, textColor=IEEEColors.TEXT_SECONDARY, spaceAfter=12,
                alignment=TA_CENTER, fontName='Helvetica', leading=18),
            'metadata': ParagraphStyle('IEEEMetadata', parent=base_styles['Normal'],
                fontSize=10, textColor=IEEEColors.TEXT_MUTED, spaceAfter=6,
                alignment=TA_CENTER, fontName='Helvetica', leading=14),
            'toc_title': ParagraphStyle('TOCTitle', parent=base_styles['Heading1'],
                fontSize=18, textColor=IEEEColors.PRIMARY, spaceAfter=24, fontName='Helvetica-Bold',
                leading=22, alignment=TA_LEFT),
            'chapter': ParagraphStyle('IEEEChapter', parent=base_styles['Heading1'],
                fontSize=16, textColor=IEEEColors.PRIMARY, spaceAfter=12, spaceBefore=24,
                fontName='Helvetica-Bold', leading=20, keepWithNext=1),
            'topic': ParagraphStyle('IEEETopic', parent=base_styles['Heading2'],
                fontSize=13, textColor=IEEEColors.SECONDARY, spaceAfter=8, spaceBefore=18,
                fontName='Helvetica-Bold', leading=16, keepWithNext=1),
            'section_label': ParagraphStyle('SectionLabel', parent=base_styles['Normal'],
                fontSize=10, textColor=IEEEColors.ACCENT, spaceBefore=16, spaceAfter=6,
                fontName='Helvetica-Bold', leading=12),
            'CustomHeading1': ParagraphStyle('CustomHeading1', parent=base_styles['Heading1'],
                fontSize=14, textColor=IEEEColors.PRIMARY, spaceAfter=8, spaceBefore=16,
                fontName='Helvetica-Bold', leading=18),
            'CustomHeading2': ParagraphStyle('CustomHeading2', parent=base_styles['Heading2'],
                fontSize=12, textColor=IEEEColors.SECONDARY, spaceAfter=6, spaceBefore=12,
                fontName='Helvetica-Bold', leading=16),
            'CustomHeading3': ParagraphStyle('CustomHeading3', parent=base_styles['Heading3'],
                fontSize=11, textColor=IEEEColors.SECONDARY, spaceAfter=6, spaceBefore=10,
                fontName='Helvetica-Bold', leading=14),
            'CustomBody': ParagraphStyle('IEEEBody', parent=base_styles['Normal'],
                fontSize=10, leading=16, alignment=TA_JUSTIFY, spaceAfter=8,
                fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'CustomBodyLeft': ParagraphStyle('IEEEBodyLeft', parent=base_styles['Normal'],
                fontSize=10, leading=16, alignment=TA_LEFT, spaceAfter=8,
                fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'CustomBodyCenter': ParagraphStyle('IEEEBodyCenter', parent=base_styles['Normal'],
                fontSize=10, leading=16, alignment=TA_CENTER, spaceAfter=8,
                fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'CustomBodyRight': ParagraphStyle('IEEEBodyRight', parent=base_styles['Normal'],
                fontSize=10, leading=16, alignment=TA_RIGHT, spaceAfter=8,
                fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'CustomBlockquote': ParagraphStyle('IEEEBlockquote', parent=base_styles['Normal'],
                fontSize=10, leading=16, leftIndent=20, rightIndent=20,
                spaceAfter=12, spaceBefore=12, fontName='Helvetica-Oblique',
                textColor=IEEEColors.TEXT_SECONDARY, backColor=IEEEColors.BLOCKQUOTE_BG,
                borderPadding=10),
            'CustomListItem': ParagraphStyle('IEEEListItem', parent=base_styles['Normal'],
                fontSize=10, leading=16, leftIndent=25, spaceAfter=4,
                fontName='Helvetica', bulletIndent=10, textColor=IEEEColors.TEXT_PRIMARY),
            'bullet': ParagraphStyle('IEEEBullet', parent=base_styles['Normal'],
                fontSize=10, leading=16, leftIndent=25, bulletIndent=10,
                spaceAfter=4, fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'code': ParagraphStyle('IEEECode', parent=base_styles['Code'],
                fontSize=9, leading=13, leftIndent=12, rightIndent=12,
                backColor=IEEEColors.CODE_BG, textColor=IEEEColors.CODE_TEXT,
                borderColor=IEEEColors.CODE_BORDER, borderWidth=1, borderPadding=12,
                fontName='Courier', spaceAfter=12, spaceBefore=8),
            'code_label': ParagraphStyle('CodeLabel', parent=base_styles['Normal'],
                fontSize=9, textColor=IEEEColors.TEXT_MUTED, spaceBefore=12,
                spaceAfter=4, fontName='Helvetica-Bold', leading=12),
            'toc_chapter': ParagraphStyle('TOCChapter', parent=base_styles['Normal'],
                fontSize=11, textColor=IEEEColors.PRIMARY, fontName='Helvetica-Bold',
                spaceAfter=6, spaceBefore=8, leftIndent=0),
            'toc_topic': ParagraphStyle('TOCTopic', parent=base_styles['Normal'],
                fontSize=10, textColor=IEEEColors.TEXT_PRIMARY, fontName='Helvetica',
                spaceAfter=4, leftIndent=20),
            'reference_title': ParagraphStyle('ReferenceTitle', parent=base_styles['Heading1'],
                fontSize=14, textColor=IEEEColors.PRIMARY, spaceAfter=16, fontName='Helvetica-Bold',
                leading=18),
            'reference_item': ParagraphStyle('ReferenceItem', parent=base_styles['Normal'],
                fontSize=9, leading=14, leftIndent=20, firstLineIndent=-20,
                spaceAfter=8, fontName='Helvetica', textColor=IEEEColors.TEXT_PRIMARY),
            'reference_url': ParagraphStyle('ReferenceURL', parent=base_styles['Normal'],
                fontSize=8, leftIndent=20, spaceAfter=12, fontName='Courier',
                textColor=IEEEColors.ACCENT),
        }

    # ── FIXED export: uses pure BytesIO streaming, no temp files ──────────────

    def export(self):
        """
        Export note to PDF.
        FIX: Uses BytesIO throughout - no disk I/O, no size limit.
        Returns ContentFile suitable for both HTTP download and Drive upload.
        """
        try:
            buffer = BytesIO()

            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=0.75 * inch,
                leftMargin=0.75 * inch,
                topMargin=0.75 * inch,
                bottomMargin=0.75 * inch,
                # FIX: Allow ReportLab to build very large documents
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

            pdf_content = buffer.getvalue()
            buffer.close()

            logger.info(
                f"PDF generated for note {self.note.id}: "
                f"{len(pdf_content):,} bytes ({len(pdf_content) // 1024} KB)"
            )

            filename = f"note_{self.note.slug}_{date.today()}.pdf"
            return ContentFile(pdf_content, name=filename)

        except Exception as e:
            logger.error(f"PDF export error for note {self.note.id}: {e}", exc_info=True)
            raise

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
        status = self.note.get_status_display()
        story.append(Paragraph(
            f'<para alignment="center"><font size="10" color="#4a5568">'
            f'<b>Created:</b> {created}<br/>'
            f'<b>Last Updated:</b> {updated}<br/>'
            f'<b>Status:</b> {status}</font></para>',
            self.styles['subtitle']
        ))
        story.append(Spacer(1, 0.5 * inch))

        if self.note.tags:
            story.append(Paragraph(
                f'<para alignment="center"><font size="9" color="#718096">'
                f'<b>Keywords:</b> {", ".join(self.note.tags)}</font></para>',
                self.styles['subtitle']
            ))

        story.append(Spacer(1, 1.5 * inch))
        story.append(Paragraph(
            '<para alignment="center"><font size="9" color="#a0aec0">'
            'Generated by NoteAssist AI<br/>Professional Note Management System</font></para>',
            self.styles['metadata']
        ))

    def _add_table_of_contents(self, story):
        story.append(Paragraph("TABLE OF CONTENTS", self.styles['toc_title']))
        story.append(Spacer(1, 0.2 * inch))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.3 * inch))

        toc_data = []
        chapter_num = 1
        for chapter in self.note.chapters.all().order_by('order'):
            toc_data.append([Paragraph(f"<b>{chapter_num}. {chapter.title}</b>", self.styles['toc_chapter'])])
            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                toc_data.append([Paragraph(f"{chapter_num}.{topic_num} {topic.name}", self.styles['toc_topic'])])
                topic_num += 1
            chapter_num += 1

        if toc_data:
            toc_table = Table(toc_data, colWidths=[6 * inch])
            toc_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(toc_table)

    def _add_chapters_and_topics(self, story):
        all_sources = {}
        source_counter = 1
        chapter_num = 1

        for chapter in self.note.chapters.all().order_by('order'):
            story.append(Paragraph(f"{chapter_num}. {chapter.title}", self.styles['chapter']))
            story.append(SectionDivider(style='line'))
            story.append(Spacer(1, 0.15 * inch))

            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                story.append(Paragraph(f"{chapter_num}.{topic_num} {topic.name}", self.styles['topic']))
                story.append(Spacer(1, 0.1 * inch))

                if topic.explanation:
                    explanation_html = topic.explanation.content
                    parser = RichTextHTMLParser()
                    parser.feed(explanation_html)
                    elements = parser.get_elements()

                    list_counter = 1
                    for elem in elements:
                        text = elem['text']
                        style_name = elem['style']
                        alignment = elem['alignment']

                        if elem.get('is_code', False):
                            code_text = unescape(text)
                            language = elem.get('language', 'python') or 'python'
                            story.append(Spacer(1, 0.1 * inch))
                            story.append(CodeEditorBlock(
                                code=code_text, language=language,
                                title=f"{language.upper()} Code", show_line_numbers=True
                            ))
                            story.append(Spacer(1, 0.15 * inch))
                            continue

                        is_detected_code, detected_lang = detect_code_pattern(text)
                        if is_detected_code:
                            story.append(Spacer(1, 0.1 * inch))
                            story.append(CodeEditorBlock(
                                code=unescape(text), language=detected_lang or 'python',
                                title=f"{(detected_lang or 'python').upper()} Code",
                                show_line_numbers=True
                            ))
                            story.append(Spacer(1, 0.15 * inch))
                            continue

                        base_style = self.styles.get(style_name, self.styles['CustomBody'])
                        if alignment == 'CENTER':
                            style = ParagraphStyle('_tmp', parent=base_style, alignment=TA_CENTER)
                        elif alignment == 'RIGHT':
                            style = ParagraphStyle('_tmp', parent=base_style, alignment=TA_RIGHT)
                        elif alignment == 'JUSTIFY':
                            style = ParagraphStyle('_tmp', parent=base_style, alignment=TA_JUSTIFY)
                        else:
                            style = base_style

                        if elem['is_list_item']:
                            bullet_char = '•' if elem['list_type'] == 'ul' else f"{list_counter}."
                            if elem['list_type'] != 'ul':
                                list_counter += 1
                            story.append(Paragraph(f"{bullet_char}  {text}", self.styles['bullet']))
                        else:
                            story.append(Paragraph(text, style))
                            list_counter = 1

                        story.append(Spacer(1, 0.04 * inch))

                    story.append(Spacer(1, 0.1 * inch))

                if topic.code_snippet:
                    story.append(Spacer(1, 0.1 * inch))
                    story.append(Paragraph("Practical Example", self.styles['section_label']))
                    story.append(Spacer(1, 0.08 * inch))
                    clean_code = re.sub(r'<[^>]+>', '', topic.code_snippet.code)
                    clean_code = unescape(clean_code)
                    story.append(CodeEditorBlock(
                        code=clean_code, language=topic.code_snippet.language,
                        title=f"{topic.code_snippet.language.upper()} Code",
                        show_line_numbers=True
                    ))
                    story.append(Spacer(1, 0.15 * inch))

                if topic.source:
                    source_key = topic.source.url
                    if source_key not in all_sources:
                        all_sources[source_key] = {
                            'number': source_counter,
                            'title': topic.source.title,
                            'url': topic.source.url,
                        }
                        source_counter += 1
                    citation_num = all_sources[source_key]['number']
                    story.append(Paragraph(
                        f'<i><font color="#718096">Source: [{citation_num}]</font></i>',
                        self.styles['CustomBody']
                    ))

                story.append(Spacer(1, 0.2 * inch))
                topic_num += 1

            chapter_num += 1
            story.append(Spacer(1, 0.3 * inch))

        return all_sources

    def _add_references(self, story, sources):
        story.append(Paragraph("REFERENCES", self.styles['reference_title']))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.2 * inch))
        for source in sorted(sources.values(), key=lambda x: x['number']):
            story.append(Paragraph(f"[{source['number']}] {source['title']}", self.styles['reference_item']))
            story.append(Paragraph(
                f"<link href='{source['url']}'>{source['url']}</link>",
                self.styles['reference_url']
            ))


def export_note_to_pdf(note):
    service = PDFExportService(note)
    return service.export()