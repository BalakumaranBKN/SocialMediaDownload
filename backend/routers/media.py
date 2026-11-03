import os
import tempfile
import uuid
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.utils.validation import validate_and_sanitize_url
from backend.services.media_detector import detect_platform, Platform
from backend.services.instagram_service import inspect_instagram
from backend.services.facebook_service import inspect_facebook
from backend.services.pinterest_service import inspect_pinterest
from backend.services.twitter_service import inspect_twitter
from backend.services.tiktok_service import inspect_tiktok
from backend.services.video_service import extract_video_info, mute_video_stream
from backend.services.gif_service import inspect_gif

router = APIRouter()

class InspectRequest(BaseModel):
    url: str = Field(..., description="Target media URL to inspect")

class MuteRequest(BaseModel):
    url: str = Field(..., description="Target video URL to mute")

def remove_temp_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

@router.post("/inspect")
async def inspect_media(req: InspectRequest):
    sanitized_url = validate_and_sanitize_url(req.url)
    platform = detect_platform(sanitized_url)

    result: Dict[str, Any] = {}

    if platform == Platform.INSTAGRAM:
        result = inspect_instagram(sanitized_url)
    elif platform == Platform.FACEBOOK:
        result = inspect_facebook(sanitized_url)
    elif platform == Platform.PINTEREST:
        result = inspect_pinterest(sanitized_url)
    elif platform == Platform.TWITTER:
        result = inspect_twitter(sanitized_url)
    elif platform == Platform.TIKTOK:
        result = inspect_tiktok(sanitized_url)
    elif platform == Platform.DIRECT_GIF:
        gif_data = inspect_gif(sanitized_url)
        result = {
            "success": True,
            "platform": Platform.DIRECT_GIF,
            "type": "gif",
            "title": "Direct GIF",
            **gif_data
        }
    elif platform == Platform.DIRECT_IMAGE:
        result = {
            "success": True,
            "platform": Platform.DIRECT_IMAGE,
            "type": "image",
            "title": "Direct Image",
            "thumbnail": sanitized_url,
            "primary_download_url": sanitized_url,
            "images": [{
                "index": 1,
                "url": sanitized_url,
                "thumbnail": sanitized_url,
                "title": "Direct Image"
            }]
        }
    else:
        # Generic Video / Supported Public Media fallback
        video_info = extract_video_info(sanitized_url)
        result = {
            "success": True,
            "platform": platform,
            **video_info
        }

    # Ensure platform is tagged in response
    result["detected_platform"] = platform
    result["original_url"] = sanitized_url
    return result

@router.post("/mute")
async def mute_media(req: MuteRequest, background_tasks: BackgroundTasks):
    sanitized_url = validate_and_sanitize_url(req.url)
    
    # Create unique temp output file
    temp_dir = tempfile.gettempdir()
    out_filename = f"muted_{uuid.uuid4().hex[:10]}.mp4"
    out_path = os.path.join(temp_dir, out_filename)

    success = mute_video_stream(sanitized_url, out_path)
    if not success or not os.path.exists(out_path):
        raise HTTPException(status_code=500, detail="Failed to mute video with FFmpeg. Video format or stream may be inaccessible.")

    # Schedule deletion immediately after response finishes streaming
    background_tasks.add_task(remove_temp_file, out_path)

    return FileResponse(
        out_path,
        media_type="video/mp4",
        filename=out_filename,
        headers={"Content-Disposition": f'attachment; filename="{out_filename}"'}
    )

