import json
import asyncio
from typing import Dict, Any, List, Tuple
import httpx
from pydantic import BaseModel
from ..config import settings
from ..utils.logger import logger
from .scraper import ScrapedData
from .competitor import CompetitorSummary

class ReportInput(BaseModel):
    business_name: str
    website_url: str
    business_type: str | None = None
    location_hint: str | None = None
    website_summary: ScrapedData
    competitors: List[CompetitorSummary]

class ReportJSON(BaseModel):
    page1: Dict[str, Any]
    page2: Dict[str, Any]
    page3: Dict[str, Any]

MODEL_CHAIN = [
    {
        "id": "primary",
        "model": "mistralai/mixtral-8x7b-instruct",
        "role": "Generate full report"
    },
    {
        "id": "fallback",
        "model": "meta-llama/llama-3-8b-instruct",
        "role": "Complete generation if primary fails"
    }
]

SYSTEM_PROMPT = """
You are a senior business growth consultant and conversion rate optimization specialist with 15+ years of experience auditing businesses.
Your ONLY job is to identify revenue leaks and provide sharp, specific, actionable fixes.

BEHAVIORAL RULES:
- Every insight must be specific to THIS business, not generic advice.
- Quantify everything: use percentages, time estimates, revenue figures.
- Be slightly critical but constructive — not polite, not harsh.
- If data is limited, make intelligent inferences and state them clearly.
- Output must feel like a $2,000 professional audit, not a chatbot response.

FORBIDDEN PHRASES:
- "improve your SEO", "enhance user experience", "build trust with customers", "consider adding", "you might want to".

REQUIRED TONE:
- Confident and direct, revenue-obsessed, zero corporate fluff.
"""

async def generate_report(data: ReportInput) -> ReportJSON:
    prompt = _build_report_prompt(data)
    
    logger.info("ai_generation_started", business_name=data.business_name)
    
    try:
        raw_output = await _call_ai(prompt)
        report_data = json.loads(raw_output)
        
        # Validation
        is_valid, errors = _validate_report(report_data)
        if not is_valid:
            logger.warning("report_validation_failed", errors=errors)
            # One retry with specific error feedback
            retry_prompt = f"{prompt}\n\nIMPORTANT: Your previous output had these errors: {', '.join(errors)}. Please fix them and return the full corrected JSON."
            raw_output = await _call_ai(retry_prompt)
            report_data = json.loads(raw_output)
            
        return ReportJSON(**report_data)
        
    except Exception as e:
        logger.error("ai_generation_failed", error=str(e))
        raise # Or return a fallback/graceful partial report

async def _call_ai(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model_info in MODEL_CHAIN:
            try:
                response = await client.post(
                    settings.OPENROUTER_BASE_URL + "/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://leadreporter.com", # Required by OpenRouter
                    },
                    json={
                        "model": model_info["model"],
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                
                logger.warning("ai_model_failed", model=model_info["model"], status=response.status_code)
            except Exception as e:
                logger.warning("ai_model_error", model=model_info["model"], error=str(e))
                
    raise Exception("All AI models in chain failed")

def _build_report_prompt(data: ReportInput) -> str:
    comp_str = "\n".join([f"- {c.name} ({c.url}): CTA={c.has_cta}, Strengths={c.apparent_strengths}" for c in data.competitors])
    
    return f"""
You are auditing: {data.business_name}
Website: {data.website_url}
Business Type: {data.business_type or 'inferred'}
Location: {data.location_hint or 'not specified'}

SCRAPED DATA:
- Title: {data.website_summary.title}
- Description: {data.website_summary.meta_description}
- CTA Detected: {data.website_summary.cta_detected}
- Above Fold CTA: {data.website_summary.above_fold_cta}
- Key Headings: {', '.join(data.website_summary.headings)}
- Sections: {', '.join(data.website_summary.page_sections)}
- Social: {', '.join(data.website_summary.social_links)}
- Speed: {data.website_summary.load_hint}
- Raw Text Snippet: {data.website_summary.raw_text_sample}

COMPETITORS:
{comp_str}

INSTRUCTIONS:
1. Infer the business model.
2. Identify TOP 3 revenue leaks.
3. Compare to competitors.
4. Build a 3-month execution plan.
5. Write closing scripts (WhatsApp, Email, Call).

RETURN ONLY VALID JSON matching this structure:
{{
  "page1": {{
    "business_model_inferred": "...",
    "estimated_monthly_loss": "...",
    "loss_reasoning": "...",
    "issues": [
      {{ "title": "...", "impact": "...", "fix": "...", "revenue_implication": "..." }}
    ],
    "competitor_gap": [
      {{ "competitor": "...", "they_have": "...", "you_dont": "...", "impact": "..." }}
    ],
    "opportunity_score": "Low|Medium|High",
    "score_reasoning": "...",
    "chart_data": {{
      "current_conversion_estimate": 0.0,
      "industry_average": 0.0,
      "potential_after_fix": 0.0,
      "monthly_loss_low": 0,
      "monthly_loss_high": 0
    }}
  }},
  "page2": {{
    "month1": [ {{ "week": 1, "task": "...", "how": "...", "expected_outcome": "..." }} ],
    "month2": [...],
    "month3": [...]
  }},
  "page3": {{
    "whatsapp_script": "...",
    "email_subject": "...",
    "email_body": "...",
    "call_opener": "..."
  }}
}}
"""

def _validate_report(report: dict) -> Tuple[bool, List[str]]:
    errors = []
    required_pages = ["page1", "page2", "page3"]
    for p in required_pages:
        if p not in report:
            errors.append(f"Missing {p}")
            
    if "page1" in report:
        if len(report["page1"].get("issues", [])) != 3:
            errors.append("page1.issues must have exactly 3 items")
            
    return len(errors) == 0, errors
