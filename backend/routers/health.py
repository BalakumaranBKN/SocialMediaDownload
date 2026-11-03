import time
from fastapi import APIRouter
from backend.services.video_service import get_ffmpeg_path

router = APIRouter()

@router.get("/health")
def get_health():
    ffmpeg_available = get_ffmpeg_path() is not None
    return {
        "status": "healthy",
        "app": "ALL SOCIAL DOWNLOADER Backend",
        "version": "1.0.0",
        "ffmpeg_available": ffmpeg_available,
        "timestamp": int(time.time()),
        "supported_platforms": [
            "Instagram",
            "Facebook",
            "Pinterest",
            "Twitter / X",
            "TikTok",
            "Direct Image URLs",
            "Direct Video URLs",
            "Direct GIF URLs",
            "Other supported public URLs"
        ]
    }

