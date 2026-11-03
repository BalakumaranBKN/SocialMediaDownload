import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import media, downloads, health

app = FastAPI(
    title="ALL SOCIAL DOWNLOADER API",
    description="Backend for supported online social media retrieval, inspection, and streaming.",
    version="1.0.0"
)

# Enable CORS for mobile and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(downloads.router, prefix="/api/media", tags=["Downloads"])

@app.get("/")
def root():
    return {
        "message": "ALL SOCIAL DOWNLOADER API is running.",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

