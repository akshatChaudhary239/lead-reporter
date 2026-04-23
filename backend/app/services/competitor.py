import asyncio
from typing import List, Optional
from bs4 import BeautifulSoup
import httpx
from pydantic import BaseModel
from ..utils.logger import logger

class CompetitorSummary(BaseModel):
    name: str
    url: str
    has_cta: bool = False
    social_present: bool = False
    trust_signals: List[str] = []
    apparent_strengths: List[str] = []

async def discover_competitors(
    business_name: str,
    business_type: Optional[str] = None,
    location_hint: Optional[str] = None
) -> List[CompetitorSummary]:
    """
    Fast competitor discovery using DuckDuckGo HTML search.
    No API key required.
    """
    query = f"{business_type or business_name} in {location_hint or ''}".strip()
    logger.info("competitor_discovery_started", query=query)
    
    search_url = f"https://html.duckduckgo.com/html/?q={query}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Add a user-agent to avoid being blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            response = await client.get(search_url, headers=headers)
            
            if response.status_code != 200:
                logger.warning("ddg_search_failed", status=response.status_code)
                return []
                
            return await _parse_ddg_results(response.text)
            
    except Exception as e:
        logger.error("competitor_discovery_error", error=str(e))
        return []

async def _parse_ddg_results(html: str) -> List[CompetitorSummary]:
    soup = BeautifulSoup(html, "html.parser")
    results = []
    
    # DuckDuckGo HTML results are in 'div.result'
    result_divs = soup.select(".result")[:5]
    
    for div in result_divs:
        title_el = div.select_one(".result__title")
        link_el = div.select_one(".result__url")
        
        if title_el and link_el:
            name = title_el.get_text().strip()
            url = link_el.get_text().strip()
            
            # Basic filtering: skip directories and social media
            excluded = ["justdial", "sulekha", "facebook", "instagram", "yelp", "linkedin", "indiamart"]
            if any(ex in url.lower() for ex in excluded):
                continue
                
            if not url.startswith("http"):
                url = f"https://{url}"
                
            results.append(CompetitorSummary(name=name, url=url))
            
    # Lightly scrape top 2 competitors if found
    if results:
        tasks = [_light_scrape(comp) for comp in results[:2]]
        updated_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, updated in enumerate(updated_results):
            if isinstance(updated, CompetitorSummary):
                results[i] = updated
                
    return results

async def _light_scrape(competitor: CompetitorSummary) -> CompetitorSummary:
    """Light scrape to verify basic features."""
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (LeadReporterBot/1.0)"}
            response = await client.get(competitor.url, headers=headers)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                text = response.text.lower()
                
                # Check for CTAs
                cta_keywords = ["book", "contact", "schedule", "call", "order", "buy"]
                competitor.has_cta = any(kw in text for kw in cta_keywords)
                
                # Check for social links
                social_keywords = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com"]
                competitor.social_present = any(skw in text for skw in social_keywords)
                
                # Apparent strengths from headings
                competitor.apparent_strengths = [h.get_text().strip() for h in soup.find_all(["h1", "h2"])][:3]
                
    except Exception:
        pass # Silently fail for competitors
        
    return competitor
