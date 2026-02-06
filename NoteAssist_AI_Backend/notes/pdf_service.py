# Enhanced PDF Export Service with Rich Text Formatting
# ============================================================================

from io import BytesIO
from datetime import date
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, 
    Table, TableStyle, Preformatted, ListFlowable, ListItem
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
import re
from html import unescape
from html.parser import HTMLParser
import logging

logger = logging.getLogger(__name__)


class RichTextHTMLParser(HTMLParser):
    """
    Advanced HTML parser that converts Quill editor output to ReportLab format
    Preserves all formatting: headings, bold, italic, underline, lists, alignment, colors
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
        if tag == 'strong' or tag == 'b':
            self.current_text.append('<b>')
        elif tag == 'em' or tag == 'i':
            self.current_text.append('<i>')
        elif tag == 'u':
            self.current_text.append('<u>')
        elif tag == 's' or tag == 'strike':
            self.current_text.append('<strike>')
        elif tag == 'code':
            self.current_text.append('<font face="Courier" backColor="#f0f0f0">')
        elif tag == 'br':
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
        
        # Close text formatting tags
        if tag == 'strong' or tag == 'b':
            self.current_text.append('</b>')
        elif tag == 'em' or tag == 'i':
            self.current_text.append('</i>')
        elif tag == 'u':
            self.current_text.append('</u>')
        elif tag == 's' or tag == 'strike':
            self.current_text.append('</strike>')
        elif tag == 'code':
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
            'list_type': self.list_stack[-1] if self.list_stack else None
        })
        
        self.current_text = []
    
    def get_elements(self):
        """Flush remaining text and return all elements"""
        self._flush_paragraph()
        return self.elements


class PDFExportService:
    """Enhanced PDF export service that preserves rich text formatting"""
    
    def __init__(self, note):
        self.note = note
        self.styles = self._setup_enhanced_styles()
    
    def _setup_enhanced_styles(self):
        """Setup comprehensive PDF styles matching Quill editor"""
        base_styles = getSampleStyleSheet()
        
        return {
            'title': ParagraphStyle(
                'CustomTitle',
                parent=base_styles['Heading1'],
                fontSize=36,
                textColor=colors.HexColor('#1a202c'),
                spaceAfter=48,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold',
                leading=42
            ),
            'subtitle': ParagraphStyle(
                'CustomSubtitle',
                parent=base_styles['Normal'],
                fontSize=14,
                textColor=colors.HexColor('#4a5568'),
                spaceAfter=24,
                alignment=TA_CENTER,
                fontName='Helvetica',
                leading=20
            ),
            'chapter': ParagraphStyle(
                'ChapterHeading',
                parent=base_styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=18,
                spaceBefore=48,
                fontName='Helvetica-Bold',
                leading=28,
                keepWithNext=1
            ),
            'topic': ParagraphStyle(
                'TopicHeading',
                parent=base_styles['Heading2'],
                fontSize=18,
                textColor=colors.HexColor('#1e40af'),
                spaceAfter=12,
                spaceBefore=30,
                fontName='Helvetica-Bold',
                leading=22,
                keepWithNext=1
            ),
            'CustomHeading1': ParagraphStyle(
                'CustomHeading1',
                parent=base_styles['Heading1'],
                fontSize=20,
                textColor=colors.HexColor('#1e40af'),
                spaceAfter=14,
                spaceBefore=24,
                fontName='Helvetica-Bold',
                leading=24
            ),
            'CustomHeading2': ParagraphStyle(
                'CustomHeading2',
                parent=base_styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=12,
                spaceBefore=20,
                fontName='Helvetica-Bold',
                leading=20
            ),
            'CustomHeading3': ParagraphStyle(
                'CustomHeading3',
                parent=base_styles['Heading3'],
                fontSize=14,
                textColor=colors.HexColor('#3b82f6'),
                spaceAfter=10,
                spaceBefore=16,
                fontName='Helvetica-Bold',
                leading=18
            ),
            'CustomBody': ParagraphStyle(
                'CustomBody',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                alignment=TA_JUSTIFY,
                spaceAfter=12,
                fontName='Helvetica',
                allowWidows=0,
                allowOrphans=0,
            ),
            'CustomBodyLeft': ParagraphStyle(
                'CustomBodyLeft',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                alignment=TA_LEFT,
                spaceAfter=12,
                fontName='Helvetica'
            ),
            'CustomBodyCenter': ParagraphStyle(
                'CustomBodyCenter',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                alignment=TA_CENTER,
                spaceAfter=12,
                fontName='Helvetica'
            ),
            'CustomBodyRight': ParagraphStyle(
                'CustomBodyRight',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                alignment=TA_RIGHT,
                spaceAfter=12,
                fontName='Helvetica'
            ),
            'CustomBlockquote': ParagraphStyle(
                'CustomBlockquote',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                leftIndent=24,
                rightIndent=24,
                spaceAfter=14,
                spaceBefore=14,
                fontName='Helvetica-Oblique',
                textColor=colors.HexColor('#4b5563'),
                borderColor=colors.HexColor('#3b82f6'),
                borderWidth=0,
                borderPadding=12,
                backColor=colors.HexColor('#f0f9ff'),
                leftBorderPadding=16,
                borderLeft=4,
                borderLeftColor=colors.HexColor('#3b82f6')
            ),
            'CustomListItem': ParagraphStyle(
                'CustomListItem',
                parent=base_styles['Normal'],
                fontSize=11,
                leading=18,
                leftIndent=20,
                spaceAfter=8,
                fontName='Helvetica'
            ),
            'code': ParagraphStyle(
                'CodeStyle',
                parent=base_styles['Code'],
                fontSize=9,
                leading=14,
                leftIndent=20,
                rightIndent=20,
                backColor=colors.HexColor('#1f2937'),
                textColor=colors.HexColor('#f3f4f6'),
                borderColor=colors.HexColor('#374151'),
                borderWidth=1,
                borderPadding=16,
                fontName='Courier',
                spaceAfter=16,
                spaceBefore=16
            ),
        }
    
    def export(self):
        """Export note to PDF with full rich text formatting"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=60,
                leftMargin=60,
                topMargin=72,
                bottomMargin=72
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
        """Add professional title page"""
        story.append(Spacer(1, 2.5*inch))
        story.append(Paragraph(self.note.title, self.styles['title']))
        story.append(Spacer(1, 0.8*inch))
        
        metadata_text = f"""
        <para alignment="center" fontSize="13" fontName="Helvetica">
        <b>📚 Study Notes Document</b><br/><br/>
        📅 Created: {self.note.created_at.strftime('%B %d, %Y')}<br/>
        🔄 Last Updated: {self.note.updated_at.strftime('%B %d, %Y')}<br/>
        📊 Status: {self.note.get_status_display()}<br/><br/>
        <font color="#3b82f6"><b>NoteAssist AI</b></font>
        </para>
        """
        story.append(Paragraph(metadata_text, self.styles['subtitle']))
        
        if self.note.tags:
            story.append(Spacer(1, 0.5*inch))
            tags_text = f"""
            <para alignment='center' fontSize='11' fontName='Helvetica'>
            <b>🏷️ Tags:</b> <font color='#6366f1'>{' • '.join(self.note.tags)}</font>
            </para>
            """
            story.append(Paragraph(tags_text, self.styles['subtitle']))
    
    def _add_table_of_contents(self, story):
        """Add table of contents"""
        story.append(Paragraph("📑 Table of Contents", self.styles['chapter']))
        story.append(Spacer(1, 0.4*inch))
        
        toc_data = []
        chapter_num = 1
        
        for chapter in self.note.chapters.all().order_by('order'):
            toc_data.append([
                Paragraph(
                    f"<b>Chapter {chapter_num}: {chapter.title}</b>",
                    ParagraphStyle(
                        'TOCChapter',
                        parent=self.styles['CustomBody'],
                        fontSize=12,
                        textColor=colors.HexColor('#2563eb'),
                        fontName='Helvetica-Bold',
                        spaceAfter=8
                    )
                ),
                ""
            ])
            
            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                toc_data.append([
                    Paragraph(
                        f"&nbsp;&nbsp;&nbsp;&nbsp;{chapter_num}.{topic_num} {topic.name}",
                        ParagraphStyle(
                            'TOCTopic',
                            parent=self.styles['CustomBody'],
                            fontSize=10,
                            textColor=colors.black,
                            leftIndent=24,
                            fontName='Helvetica'
                        )
                    ),
                    ""
                ])
                topic_num += 1
            
            chapter_num += 1
        
        if toc_data:
            toc_table = Table(toc_data, colWidths=[5.8*inch, 0.2*inch])
            toc_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (0, -1), 12),
                ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ]))
            story.append(toc_table)
    
    def _add_chapters_and_topics(self, story):
        """Add chapters and topics with FULL rich text formatting"""
        all_sources = {}
        source_counter = 1
        
        chapter_num = 1
        for chapter in self.note.chapters.all().order_by('order'):
            chapter_title = f"Chapter {chapter_num}: {chapter.title}"
            story.append(Paragraph(chapter_title, self.styles['chapter']))
            story.append(Spacer(1, 0.25*inch))
            
            topic_num = 1
            for topic in chapter.topics.all().order_by('order'):
                # Topic heading
                topic_title = f"{chapter_num}.{topic_num} {topic.name}"
                story.append(Paragraph(topic_title, self.styles['topic']))
                story.append(Spacer(1, 0.2*inch))
                
                # Explanation with FULL formatting preservation
                if topic.explanation:
                    explanation_html = topic.explanation.content
                    
                    # Parse HTML and convert to PDF elements
                    parser = RichTextHTMLParser()
                    parser.feed(explanation_html)
                    elements = parser.get_elements()
                    
                    # Add each element to story
                    for elem in elements:
                        text = elem['text']
                        style_name = elem['style']
                        alignment = elem['alignment']
                        
                        # Get base style
                        if style_name in self.styles:
                            base_style = self.styles[style_name]
                        else:
                            base_style = self.styles['CustomBody']
                        
                        # Apply alignment
                        if alignment == 'CENTER':
                            style = ParagraphStyle(
                                'temp',
                                parent=base_style,
                                alignment=TA_CENTER
                            )
                        elif alignment == 'RIGHT':
                            style = ParagraphStyle(
                                'temp',
                                parent=base_style,
                                alignment=TA_RIGHT
                            )
                        elif alignment == 'JUSTIFY':
                            style = ParagraphStyle(
                                'temp',
                                parent=base_style,
                                alignment=TA_JUSTIFY
                            )
                        else:
                            style = base_style
                        
                        # Handle list items
                        if elem['is_list_item']:
                            bullet_char = '•' if elem['list_type'] == 'ul' else f"{topic_num}."
                            story.append(Paragraph(f"{bullet_char} {text}", style))
                        else:
                            story.append(Paragraph(text, style))
                        
                        story.append(Spacer(1, 0.08*inch))
                    
                    # Add source citation
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
                            f'<i>Source: <super>[{citation_num}]</super></i>',
                            self.styles['CustomBody']
                        )
                        story.append(citation)
                    
                    story.append(Spacer(1, 0.25*inch))
                
                # Code snippet
                if topic.code_snippet:
                    story.append(Spacer(1, 0.15*inch))
                    story.append(Paragraph(
                        f"<b>💻 Code Example ({topic.code_snippet.language.upper()})</b>",
                        self.styles['CustomBody']
                    ))
                    story.append(Spacer(1, 0.1*inch))
                    
                    clean_code = re.sub(r'<[^>]+>', '', topic.code_snippet.code)
                    clean_code = unescape(clean_code)
                    
                    code_block = Preformatted(
                        clean_code,
                        self.styles['code'],
                        maxLineLength=90
                    )
                    story.append(code_block)
                    story.append(Spacer(1, 0.3*inch))
                
                topic_num += 1
            
            chapter_num += 1
            story.append(Spacer(1, 0.4*inch))
        
        return all_sources
    
    def _add_references(self, story, sources):
        """Add references section"""
        story.append(Paragraph("📚 References", self.styles['chapter']))
        story.append(Spacer(1, 0.3*inch))
        
        sorted_sources = sorted(sources.values(), key=lambda x: x['number'])
        
        for source in sorted_sources:
            ref_text = f"<b>[{source['number']}]</b> {source['title']}"
            story.append(Paragraph(ref_text, self.styles['CustomBody']))
            
            url_text = f"<font color='#2563eb'><link href='{source['url']}'>{source['url']}</link></font>"
            story.append(Paragraph(url_text, self.styles['CustomBody']))
            story.append(Spacer(1, 0.15*inch))


def export_note_to_pdf(note):
    """Export note with enhanced formatting preservation"""
    service = PDFExportService(note)
    return service.export()