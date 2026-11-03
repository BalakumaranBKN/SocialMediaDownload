import re
import requests
from bs4 import BeautifulSoup
from typing import Dict, Any

def inspect_pinterest(url: str) -> Dict[str, Any]:
    """
    Extracts high resolution Pinterest images or videos.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }

    try:
        # Follow redirects for pin.it
        resp = requests.get(url, headers=headers, allow_redirects=True, timeout=12)
        resp.raise_for_status()
        final_url = resp.url
        html = resp.text

        # 1. Look for direct video tag / formats in JSON-LD or meta tags
        og_video = re.search(r'<meta property="og:video" content="([^"]+)"', html)
        if og_video:
            video_url = og_video.group(1).replace("&amp;", "&")
            og_image = re.search(r'<meta property="og:image" content="([^"]+)"', html)
            thumb = og_image.group(1).replace("&amp;", "&") if og_image else ""
            return {
                "success": True,
                "platform": "Pinterest",
                "type": "video",
                "title": "Pinterest Video Pin",
                "thumbnail": thumb,
                "primary_download_url": video_url,
                "quality_options": [{
                    "resolution": "Original",
                    "label": "Original Video",
                    "url": video_url,
                    "has_audio": True
                }]
            }

        # 2. Look for highest resolution image
        # Pinterest pin images usually have an 'originals' version:
        # e.g., https://i.pinimg.com/736x/... -> https://i.pinimg.com/originals/...
        img_matches = re.findall(r'https://i\.pinimg\.com/[^"\'\s<>]+', html)
        if img_matches:
            best_img = img_matches[0]
            # Convert to originals if possible
            originals_candidate = re.sub(r'/[0-9x]+/', '/originals/', best_img)
            
            # Verify if originals candidate is valid
            try:
                head_resp = requests.head(originals_candidate, headers=headers, timeout=5)
                if head_resp.status_code == 200:
                    best_img = originals_candidate
            except Exception:
                pass

            og_title = re.search(r'<meta property="og:title" content="([^"]+)"', html)
            title = og_title.group(1) if og_title else "Pinterest Pin"

            return {
                "success": True,
                "platform": "Pinterest",
                "type": "image",
                "title": title,
                "thumbnail": best_img,
                "primary_download_url": best_img,
                "images": [{
                    "index": 1,
                    "url": best_img,
                    "thumbnail": best_img,
                    "title": title
                }]
            }

        # Fallback to og:image
        og_image = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if og_image:
            image_url = og_image.group(1).replace("&amp;", "&")
            return {
                "success": True,
                "platform": "Pinterest",
                "type": "image",
                "title": "Pinterest Pin",
                "thumbnail": image_url,
                "primary_download_url": image_url,
                "images": [{
                    "index": 1,
                    "url": image_url,
                    "thumbnail": image_url,
                    "title": "Pinterest Pin"
                }]
            }

        return {
            "success": False,
            "platform": "Pinterest",
            "error": "No media found in the provided Pinterest URL."
        }

    except Exception as e:
        return {
            "success": False,
            "platform": "Pinterest",
            "error": f"Pinterest extraction error: {str(e)}"
        }

