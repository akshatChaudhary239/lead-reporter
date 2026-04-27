import sys
import os
import asyncio
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
load_dotenv()

from app.services.scraper import scrape_website
from app.services.competitor import discover_competitors
from app.services.ai_engine import generate_report, ReportInput

async def test():
    print("Scraping website...")
    url = "https://example.com"
    data = await scrape_website(url)
    
    # Mocking some social links to trigger the new logic
    data.social_links = ["https://twitter.com/example"]
    from app.services.scraper import _scrape_social_profiles
    print("Scraping mock social profile...")
    data.social_data = await _scrape_social_profiles(data.social_links)
    print("Social Data Extracted:", data.social_data)
    
    print("Discovering competitors...")
    comps = await discover_competitors("Example Business", "Software", "Germany")
    
    ai_in = ReportInput(
        business_name="Example Business",
        website_url=url,
        business_type="Software",
        location_hint="Germany",
        website_summary=data,
        competitors=comps
    )
    
    print("Generating AI report with currency test for Germany...")
    res = await generate_report(ai_in)
    
    print("\n--- REPORT GENERATED ---")
    print("Currency used:", res['summary']['revenue_leak_estimate'].get('currency'))
    print("Has social insights:", 'social_insights' in res)
    if 'social_insights' in res:
        print("  -> prediction:", res['social_insights'].get('future_step_prediction'))
    print("Has step by step guides:", 'step_by_step_guides' in res)
    if 'step_by_step_guides' in res:
        print(f"  -> {len(res['step_by_step_guides'])} guides generated")
    
if __name__ == "__main__":
    asyncio.run(test())
