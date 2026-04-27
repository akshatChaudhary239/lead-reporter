import asyncio
import re
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup
import httpx
from pydantic import BaseModel
from ..utils.logger import logger
from ..utils.validators import is_safe_url

class ScrapedData(BaseModel):
    url: str
    title: str | None = None
    meta_description: str | None = None
    headings: List[str] = []
    cta_buttons: List[str] = []
    cta_detected: bool = False
    above_fold_cta: bool = False
    page_sections: List[str] = []
    contact_info: Dict[str, Any] = {}
    social_links: List[str] = []
    trust_signals: List[str] = []
    load_hint: str = "medium"
    pages_found: List[str] = []
    raw_text_sample: str = ""
    scrape_error: str | None = None
    social_data: Dict[str, str] = {}

CTA_KEYWORDS = [
    "book", "schedule", "get started", "free", "call", "contact",
    "buy", "order", "download", "sign up", "register", "demo",
    "quote", "consult", "enquire", "enquiry", "whatsapp", "join"
]

SOCIAL_PATTERNS = {
    "instagram": r"instagram\.com/[a-zA-Z0-9_.]+",
    "facebook": r"facebook\.com/[a-zA-Z0-9_.]+",
    "linkedin": r"linkedin\.com/(?:in|company)/[a-zA-Z0-9-]+",
    "youtube": r"youtube\.com/@?[a-zA-Z0-9_-]+",
    "twitter": r"(?:twitter|x)\.com/[a-zA-Z0-9_]+",
}

async def scrape_website(url: str) -> ScrapedData:
    if not is_safe_url(url):
        return ScrapedData(url=url, scrape_error="Unsafe URL detected (SSRF prevention)")

    logger.info("scraping_started", url=url)
    data = ScrapedData(url=url)
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url)
            
            if response.status_code != 200:
                logger.warning("httpx_scrape_failed", url=url, status=response.status_code)
                data = await _scrape_with_playwright(url, data)
                
            elif len(response.text) < 500:
                logger.info("httpx_response_too_short", url=url)
                data = await _scrape_with_playwright(url, data)
                
            else:
                data = _parse_html(response.text, data)
            
    except Exception as e:
        logger.error("httpx_scrape_error", url=url, error=str(e))
        data = await _scrape_with_playwright(url, data)

    # Scrape found social profiles to get recent post text
    if data.social_links:
        data.social_data = await _scrape_social_profiles(data.social_links)
        
    return data

async def _scrape_with_playwright(url: str, data: ScrapedData) -> ScrapedData:
    logger.info("playwright_scrape_started", url=url)
    try:
        from playwright.async_api import async_playwright
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Set a reasonable timeout
                await page.goto(url, timeout=30000, wait_until="networkidle")
                content = await page.content()
                
                # Check for above fold CTA visibility (basic check)
                data.above_fold_cta = await _check_above_fold_cta(page)
                
                return _parse_html(content, data)
            except Exception as e:
                data.scrape_error = f"Playwright error: {str(e)}"
                return data
            finally:
                await browser.close()
                
    except Exception as e:
        data.scrape_error = f"Failed to initialize Playwright: {str(e)}"
        return data

async def _check_above_fold_cta(page) -> bool:
    # Simple check: find all buttons/anchors in top 800px
    try:
        ctas = await page.evaluate(f"""() => {{
            const keywords = {CTA_KEYWORDS};
            const elements = Array.from(document.querySelectorAll('a, button'));
            return elements.some(el => {{
                const rect = el.getBoundingClientRect();
                const text = el.innerText.toLowerCase();
                const isCta = keywords.some(k => text.includes(k));
                return isCta && rect.top < 800 && rect.height > 0 && rect.width > 0;
            }});
        }}""")
        return bool(ctas)
    except:
        return False

def _parse_html(html: str, data: ScrapedData) -> ScrapedData:
    soup = BeautifulSoup(html, "html.parser")
    
    # Title & Meta
    data.title = soup.title.string if soup.title else None
    meta_desc = soup.find("meta", attrs={"name": "description"})
    data.meta_description = meta_desc["content"] if meta_desc else None
    
    # Headings
    data.headings = [h.get_text().strip() for h in soup.find_all(["h1", "h2"])][:20]
    
    # CTAs
    ctas, detected = _detect_ctas(soup)
    data.cta_buttons = ctas
    data.cta_detected = detected
    
    # Social Links
    data.social_links = _discover_social_links(html, soup)
    
    # Sections & Internal Links
    data.page_sections = [s.get_text().strip() for s in soup.find_all("section") if s.get_text().strip()][:10]
    internal_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/") or data.url in href:
            text = a.get_text().strip().lower()
            if text and text not in internal_links:
                internal_links.append(text)
    data.pages_found = internal_links[:15]
    
    # Trust Signals
    trust_keywords = ["testimonial", "award", "certificate", "partner", "client", "trusted by"]
    data.trust_signals = [t.get_text().strip() for t in soup.find_all(text=re.compile("|".join(trust_keywords), re.I))][:5]
    
    # Raw Text
    data.raw_text_sample = soup.get_text()[:2000]
    
    return data

def _detect_ctas(soup: BeautifulSoup) -> Tuple[List[str], bool]:
    ctas = []
    elements = soup.find_all(["a", "button"])
    for el in elements:
        text = el.get_text().strip()
        if any(kw in text.lower() for kw in CTA_KEYWORDS):
            if text not in ctas:
                ctas.append(text)
    
    return ctas[:10], len(ctas) > 0

def _discover_social_links(html: str, soup: BeautifulSoup) -> List[str]:
    links = []
    # Search in hrefs
    for a in soup.find_all("a", href=True):
        href = a["href"]
        for platform, pattern in SOCIAL_PATTERNS.items():
            if re.search(pattern, href, re.I):
                if href not in links:
                    links.append(href)
    
    # Search in raw HTML (for icons/scripts)
    for platform, pattern in SOCIAL_PATTERNS.items():
        matches = re.findall(pattern, html, re.I)
        for m in matches:
            full_url = f"https://{m}" if not m.startswith("http") else m
            if full_url not in links:
                links.append(full_url)
                
    return list(set(links))[:10]

async def _scrape_social_profiles(links: List[str]) -> Dict[str, str]:
    social_data = {}
    # We only take up to 2 links to avoid long delays, prioritizing insta/fb/twitter
    target_links = links[:2]
    if not target_links:
        return social_data
        
    logger.info("social_scraping_started", links=target_links)
    
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            
            async def fetch_social_text(link: str) -> Tuple[str, str]:
                page = await context.new_page()
                try:
                    await page.goto(link, timeout=12000, wait_until="domcontentloaded")
                    # Try to scroll a bit to trigger lazy loads
                    await page.evaluate("window.scrollBy(0, 500)")
                    await asyncio.sleep(1) # tiny wait for content
                    title = await page.title()
                    # Extract visible text but cap it to avoid massive strings
                    text = await page.evaluate("() => document.body.innerText.substring(0, 2000)")
                    return link, f"Title: {title}\nContent Snippet: {text}"
                except Exception as e:
                    logger.warning("social_scrape_failed", link=link, error=str(e))
                    return link, "Access restricted or timeout."
                finally:
                    await page.close()
            
            tasks = [fetch_social_text(link) for link in target_links]
            results = await asyncio.gather(*tasks)
            
            for link, text in results:
                platform = "unknown"
                for p_name, pattern in SOCIAL_PATTERNS.items():
                    if re.search(pattern, link, re.I):
                        platform = p_name
                        break
                social_data[platform] = text
                
            await browser.close()
    except Exception as e:
        logger.error("social_scraping_error", error=str(e))
        
    return social_data
