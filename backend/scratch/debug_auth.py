import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        try:
            print("Registering...")
            resp = await client.post("http://localhost:8000/auth/register", json={
                "email": "test@example.com",
                "password": "testpassword123",
                "full_name": "Test User"
            })
            print(f"Status: {resp.status_code}")
            print(f"Body: {resp.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
