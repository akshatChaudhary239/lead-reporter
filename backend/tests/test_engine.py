import asyncio
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.scraper import scrape_website
from app.services.competitor import discover_competitors
from app.services.ai_engine import generate_report, ReportInput

async def test_scraper():
    print("\n--- Testing Scraper ---")
    urls = [
        "https://www.google.com", # Simple
        "https://www.openai.com", # JS heavy
    ]
    for url in urls:
        print(f"Scraping: {url}...")
        data = await scrape_website(url)
        print(f"Title: {data.title}")
        print(f"CTAs Found: {len(data.cta_buttons)}")
        print(f"Social Links: {len(data.social_links)}")
        if data.scrape_error:
            print(f"Error: {data.scrape_error}")

async def test_competitors():
    print("\n--- Testing Competitor Discovery ---")
    results = await discover_competitors("Gold's Gym", "Gym", "Bangalore")
    for res in results:
        print(f"Competitor: {res.name} ({res.url})")
        print(f"  Has CTA: {res.has_cta}")
        print(f"  Strengths: {res.apparent_strengths}")

async def test_ai_generation():
    print("\n--- Testing AI Generation ---")
    from app.services.scraper import ScrapedData
    from app.services.competitor import CompetitorSummary
    
    mock_scraped = ScrapedData(
        url="https://example-gym.com",
        title="Example Gym - Best Fitness in Town",
        meta_description="Join the best gym in town for personal training and yoga.",
        headings=["Welcome to Example Gym", "Our Services", "Join Now"],
        cta_buttons=["Join Now", "Book a Class"],
        cta_detected=True,
        above_fold_cta=True,
        social_links=["https://instagram.com/examplegym"],
        load_hint="fast"
    )
    
    mock_competitors = [
        CompetitorSummary(name="Competitor A", url="https://competitor-a.com", has_cta=True, apparent_strengths=["Low prices"]),
        CompetitorSummary(name="Competitor B", url="https://competitor-b.com", has_cta=False, apparent_strengths=["Modern equipment"])
    ]
    
    input_data = ReportInput(
        business_name="Example Gym",
        website_url="https://example-gym.com",
        business_type="Gym",
        location_hint="New York",
        website_summary=mock_scraped,
        competitors=mock_competitors
    )
    
    print("Generating report...")
    report = await generate_report(input_data)
    print("Report generated successfully!")
    print(f"Page 1 Model Inferred: {report.page1['business_model_inferred']}")
    print(f"Issues Found: {len(report.page1['issues'])}")
    print(f"WhatsApp Script: {report.page3['whatsapp_script'][:50]}...")

async def main():
    from app.utils.logger import setup_logger
    setup_logger()
    # await test_scraper()
    # await test_competitors()
    await test_ai_generation()

if __name__ == "__main__":
    asyncio.run(main())
