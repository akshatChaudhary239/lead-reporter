from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, reports, billing, discover, admin
from .utils.logger import setup_logger

app = FastAPI(title="GetProspectra API", version="1.0.0")

# Setup structured logging
setup_logger()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(discover.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
