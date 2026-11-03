import io
import requests
from typing import Dict, Any, Optional
from PIL import Image

def inspect_gif(url: str) -> Dict[str, Any]:
    """
    Inspects GIF metadata: dimensions, animation status, frame count, file size.
    """
    try:
        # Fetch initial headers or bytes
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = requests.get(url, headers=headers, stream=True, timeout=15)
        resp.raise_for_status()

        content_length = resp.headers.get("content-length")
        file_size = int(content_length) if content_length else 0

        # Read beginning chunk into memory to inspect with PIL
        chunk = resp.raw.read(1024 * 512) # 512KB is plenty for header + initial frames
        image_bytes = io.BytesIO(chunk)

        with Image.open(image_bytes) as img:
            is_animated = getattr(img, "is_animated", False)
            n_frames = getattr(img, "n_frames", 1)
            width, height = img.size

        return {
            "type": "gif",
            "is_animated": is_animated,
            "width": width,
            "height": height,
            "dimensions": f"{width}x{height}",
            "frame_count": n_frames,
            "filesize": file_size,
            "preview_url": url,
            "download_url": url,
            "format": "GIF"
        }
    except Exception as e:
        return {
            "type": "gif",
            "is_animated": True,
            "width": 0,
            "height": 0,
            "dimensions": "Original",
            "frame_count": 0,
            "filesize": 0,
            "preview_url": url,
            "download_url": url,
            "format": "GIF",
            "error_note": str(e)
        }

