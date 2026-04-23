import asyncio
import httpx
import sys
import os
import time

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

BASE_URL = "http://localhost:8000/api/v1"

async def test_full_flow():
    print("--- Testing Full API Flow ---")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Register
        print("Registering user...")
        user_email = f"test_{int(time.time())}@example.com"
        reg_res = await client.post(f"{BASE_URL}/auth/register", json={
            "email": user_email,
            "password": "Password123!",
            "full_name": "Test User"
        })
        print(f"Register Status: {reg_res.status_code}")
        
        # 2. Login
        print("Logging in...")
        login_res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": user_email,
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Create Report
        print("Creating report for 'Example Dental'...")
        report_res = await client.post(f"{BASE_URL}/reports/", headers=headers, json={
            "business_name": "Example Dental",
            "website_url": "https://example.com", # Simple one for testing
            "business_type": "Dentist",
            "location_hint": "Austin, TX"
        })
        report_id = report_res.json()["report_id"]
        print(f"Report Created: {report_id}")
        
        # 4. Poll Status
        print("Polling status...")
        for _ in range(10): # Max 1 minute
            status_res = await client.get(f"{BASE_URL}/reports/{report_id}", headers=headers)
            status_data = status_res.json()
            print(f"Current Status: {status_data['status']}")
            
            if status_data["status"] == "completed":
                print("Report COMPLETED!")
                # 5. Download PDF
                print("Downloading PDF...")
                pdf_res = await client.get(f"{BASE_URL}/reports/{report_id}/pdf", headers=headers)
                print(f"PDF Status: {pdf_res.status_code}")
                if pdf_res.status_code == 200:
                    with open(f"tests/test_{report_id}.pdf", "wb") as f:
                        f.write(pdf_res.content)
                    print(f"PDF saved to tests/test_{report_id}.pdf")
                break
            elif status_data["status"] == "failed":
                print(f"Report FAILED: {status_data['error_message']}")
                break
                
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(test_full_flow())
