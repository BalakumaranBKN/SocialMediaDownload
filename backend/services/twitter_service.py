import yt_dlp
from typing import Dict, Any, List

def inspect_twitter(url: str) -> Dict[str, Any]:
    """
    Extracts X / Twitter video or images.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {
                    "success": False,
                    "platform": "Twitter",
                    "error": "Could not access Tweet. It may be from a protected account or deleted."
                }

            entries = info.get('entries')
            if entries and len(entries) > 1:
                # Multi-image or multi-media tweet
                images = []
                for idx, entry in enumerate(entries):
                    u = entry.get('url') or entry.get('thumbnail')
                    if u:
                        images.append({
                            "index": idx + 1,
                            "type": "image",
                            "url": u,
                            "thumbnail": u,
                            "title": f"Twitter Photo {idx + 1}"
                        })

                if images:
                    return {
                        "success": True,
                        "platform": "Twitter",
                        "type": "multi_image",
                        "title": info.get('title') or "X / Twitter Post",
                        "count": len(images),
                        "images": images,
                        "thumbnail": images[0]["thumbnail"]
                    }

            # Single video or photo
            vcodec = info.get('vcodec')
            is_video = vcodec and vcodec != 'none'

            if is_video:
                formats = info.get('formats', [])
                quality_options = []
                for f in formats:
                    if f.get('vcodec') != 'none' and f.get('url') and f.get('height'):
                        h = f.get('height')
                        label = f"{h}p"
                        quality_options.append({
                            "resolution": label,
                            "label": f"{label} Video",
                            "height": h,
                            "width": f.get('width', 0),
                            "url": f.get('url'),
                            "filesize": f.get('filesize') or f.get('filesize_approx') or 0,
                            "has_audio": True
                        })
                # Sort descending by height
                quality_options.sort(key=lambda x: x.get('height', 0), reverse=True)
                primary_url = quality_options[0]["url"] if quality_options else (info.get('url') or url)

                return {
                    "success": True,
                    "platform": "Twitter",
                    "type": "video",
                    "title": info.get('title') or "Twitter Video",
                    "duration": info.get('duration', 0),
                    "thumbnail": info.get('thumbnail') or "",
                    "primary_download_url": primary_url,
                    "quality_options": quality_options or [{
                        "resolution": "Original",
                        "label": "Original Quality",
                        "url": primary_url,
                        "has_audio": True
                    }]
                }
            else:
                image_url = info.get('url') or info.get('thumbnail') or url
                return {
                    "success": True,
                    "platform": "Twitter",
                    "type": "image",
                    "title": info.get('title') or "Twitter Photo",
                    "thumbnail": image_url,
                    "primary_download_url": image_url,
                    "images": [{
                        "index": 1,
                        "url": image_url,
                        "thumbnail": image_url,
                        "title": info.get('title') or "Twitter Photo"
                    }]
                }

    except Exception as e:
        err_msg = str(e)
        if "login" in err_msg.lower() or "protected" in err_msg.lower():
            err_msg = "This post is from a protected account or restricted. Platform access controls prevent retrieval."
        return {
            "success": False,
            "platform": "Twitter",
            "error": err_msg
        }

