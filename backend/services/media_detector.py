import re
from urllib.parse import urlparse

class Platform:
    INSTAGRAM = "Instagram"
    FACEBOOK = "Facebook"
    PINTEREST = "Pinterest"
    TWITTER = "Twitter"
    TIKTOK = "TikTok"
    DIRECT_IMAGE = "Direct Image"
    DIRECT_VIDEO = "Direct Video"
    DIRECT_GIF = "Direct GIF"
    OTHER = "Other"

def detect_platform(url: str) -> str:
    url_lower = url.lower()
    parsed = urlparse(url_lower)
    domain = parsed.hostname or ""

    if any(d in domain for d in ["instagram.com", "instagr.am"]):
        return Platform.INSTAGRAM
    elif any(d in domain for d in ["facebook.com", "fb.com", "fb.watch"]):
        return Platform.FACEBOOK
    elif any(d in domain for d in ["pinterest.com", "pin.it", "pinimg.com"]):
        return Platform.PINTEREST
    elif any(d in domain for d in ["twitter.com", "x.com", "t.co"]):
        return Platform.TWITTER
    elif any(d in domain for d in ["tiktok.com", "douyin.com"]):
        return Platform.TIKTOK
    
    # Check direct extensions or image/video domains
    path = parsed.path.lower()
    query = parsed.query.lower()

    if any(img_domain in domain for img_domain in ["unsplash.com", "imgur.com", "img.youtube.com", "media.giphy.com", "pinimg.com"]):
        if path.endswith(".gif") or "format=gif" in query or "giphy.gif" in path:
            return Platform.DIRECT_GIF
        return Platform.DIRECT_IMAGE

    if path.endswith(".gif") or "format=gif" in query:
        return Platform.DIRECT_GIF
    elif any(path.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".svg"]) or any(f"format={ext[1:]}" in query for ext in [".jpg", ".png", ".webp"]):
        return Platform.DIRECT_IMAGE
    elif any(path.endswith(ext) for ext in [".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]):
        return Platform.DIRECT_VIDEO

    return Platform.OTHER
