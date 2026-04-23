import os
from io import BytesIO
from datetime import datetime, timezone
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from ..utils.logger import logger

# Setup Jinja2 environment
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

async def generate_pdf(report_json: dict, business_name: str) -> bytes:
    """
    Generate a professional PDF from the report JSON using xhtml2pdf.
    """
    logger.info("pdf_generation_started", business_name=business_name)
    
    try:
        template = env.get_template("report.html")
        
        # Add metadata for the template
        render_context = {
            **report_json,
            "business_name": business_name,
            "generated_at": datetime.now(timezone.utc).strftime("%d %b %Y"),
        }
        
        html_content = template.render(render_context)
        
        # Buffer to store the PDF
        result = BytesIO()
        
        # Convert HTML to PDF
        pisa_status = pisa.CreatePDF(html_content, dest=result)
        
        if pisa_status.err:
            raise Exception(f"xhtml2pdf error: {pisa_status.err}")
            
        pdf_bytes = result.getvalue()
        
        logger.info("pdf_generation_completed", business_name=business_name)
        return pdf_bytes
        
    except Exception as e:
        logger.error("pdf_generation_failed", business_name=business_name, error=str(e))
        raise
