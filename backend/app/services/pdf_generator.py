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
        
        # Normalize data for the template (backward compatibility)
        data = report_json
        if "page1" in data and "summary" not in data:
            # Map old schema to new schema for PDF rendering
            page1 = data.get("page1", {})
            data = {
                "summary": {
                    "business_model": page1.get("business_model_inferred", "Local Business"),
                    "opportunity_score": 0.85 if page1.get("opportunity_score") == "High" else 0.65,
                    "revenue_leak_estimate": {"min": 1000, "max": 2500, "currency": "$", "reasoning": page1.get("loss_reasoning")}
                },
                "scores": {
                    "seo": {"score": 70, "metrics": {"meta": 70, "speed": 60, "indexing": 80}},
                    "conversion": {"score": 55, "metrics": {"cta": 40, "clarity": 60, "friction": 50}},
                    "trust": {"score": 65, "metrics": {"reviews": 40, "proof": 70, "social": 80}}
                },
                "prioritized_actions": [{"title": i.get("title"), "impact": "High", "effort": "Moderate", "roi": "3x", "description": i.get("fix")} for i in page1.get("issues", [])],
                "competitor_analysis": [{"name": c.get("competitor"), "strengths": c.get("they_have"), "strategic_gap": c.get("impact")} for c in page1.get("competitor_gap", [])],
                "roadmap": {
                    "phase1": {"title": "Quick Wins", "duration": "Week 1-2", "tasks": [{"task": t.get("task"), "outcome": t.get("how")} for t in data.get("page2", {}).get("month1", [])]},
                    "phase2": {"title": "Optimization", "duration": "Month 1", "tasks": []},
                    "phase3": {"title": "Scaling", "duration": "Month 2-3", "tasks": []}
                },
                "outreach": {
                    "soft_approach": {"body": data.get("page3", {}).get("whatsapp_script")},
                    "value_first": {"subject": data.get("page3", {}).get("email_subject"), "body": data.get("page3", {}).get("email_body")},
                    "direct_roi": {"body": data.get("page3", {}).get("call_opener")}
                }
            }

        render_context = {
            **data,
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
