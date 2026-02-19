# Enhanced PDF Export Service - IEEE Style Academic Formatting
# ============================================================================
# Professional document generation with proper typography, spacing, and
# VS Code-like code editor rendering
# ============================================================================

from io import BytesIO
from datetime import date
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, 
    Table, TableStyle, Preformatted, ListFlowable, ListItem, Flowable
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
    """Professional academic color scheme"""
    PRIMARY = colors.HexColor('#1a365d')       # Deep blue - main headings
    SECONDARY = colors.HexColor('#2c5282')     # Medium blue - subheadings
    ACCENT = colors.HexColor('#3182ce')        # Light blue - links/highlights
    TEXT_PRIMARY = colors.HexColor('#1a202c')  # Near black - body text
    TEXT_SECONDARY = colors.HexColor('#4a5568')  # Gray - secondary text
    TEXT_MUTED = colors.HexColor('#718096')    # Light gray - captions
    
    # Code Editor Colors (VS Code Dark Theme)
    CODE_BG = colors.HexColor('#1e1e1e')
    CODE_BORDER = colors.HexColor('#3c3c3c')
    CODE_TEXT = colors.HexColor('#d4d4d4')
    
    # Output/Result Colors
    OUTPUT_SUCCESS = colors.HexColor('#3fb950')
    OUTPUT_ERROR = colors.HexColor('#f85149')
    
    # Section backgrounds
    BLOCKQUOTE_BG = colors.HexColor('#edf2f7')
    BLOCKQUOTE_BORDER = colors.HexColor('#3182ce')
    
    # Dividers
    DIVIDER = colors.HexColor('#e2e8f0')
    DIVIDER_ACCENT = colors.HexColor('#3182ce')


# ============================================================================
# Custom Flowables for Enhanced Visual Elements
# ============================================================================

class CodeEditorBlock(Flowable):
    """
    Custom flowable that renders code like a VS Code editor
    with header bar, language label, and line numbers
    """
    
    def __init__(self, code, language='python', title=None, show_line_numbers=True, 
                 max_width=None, execution_output=None, execution_success=True):
        Flowable.__init__(self)
        self.code = code
        self.language = language.upper() if language else 'CODE'
        self.title = title
        self.show_line_numbers = show_line_numbers
        self.max_width = max_width or 6.5 * inch
        self.execution_output = execution_output
        self.execution_success = execution_success
        
        # Calculate dimensions
        self.lines = code.split('\n')
        self.line_height = 12
        self.header_height = 24
        self.padding = 12
        self.line_number_width = 35 if show_line_numbers else 0
        
        # Calculate heights
        self.code_height = len(self.lines) * self.line_height + (2 * self.padding)
        
        self.output_height = 0
        if execution_output:
            output_lines = execution_output.split('\n')
            self.output_height = len(output_lines) * self.line_height + (2 * self.padding) + 20
        
        self.total_height = self.header_height + self.code_height + self.output_height
    
    def wrap(self, availWidth, availHeight):
        return (min(self.max_width, availWidth), self.total_height)
    
    def draw(self):
        canvas = self.canv
        width = min(self.max_width, 6.5 * inch)
        
        # Starting Y position (reportlab draws from bottom)
        y = self.total_height
        
        # Draw header bar (macOS-style window chrome)
        y -= self.header_height
        canvas.setFillColor(colors.HexColor('#2d2d2d'))
        canvas.roundRect(0, y, width, self.header_height, 4, fill=1, stroke=0)
        
        # Traffic light buttons
        canvas.setFillColor(colors.HexColor('#ff5f56'))
        canvas.circle(14, y + self.header_height/2, 5, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor('#ffbd2e'))
        canvas.circle(30, y + self.header_height/2, 5, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor('#27c93f'))
        canvas.circle(46, y + self.header_height/2, 5, fill=1, stroke=0)
        
        # Language label
        canvas.setFillColor(colors.HexColor('#888888'))
        canvas.setFont('Helvetica-Bold', 9)
        title_text = self.title or self.language
        canvas.drawCentredString(width/2, y + 7, title_text)
        
        # Draw code area background
        y -= self.code_height
        canvas.setFillColor(IEEEColors.CODE_BG)
        canvas.rect(0, y, width, self.code_height, fill=1, stroke=0)
        
        # Draw line numbers background
        if self.show_line_numbers:
            canvas.setFillColor(colors.HexColor('#252526'))
            canvas.rect(0, y, self.line_number_width, self.code_height, fill=1, stroke=0)
        
        # Draw code lines
        code_y = y + self.code_height - self.padding - 10
        for i, line in enumerate(self.lines):
            # Line number
            if self.show_line_numbers:
                canvas.setFillColor(colors.HexColor('#858585'))
                canvas.setFont('Courier', 9)
                canvas.drawRightString(self.line_number_width - 8, code_y, str(i + 1))
            
            # Code text
            canvas.setFillColor(IEEEColors.CODE_TEXT)
            canvas.setFont('Courier', 10)
            # Truncate long lines
            display_line = line[:100] + '...' if len(line) > 100 else line
            canvas.drawString(self.line_number_width + 8, code_y, display_line)
            
            code_y -= self.line_height
        
        # Draw execution output if present
        if self.execution_output:
            # Output header
            y -= 20
            canvas.setFillColor(colors.HexColor('#1a1a1a'))
            canvas.rect(0, y - (self.output_height - 20), width, self.output_height - 20, fill=1, stroke=0)
            
            # Output label
            canvas.setFillColor(IEEEColors.OUTPUT_SUCCESS if self.execution_success else IEEEColors.OUTPUT_ERROR)
            canvas.setFont('Helvetica-Bold', 9)
            status_label = "OUTPUT" if self.execution_success else "ERROR"
            canvas.drawString(10, y - 12, f"> {status_label}")
            
            # Output text
            output_y = y - 28
            output_color = IEEEColors.OUTPUT_SUCCESS if self.execution_success else IEEEColors.OUTPUT_ERROR
            canvas.setFillColor(output_color)
            canvas.setFont('Courier', 9)
            
            for line in self.execution_output.split('\n')[:20]:  # Limit output lines
                display_line = line[:100] + '...' if len(line) > 100 else line
                canvas.drawString(12, output_y, display_line)
                output_y -= self.line_height
        
        # Draw border
        canvas.setStrokeColor(IEEEColors.CODE_BORDER)
        canvas.setLineWidth(1)
        canvas.roundRect(0, 0, width, self.total_height, 4, fill=0, stroke=1)


class SectionDivider(Flowable):
    """Elegant section divider for IEEE-style formatting"""
    
    def __init__(self, width=6.5*inch, style='line'):
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
            # Centered accent line
            canvas.setStrokeColor(IEEEColors.DIVIDER_ACCENT)
            canvas.setLineWidth(2)
            center = width / 2
            canvas.line(center - 40, 10, center + 40, 10)


# ============================================================================
# Code Detection Utilities
# ============================================================================

def detect_code_pattern(text, threshold_lines=3):
    """
    Detect if text looks like code based on common programming patterns.
    Returns (is_code, language) tuple.
    """
    if not text or len(text) < 20:
        return False, None
    
    lines = text.strip().split('\n')
    if len(lines) < threshold_lines:
        return False, None
    
    # Python patterns
    python_patterns = [
        r'^\s*def\s+\w+\s*\(',          # Function definition
        r'^\s*class\s+\w+[\(:]',         # Class definition
        r'^\s*import\s+\w+',             # Import statement
        r'^\s*from\s+\w+\s+import',      # From import
        r'^\s*if\s+.*:',                 # If statement
        r'^\s*for\s+\w+\s+in\s+',        # For loop
        r'^\s*while\s+.*:',              # While loop
        r'^\s*return\s+',                # Return statement
        r'^\s*print\s*\(',               # Print function
        r'^\s*elif\s+.*:',               # Elif statement
        r'^\s*except\s*.*:',             # Exception handling
    ]
    
    # JavaScript/TypeScript patterns
    js_patterns = [
        r'^\s*function\s+\w+\s*\(',      # Function definition
        r'^\s*const\s+\w+\s*=',          # Const declaration
        r'^\s*let\s+\w+\s*=',            # Let declaration
        r'^\s*var\s+\w+\s*=',            # Var declaration
        r'=>\s*{',                        # Arrow function
        r'^\s*console\.',                 # Console log
        r'^\s*export\s+',                 # Export statement
        r'^\s*import\s+.*\s+from',        # Import statement
    ]
    
    # Java/C++/C# patterns
    java_patterns = [
        r'^\s*public\s+(static\s+)?',    # Public method/class
        r'^\s*private\s+',               # Private method
        r'^\s*protected\s+',             # Protected method
        r'^\s*void\s+\w+\s*\(',          # Void method
        r'^\s*int\s+\w+\s*[=;(]',        # Int variable
        r'^\s*String\s+\w+',             # String variable
        r'System\.out\.print',           # System output
        r'#include\s*<',                 # C++ include
        r'^\s*using\s+namespace',         # C++ namespace
    ]
    
    # Count pattern matches
    python_score = 0
    js_score = 0
    java_score = 0
    
    for line in lines:
        for pattern in python_patterns:
            if re.search(pattern, line):
                python_score += 1
                break
        for pattern in js_patterns:
            if re.search(pattern, line):
                js_score += 1
                break
        for pattern in java_patterns:
            if re.search(pattern, line):
                java_score += 1
                break
    
    # Check for indentation patterns (common in code)
    indented_lines = sum(1 for line in lines if line and line[0] in ' \t')
    indent_ratio = indented_lines / len(lines) if lines else 0
    
    # Determine if it's code and which language
    max_score = max(python_score, js_score, java_score)
    total_lines = len(lines)
    
    # If we have significant pattern matches or high indentation ratio
    if max_score >= 2 or (max_score >= 1 and indent_ratio > 0.3):
        if python_score == max_score:
            return True, 'python'
        elif js_score == max_score:
            return True, 'javascript'
        elif java_score == max_score:
            return True, 'java'
    
    # Also check for inline code markers
    if total_lines >= 3 and indent_ratio > 0.4:
        return True, 'python'
    
    return False, None


def extract_code_blocks_from_text(text):
    """
    Extract code blocks from plain text that contains code examples.
    Returns list of (is_code, content, language) tuples.
    """
    segments = []
    lines = text.split('\n')
    current_segment = []
    in_code = False
    current_lang = None
    
    for line in lines:
        stripped = line.strip()
        
        # Detect code start patterns
        code_start_patterns = [
            (r'^def\s+\w+\s*\(', 'python'),
            (r'^class\s+\w+', 'python'),
            (r'^function\s+\w+', 'javascript'),
            (r'^const\s+\w+\s*=\s*\(', 'javascript'),
            (r'^public\s+(static\s+)?(void|int|String)', 'java'),
            (r'^#include\s*<', 'cpp'),
        ]
        
        is_code_line = False
        detected_lang = None
        
        for pattern, lang in code_start_patterns:
            if re.match(pattern, stripped):
                is_code_line = True
                detected_lang = lang
                break
        
        # Check if line is indented (continuation of code)
        if not is_code_line and line and line[0] in ' \t' and in_code:
            is_code_line = True
            detected_lang = current_lang
        
        if is_code_line:
            if not in_code:
                # Flush previous non-code segment
                if current_segment:
                    segments.append((False, '\n'.join(current_segment), None))
                    current_segment = []
                in_code = True
                current_lang = detected_lang or 'python'
            current_segment.append(line)
        else:
            if in_code:
                # Check if this is end of code block (empty line or text line)
                if not stripped or (stripped and not line[0] in ' \t'):
                    # Flush code segment
                    if current_segment:
                        segments.append((True, '\n'.join(current_segment), current_lang))
                        current_segment = []
                    in_code = False
                    current_lang = None
                    if stripped:
                        current_segment.append(line)
                else:
                    current_segment.append(line)
            else:
                current_segment.append(line)
    
    # Flush remaining segment
    if current_segment:
        segments.append((in_code, '\n'.join(current_segment), current_lang if in_code else None))
    
    return segments


class RichTextHTMLParser(HTMLParser):
    """
    Advanced HTML parser that converts Quill editor output to ReportLab format
    Preserves all formatting: headings, bold, italic, underline, lists, alignment, colors
    Now also detects and extracts code blocks for VS Code-style rendering
    """
    
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
        # Code block tracking
        self.in_code_block = False
        self.code_block_content = []
        self.code_language = 'python'
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tag_stack.append((tag, attrs_dict))
        
        # Handle alignment from class attribute
        if 'class' in attrs_dict:
            if 'ql-align-center' in attrs_dict['class']:
                self.alignment = 'CENTER'
            elif 'ql-align-right' in attrs_dict['class']:
                self.alignment = 'RIGHT'
            elif 'ql-align-justify' in attrs_dict['class']:
                self.alignment = 'JUSTIFY'
        
        # Handle text formatting tags
        if tag == 'pre':
            # Flush any current text before code block
            self._flush_paragraph()
            self.in_code_block = True
            self.code_block_content = []
            # Try to detect language from class
            if 'class' in attrs_dict:
                class_val = attrs_dict['class']
                lang_match = re.search(r'language-(\w+)', class_val)
                if lang_match:
                    self.code_language = lang_match.group(1)
                else:
                    self.code_language = 'python'
            else:
                self.code_language = 'python'
        elif tag == 'strong' or tag == 'b':
            if not self.in_code_block:
                self.current_text.append('<b>')
        elif tag == 'em' or tag == 'i':
            if not self.in_code_block:
                self.current_text.append('<i>')
        elif tag == 'u':
            if not self.in_code_block:
                self.current_text.append('<u>')
        elif tag == 's' or tag == 'strike':
            if not self.in_code_block:
                self.current_text.append('<strike>')
        elif tag == 'code':
            if not self.in_code_block:
                self.current_text.append('<font face="Courier" backColor="#f0f0f0">')
        elif tag == 'br':
            if self.in_code_block:
                self.code_block_content.append('\n')
            else:
                self.current_text.append('<br/>')
        elif tag in ['h1', 'h2', 'h3', 'h4']:
            # Flush current text before heading
            self._flush_paragraph()
            self.current_styles['heading'] = tag
        elif tag == 'blockquote':
            self._flush_paragraph()
            self.current_styles['blockquote'] = True
        elif tag in ['ul', 'ol']:
            self._flush_paragraph()
            self.list_stack.append(tag)
        elif tag == 'li':
            # List items will be handled separately
            pass
        elif tag == 'p':
            # Check for alignment in style attribute
            if 'style' in attrs_dict:
                style = attrs_dict['style']
                if 'text-align: center' in style:
                    self.alignment = 'CENTER'
                elif 'text-align: right' in style:
                    self.alignment = 'RIGHT'
                elif 'text-align: justify' in style:
                    self.alignment = 'JUSTIFY'
        elif tag == 'span':
            # Handle colors and backgrounds from style
            if 'style' in attrs_dict:
                style = attrs_dict['style']
                # Extract color
                color_match = re.search(r'color:\s*([^;]+)', style)
                if color_match:
                    color = color_match.group(1).strip()
                    self.current_text.append(f'<font color="{color}">')
                # Extract background
                bg_match = re.search(r'background-color:\s*([^;]+)', style)
                if bg_match:
                    bg_color = bg_match.group(1).strip()
                    self.current_text.append(f'<font backColor="{bg_color}">')
    
    def handle_endtag(self, tag):
        if not self.tag_stack:
            return
            
        last_tag, _ = self.tag_stack[-1]
        if last_tag == tag:
            self.tag_stack.pop()
        
        # Handle code block end
        if tag == 'pre':
            if self.in_code_block:
                code_text = ''.join(self.code_block_content)
                # Store as code element
                self.elements.append({
                    'text': code_text,
                    'style': 'code',
                    'alignment': 'LEFT',
                    'is_list_item': False,
                    'list_type': None,
                    'is_code': True,
                    'language': self.code_language
                })
                self.in_code_block = False
                self.code_block_content = []
            return
        
        # Close text formatting tags
        if tag == 'strong' or tag == 'b':
            if not self.in_code_block:
                self.current_text.append('</b>')
        elif tag == 'em' or tag == 'i':
            if not self.in_code_block:
                self.current_text.append('</i>')
        elif tag == 'u':
            if not self.in_code_block:
                self.current_text.append('</u>')
        elif tag == 's' or tag == 'strike':
            if not self.in_code_block:
                self.current_text.append('</strike>')
        elif tag == 'code':
            if not self.in_code_block:
                self.current_text.append('</font>')
        elif tag in ['h1', 'h2', 'h3', 'h4']:
            self._flush_paragraph()
            self.current_styles.pop('heading', None)
        elif tag == 'blockquote':
            self._flush_paragraph()
            self.current_styles.pop('blockquote', None)
        elif tag in ['ul', 'ol']:
            if self.list_stack and self.list_stack[-1] == tag:
                self.list_stack.pop()
        elif tag == 'li':
            self._flush_paragraph()
        elif tag == 'p':
            self._flush_paragraph()
            self.alignment = 'LEFT'
        elif tag == 'span':
            # Close color/background
            self.current_text.append('</font>')
    
    def handle_data(self, data):
        # Handle code block content
        if self.in_code_block:
            self.code_block_content.append(data)
            return
        
        # Clean up whitespace but preserve structure
        if self.tag_stack and self.tag_stack[-1][0] in ['pre', 'code']:
            self.current_text.append(data)
        else:
            # Preserve meaningful whitespace
            cleaned = data.strip()
            if cleaned:
                self.current_text.append(cleaned)
            elif data and not cleaned:
                # Preserve single spaces
                self.current_text.append(' ')
    
    def _flush_paragraph(self):
        """Convert accumulated text to a paragraph element"""
        if not self.current_text:
            return
        
        text = ''.join(self.current_text).strip()
        if not text:
            self.current_text = []
            return
        
        # Determine style based on current context
        if 'heading' in self.current_styles:
            heading_level = self.current_styles['heading']
            style_name = f'CustomHeading{heading_level[1]}'
        elif 'blockquote' in self.current_styles:
            style_name = 'CustomBlockquote'
        elif self.list_stack:
            style_name = 'CustomListItem'
        else:
            style_name = 'CustomBody'
        
        # Store element with alignment info
        self.elements.append({
            'text': text,
            'style': style_name,
            'alignment': self.alignment,
            'is_list_item': bool(self.list_stack),
            'list_type': self.list_stack[-1] if self.list_stack else None,
            'is_code': False,
            'language': None
        })
        
        self.current_text = []
    
    def get_elements(self):
        """Flush remaining text and return all elements"""
        self._flush_paragraph()
        return self.elements


class PDFExportService:
    """
    Enhanced PDF export service with IEEE-style academic formatting
    Features:
    - Professional typography hierarchy
    - VS Code-like code editor blocks
    - Proper spacing and margins
    - Table of contents with dot leaders
    - References section
    """
    
    def __init__(self, note):
        self.note = note
        self.styles = self._setup_ieee_styles()
        self.page_width = A4[0] - 2*inch  # Content width
    
    def _setup_ieee_styles(self):
        """Setup comprehensive IEEE-style PDF styles"""
        base_styles = getSampleStyleSheet()
        
        return {
            # ═══════════════════════════════════════════════════════════════
            # Title Page Styles
            # ═══════════════════════════════════════════════════════════════
            'title': ParagraphStyle(
                'IEEETitle',
                parent=base_styles['Heading1'],
                fontSize=28,
                textColor=IEEEColors.PRIMARY,
                spaceAfter=24,
                spaceBefore=0,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                leading=34
            ),
            'subtitle': ParagraphStyle(
                'IEEESubtitle',
                parent=base_styles['Normal'],
                fontSize=12,
                textColor=IEEEColors.TEXT_SECONDARY,
                spaceAfter=12,
                alignment=TA_CENTER,
                fontName='Helvetica',
                leading=18
            ),
            'metadata': ParagraphStyle(
                'IEEEMetadata',
                parent=base_styles['Normal'],
                fontSize=10,
                textColor=IEEEColors.TEXT_MUTED,
                spaceAfter=6,
                alignment=TA_CENTER,
                fontName='Helvetica',
                leading=14
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # Section Headings (IEEE Hierarchy)
            # ═══════════════════════════════════════════════════════════════
            'toc_title': ParagraphStyle(
                'TOCTitle',
                parent=base_styles['Heading1'],
                fontSize=18,
                textColor=IEEEColors.PRIMARY,
                spaceAfter=24,
                spaceBefore=0,
                fontName='Helvetica-Bold',
                leading=22,
                alignment=TA_LEFT
            ),
            'chapter': ParagraphStyle(
                'IEEEChapter',
                parent=base_styles['Heading1'],
                fontSize=16,
                textColor=IEEEColors.PRIMARY,
                spaceAfter=12,
                spaceBefore=24,
                fontName='Helvetica-Bold',
                leading=20,
                keepWithNext=1
            ),
            'topic': ParagraphStyle(
                'IEEETopic',
                parent=base_styles['Heading2'],
                fontSize=13,
                textColor=IEEEColors.SECONDARY,
                spaceAfter=8,
                spaceBefore=18,
                fontName='Helvetica-Bold',
                leading=16,
                keepWithNext=1
            ),
            'section_label': ParagraphStyle(
                'SectionLabel',
                parent=base_styles['Normal'],
                fontSize=10,
                textColor=IEEEColors.ACCENT,
                spaceBefore=16,
                spaceAfter=6,
                fontName='Helvetica-Bold',
                leading=12
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # Body Text Styles
            # ═══════════════════════════════════════════════════════════════
            'CustomHeading1': ParagraphStyle(
                'CustomHeading1',
                parent=base_styles['Heading1'],
                fontSize=14,
                textColor=IEEEColors.PRIMARY,
                spaceAfter=8,
                spaceBefore=16,
                fontName='Helvetica-Bold',
                leading=18
            ),
            'CustomHeading2': ParagraphStyle(
                'CustomHeading2',
                parent=base_styles['Heading2'],
                fontSize=12,
                textColor=IEEEColors.SECONDARY,
                spaceAfter=6,
                spaceBefore=12,
                fontName='Helvetica-Bold',
                leading=16
            ),
            'CustomHeading3': ParagraphStyle(
                'CustomHeading3',
                parent=base_styles['Heading3'],
                fontSize=11,
                textColor=IEEEColors.SECONDARY,
                spaceAfter=6,
                spaceBefore=10,
                fontName='Helvetica-Bold',
                leading=14
            ),
            'CustomBody': ParagraphStyle(
                'IEEEBody',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                alignment=TA_JUSTIFY,
                spaceAfter=8,
                fontName='Helvetica',
                firstLineIndent=0,
                allowWidows=0,
                allowOrphans=0,
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            'CustomBodyLeft': ParagraphStyle(
                'IEEEBodyLeft',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                alignment=TA_LEFT,
                spaceAfter=8,
                fontName='Helvetica',
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            'CustomBodyCenter': ParagraphStyle(
                'IEEEBodyCenter',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                alignment=TA_CENTER,
                spaceAfter=8,
                fontName='Helvetica',
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            'CustomBodyRight': ParagraphStyle(
                'IEEEBodyRight',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                alignment=TA_RIGHT,
                spaceAfter=8,
                fontName='Helvetica',
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # Special Content Styles
            # ═══════════════════════════════════════════════════════════════
            'CustomBlockquote': ParagraphStyle(
                'IEEEBlockquote',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                leftIndent=20,
                rightIndent=20,
                spaceAfter=12,
                spaceBefore=12,
                fontName='Helvetica-Oblique',
                textColor=IEEEColors.TEXT_SECONDARY,
                backColor=IEEEColors.BLOCKQUOTE_BG,
                borderPadding=10
            ),
            'CustomListItem': ParagraphStyle(
                'IEEEListItem',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                leftIndent=25,
                spaceAfter=4,
                fontName='Helvetica',
                bulletIndent=10,
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            'bullet': ParagraphStyle(
                'IEEEBullet',
                parent=base_styles['Normal'],
                fontSize=10,
                leading=16,
                leftIndent=25,
                bulletIndent=10,
                spaceAfter=4,
                fontName='Helvetica',
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # Code Styles (Fallback for non-custom blocks)
            # ═══════════════════════════════════════════════════════════════
            'code': ParagraphStyle(
                'IEEECode',
                parent=base_styles['Code'],
                fontSize=9,
                leading=13,
                leftIndent=12,
                rightIndent=12,
                backColor=IEEEColors.CODE_BG,
                textColor=IEEEColors.CODE_TEXT,
                borderColor=IEEEColors.CODE_BORDER,
                borderWidth=1,
                borderPadding=12,
                fontName='Courier',
                spaceAfter=12,
                spaceBefore=8
            ),
            'code_label': ParagraphStyle(
                'CodeLabel',
                parent=base_styles['Normal'],
                fontSize=9,
                textColor=IEEEColors.TEXT_MUTED,
                spaceBefore=12,
                spaceAfter=4,
                fontName='Helvetica-Bold',
                leading=12
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # TOC Styles
            # ═══════════════════════════════════════════════════════════════
            'toc_chapter': ParagraphStyle(
                'TOCChapter',
                parent=base_styles['Normal'],
                fontSize=11,
                textColor=IEEEColors.PRIMARY,
                fontName='Helvetica-Bold',
                spaceAfter=6,
                spaceBefore=8,
                leftIndent=0
            ),
            'toc_topic': ParagraphStyle(
                'TOCTopic',
                parent=base_styles['Normal'],
                fontSize=10,
                textColor=IEEEColors.TEXT_PRIMARY,
                fontName='Helvetica',
                spaceAfter=4,
                leftIndent=20
            ),
            
            # ═══════════════════════════════════════════════════════════════
            # Reference Styles
            # ═══════════════════════════════════════════════════════════════
            'reference_title': ParagraphStyle(
                'ReferenceTitle',
                parent=base_styles['Heading1'],
                fontSize=14,
                textColor=IEEEColors.PRIMARY,
                spaceAfter=16,
                spaceBefore=0,
                fontName='Helvetica-Bold',
                leading=18
            ),
            'reference_item': ParagraphStyle(
                'ReferenceItem',
                parent=base_styles['Normal'],
                fontSize=9,
                leading=14,
                leftIndent=20,
                firstLineIndent=-20,
                spaceAfter=8,
                fontName='Helvetica',
                textColor=IEEEColors.TEXT_PRIMARY
            ),
            'reference_url': ParagraphStyle(
                'ReferenceURL',
                parent=base_styles['Normal'],
                fontSize=8,
                leftIndent=20,
                spaceAfter=12,
                fontName='Courier',
                textColor=IEEEColors.ACCENT
            ),
        }
    
    def export(self):
        """Export note to PDF with IEEE-style academic formatting"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=0.75*inch,
                leftMargin=0.75*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            story = []
            
            # Build PDF content
            self._add_title_page(story)
            story.append(PageBreak())
            
            self._add_table_of_contents(story)
            story.append(PageBreak())
            
            sources = self._add_chapters_and_topics(story)
            
            if sources:
                story.append(PageBreak())
                self._add_references(story, sources)
            
            # Build PDF
            doc.build(story)
            
            pdf_content = buffer.getvalue()
            buffer.close()
            
            filename = f"note_{self.note.slug}_{date.today()}.pdf"
            return ContentFile(pdf_content, name=filename)
            
        except Exception as e:
            logger.error(f"Enhanced PDF export error for note {self.note.id}: {e}")
            raise
    
    def _add_title_page(self, story):
        """Add professional IEEE-style title page"""
        # Top spacing
        story.append(Spacer(1, 1.5*inch))
        
        # Document type label
        story.append(Paragraph(
            "STUDY NOTES",
            self.styles['metadata']
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # Main title
        story.append(Paragraph(self.note.title, self.styles['title']))
        story.append(Spacer(1, 0.4*inch))
        
        # Divider
        story.append(SectionDivider(style='accent'))
        story.append(Spacer(1, 0.4*inch))
        
        # Metadata block
        created = self.note.created_at.strftime('%B %d, %Y')
        updated = self.note.updated_at.strftime('%B %d, %Y')
        status = self.note.get_status_display()
        
        metadata_text = f"""
        <para alignment="center">
        <font size="10" color="#4a5568">
        <b>Created:</b> {created}<br/>
        <b>Last Updated:</b> {updated}<br/>
        <b>Status:</b> {status}
        </font>
        </para>
        """
        story.append(Paragraph(metadata_text, self.styles['subtitle']))
        story.append(Spacer(1, 0.5*inch))
        
        # Tags
        if self.note.tags:
            tags_text = f"""
            <para alignment="center">
            <font size="9" color="#718096">
            <b>Keywords:</b> {', '.join(self.note.tags)}
            </font>
            </para>
            """
            story.append(Paragraph(tags_text, self.styles['subtitle']))
        
        # Footer info
        story.append(Spacer(1, 1.5*inch))
        footer_text = """
        <para alignment="center">
        <font size="9" color="#a0aec0">
        Generated by NoteAssist AI<br/>
        Professional Note Management System
        </font>
        </para>
        """
        story.append(Paragraph(footer_text, self.styles['metadata']))
    
    def _add_table_of_contents(self, story):
        """Add IEEE-style table of contents"""
        story.append(Paragraph("TABLE OF CONTENTS", self.styles['toc_title']))
        story.append(Spacer(1, 0.2*inch))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.3*inch))
        
        toc_data = []
        chapter_num = 1
        
        for chapter in self.note.chapters.all().order_by('order'):
            # Chapter entry
            toc_data.append([
                Paragraph(
                    f"<b>{chapter_num}. {chapter.title}</b>",
                    self.styles['toc_chapter']
                )
            ])
            
            # Topic entries
            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                toc_data.append([
                    Paragraph(
                        f"{chapter_num}.{topic_num} {topic.name}",
                        self.styles['toc_topic']
                    )
                ])
                topic_num += 1
            
            chapter_num += 1
        
        if toc_data:
            toc_table = Table(toc_data, colWidths=[6*inch])
            toc_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(toc_table)
    
    def _add_chapters_and_topics(self, story):
        """Add chapters and topics with IEEE formatting and enhanced code blocks"""
        all_sources = {}
        source_counter = 1
        
        chapter_num = 1
        for chapter in self.note.chapters.all().order_by('order'):
            # Chapter heading
            chapter_title = f"{chapter_num}. {chapter.title}"
            story.append(Paragraph(chapter_title, self.styles['chapter']))
            story.append(SectionDivider(style='line'))
            story.append(Spacer(1, 0.15*inch))
            
            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                # Topic heading
                topic_title = f"{chapter_num}.{topic_num} {topic.name}"
                story.append(Paragraph(topic_title, self.styles['topic']))
                story.append(Spacer(1, 0.1*inch))
                
                # ═══════════════════════════════════════════════════════════
                # DEFINITION / CORE CONCEPT Section
                # ═══════════════════════════════════════════════════════════
                if topic.explanation: 
                    explanation_html = topic.explanation.content
                    
                    # Parse HTML and convert to PDF elements
                    parser = RichTextHTMLParser()
                    parser.feed(explanation_html)
                    elements = parser.get_elements()
                    
                    # Add each element to story
                    list_counter = 1
                    for elem in elements:
                        text = elem['text']
                        style_name = elem['style']
                        alignment = elem['alignment']
                        
                        # Check if this is a code block - render with VS Code style
                        if elem.get('is_code', False):
                            code_text = unescape(text)
                            language = elem.get('language', 'python') or 'python'
                            code_block = CodeEditorBlock(
                                code=code_text,
                                language=language,
                                title=f"{language.upper()} Code",
                                show_line_numbers=True
                            )
                            story.append(Spacer(1, 0.1*inch))
                            story.append(code_block)
                            story.append(Spacer(1, 0.15*inch))
                            continue
                        
                        # Detect code patterns in plain text (multi-line)
                        is_detected_code, detected_lang = detect_code_pattern(text)
                        if is_detected_code:
                            code_text = unescape(text)
                            code_block = CodeEditorBlock(
                                code=code_text,
                                language=detected_lang or 'python',
                                title=f"{(detected_lang or 'python').upper()} Code",
                                show_line_numbers=True
                            )
                            story.append(Spacer(1, 0.1*inch))
                            story.append(code_block)
                            story.append(Spacer(1, 0.15*inch))
                            continue
                        
                        # Get base style
                        if style_name in self.styles:
                            base_style = self.styles[style_name]
                        else:
                            base_style = self.styles['CustomBody']
                        
                        # Apply alignment
                        if alignment == 'CENTER':
                            style = ParagraphStyle('temp', parent=base_style, alignment=TA_CENTER)
                        elif alignment == 'RIGHT':
                            style = ParagraphStyle('temp', parent=base_style, alignment=TA_RIGHT)
                        elif alignment == 'JUSTIFY':
                            style = ParagraphStyle('temp', parent=base_style, alignment=TA_JUSTIFY)
                        else:
                            style = base_style
                        
                        # Handle list items
                        if elem['is_list_item']:
                            if elem['list_type'] == 'ul':
                                bullet_char = '•'
                            else:
                                bullet_char = f"{list_counter}."
                                list_counter += 1
                            story.append(Paragraph(f"{bullet_char}  {text}", self.styles['bullet']))
                        else:
                            story.append(Paragraph(text, style))
                            list_counter = 1  # Reset for next list
                        
                        story.append(Spacer(1, 0.04*inch))
                    
                    story.append(Spacer(1, 0.1*inch))
                
                # ═══════════════════════════════════════════════════════════
                # PRACTICAL EXAMPLES / CODE Section
                # ═══════════════════════════════════════════════════════════
                if topic.code_snippet:
                    story.append(Spacer(1, 0.1*inch))
                    
                    # Section label
                    story.append(Paragraph(
                        "Practical Example",
                        self.styles['section_label']
                    ))
                    story.append(Spacer(1, 0.08*inch))
                    
                    # Clean the code
                    clean_code = re.sub(r'<[^>]+>', '', topic.code_snippet.code)
                    clean_code = unescape(clean_code)
                    
                    # Create VS Code-like code block
                    code_block = CodeEditorBlock(
                        code=clean_code,
                        language=topic.code_snippet.language,
                        title=f"{topic.code_snippet.language.upper()} Code",
                        show_line_numbers=True
                    )
                    story.append(code_block)
                    story.append(Spacer(1, 0.15*inch))
                
                # ═══════════════════════════════════════════════════════════
                # SOURCE CITATION
                # ═══════════════════════════════════════════════════════════
                if topic.source:
                    source_key = topic.source.url
                    if source_key not in all_sources:
                        all_sources[source_key] = {
                            'number': source_counter,
                            'title': topic.source.title,
                            'url': topic.source.url
                        }
                        source_counter += 1
                    
                    citation_num = all_sources[source_key]['number']
                    citation = Paragraph(
                        f'<i><font color="#718096">Source: [{citation_num}]</font></i>',
                        self.styles['CustomBody']
                    )
                    story.append(citation)
                
                story.append(Spacer(1, 0.2*inch))
                topic_num += 1
            
            chapter_num += 1
            story.append(Spacer(1, 0.3*inch))
        
        return all_sources
    
    def _add_references(self, story, sources):
        """Add IEEE-style references section"""
        story.append(Paragraph("REFERENCES", self.styles['reference_title']))
        story.append(SectionDivider(style='line'))
        story.append(Spacer(1, 0.2*inch))
        
        sorted_sources = sorted(sources.values(), key=lambda x: x['number'])
        
        for source in sorted_sources:
            # Reference number and title
            ref_text = f"[{source['number']}] {source['title']}"
            story.append(Paragraph(ref_text, self.styles['reference_item']))
            
            # URL on separate line
            url_text = f"<link href='{source['url']}'>{source['url']}</link>"
            story.append(Paragraph(url_text, self.styles['reference_url']))


def export_note_to_pdf(note):
    """Export note with enhanced formatting preservation"""
    service = PDFExportService(note)
    return service.export()