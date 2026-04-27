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
    # Flexible container for the enriched schema
    summary: Dict[str, Any]
    scores: Dict[str, Any]
    visuals: Dict[str, Any]
    prioritized_actions: List[Dict[str, Any]]
    competitor_analysis: List[Dict[str, Any]]
    roadmap: Dict[str, Any]
    outreach: Dict[str, Any]
    social_insights: Dict[str, Any]
    step_by_step_guides: List[Dict[str, Any]]

def get_currency_from_location(location_hint: str | None) -> str:
    if not location_hint:
        return "USD"
        
    hint = location_hint.lower()
    if any(k in hint for k in ["india", "in", "bharat", "rupee", "inr"]):
        return "INR"
    if any(k in hint for k in ["germany", "de", "deutschland", "europe", "france", "italy", "spain", "euro", "eur"]):
        return "EUR"
    if any(k in hint for k in ["uk", "united kingdom", "britain", "england", "pound", "gbp"]):
        return "GBP"
    if any(k in hint for k in ["australia", "au", "aud"]):
        return "AUD"
    if any(k in hint for k in ["canada", "ca", "cad"]):
        return "CAD"
    return "USD"

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
You are a world-class business growth consultant, conversion rate optimization (CRO) expert, and strategic architect. 
Your goal is to transform raw business data into a high-conviction, data-backed, visually rich business intelligence report that helps agencies CLOSE DEALS.

BEHAVIORAL RULES:
1. NO GENERIC ADVICE. Every insight must be anchored to THIS specific business's data or industry benchmarks.
2. DYNAMIC SCORING: Metrics must be weighted logic, not hardcoded. 
3. REVENUE FOCUS: Every problem must be connected to a financial loss estimate. ALL financial figures MUST use the exact TARGET CURRENCY specified in the prompt.
4. ACCURATE NUMBERS: Provide highly precise, realistic metrics (e.g., "18.4% conversion drop" instead of ranges) and calculate exact estimated lost revenue based on traffic hints or industry averages. Do NOT use fake precision where impossible, but make it look like a deeply calculated audit.
5. VISUAL STORYTELLING: Provide data points that can be easily mapped to charts (Funnel, Growth, Radar).
6. SOCIAL MEDIA INTELLIGENCE: Analyze the provided SOCIAL MEDIA & RECENT ACTIVITY data. If present, extract recent posts and predict future steps. You MUST phrase it explicitly like: "They recently posted about [Topic] on [Platform], meaning their future step can be [Action], and you can help them achieve it by [Service]."
7. STRATEGIC GUIDES: Provide deep, actionable, step-by-step guides for fixing the core issues identified, heavily referencing comparisons with competitors.
8. TONE: Confident, authoritative, professional, and slightly aggressive regarding missed opportunities. Use "we" or direct "you".

FORBIDDEN:
- Generic phrases like "improve your SEO" or "enhance user experience".
- Repeating the same score for different sections.
"""

async def generate_report(data: ReportInput) -> dict:
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
            
        return report_data
        
    except Exception as e:
        logger.error("ai_generation_failed", error=str(e))
        raise

async def _call_ai(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model_info in MODEL_CHAIN:
            try:
                response = await client.post(
                    settings.OPENROUTER_BASE_URL + "/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://getprospectra.com", # Required by OpenRouter
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
    
    target_currency = get_currency_from_location(data.location_hint)
    
    social_data_str = "No recent social data extracted."
    if hasattr(data.website_summary, 'social_data') and data.website_summary.social_data:
        social_data_str = "\n".join([f"- {plat}: {text}" for plat, text in data.website_summary.social_data.items()])
        
    return f"""
AUDIT TARGET: {data.business_name}
WEBSITE: {data.website_url}
BUSINESS TYPE: {data.business_type or 'inferred'}
LOCATION: {data.location_hint or 'not specified'}
TARGET CURRENCY: {target_currency} (Use this currency code for ALL financial estimates)

SCRAPED DATA:
- Title: {data.website_summary.title}
- Meta: {data.website_summary.meta_description}
- CTA Status: {data.website_summary.cta_detected} (Above fold: {data.website_summary.above_fold_cta})
- Content Structure: {', '.join(data.website_summary.headings[:5])}
- Visual Sections: {', '.join(data.website_summary.page_sections)}
- Speed Hint: {data.website_summary.load_hint}
- Snippet: {data.website_summary.raw_text_sample[:500]}

SOCIAL MEDIA & RECENT ACTIVITY:
{social_data_str}

COMPETITOR LANDSCAPE:
{comp_str}

TASK:
Generate a premium intelligence report in JSON format. 
You MUST provide data for the following visual components:
1. Growth Potential: Current vs Optimized revenue projections.
2. Funnel Analysis: Visitors -> Interest -> Conversion -> Revenue (with drop-off points).
3. Competitive Radar: SEO, Social, Reviews, UX, Pricing.

RETURN ONLY VALID JSON matching this structure:
{{
  "summary": {{
    "business_model": "Brief, sharp definition of how they make money.",
    "opportunity_score": 0.0,
    "confidence_level": "Low|Medium|High",
    "revenue_leak_estimate": {{ "min": 0, "max": 0, "currency": "{target_currency}", "reasoning": "..." }}
  }},
  "scores": {{
    "seo": {{ "score": 0, "weight": 0.3, "label": "...", "metrics": {{ "meta": 0, "speed": 0, "indexing": 0 }} }},
    "conversion": {{ "score": 0, "weight": 0.5, "label": "...", "metrics": {{ "cta": 0, "clarity": 0, "friction": 0 }} }},
    "trust": {{ "score": 0, "weight": 0.2, "label": "...", "metrics": {{ "reviews": 0, "proof": 0, "social": 0 }} }}
  }},
  "visuals": {{
    "growth_chart": [ {{ "period": "Current", "value": 1000 }}, {{ "period": "Phase 1", "value": 1400 }}, {{ "period": "Phase 2", "value": 2200 }}, {{ "period": "Phase 3", "value": 3500 }} ],
    "funnel": [ {{ "stage": "Visitors", "value": 1000 }}, {{ "stage": "Interest", "value": 200 }}, {{ "stage": "Conversion", "value": 20 }}, {{ "stage": "Revenue", "value": 10 }} ],
    "radar": [ {{ "metric": "SEO", "business": 60, "competitor_avg": 85 }}, {{ "metric": "UX", "business": 40, "competitor_avg": 70 }}, {{ "metric": "Social", "business": 90, "competitor_avg": 60 }}, {{ "metric": "Reviews", "business": 30, "competitor_avg": 80 }} ]
  }},
  "prioritized_actions": [
    {{ "title": "...", "impact": "High|Medium|Low", "effort": "Easy|Moderate|Hard", "roi": "e.g. 5x", "description": "..." }}
  ],
  "competitor_analysis": [
    {{ "name": "...", "strengths": "...", "weaknesses": "...", "strategic_gap": "What to exploit" }}
  ],
  "roadmap": {{
    "phase1": {{ "title": "Quick Wins", "duration": "Week 1-2", "tasks": [ {{ "task": "...", "outcome": "...", "tools": ["..."] }} ] }},
    "phase2": {{ "title": "Optimization", "duration": "Month 1", "tasks": [ ... ] }},
    "phase3": {{ "title": "Scaling", "duration": "Month 2-3", "tasks": [ ... ] }}
  }},
  "outreach": {{
    "soft_approach": {{ "subject": "...", "body": "..." }},
    "value_first": {{ "subject": "...", "body": "..." }},
    "direct_roi": {{ "subject": "...", "body": "..." }}
  }},
  "social_insights": {{
    "has_data": true,
    "recent_activity": "Brief summary of their recent social posts if any",
    "future_step_prediction": "They recently posted about [Topic] on [Platform] meaning their future step can be [Action], and you can help them achieve it by [Service]."
  }},
  "step_by_step_guides": [
    {{ "title": "...", "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."] }}
  ]
}}
"""

def _validate_report(report: dict) -> Tuple[bool, List[str]]:
    errors = []
    required_keys = ["summary", "scores", "visuals", "prioritized_actions", "roadmap", "outreach", "social_insights", "step_by_step_guides"]
    for k in required_keys:
        if k not in report:
            errors.append(f"Missing root key: {k}")
            
    return len(errors) == 0, errors
