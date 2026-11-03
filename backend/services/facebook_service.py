import yt_dlp
from typing import Dict, Any

def inspect_facebook(url: str) -> Dict[str, Any]:
    """
    Extracts public Facebook video, reel, or photo.
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
                    "platform": "Facebook",
                    "error": "Could not access Facebook media. Video may be private, restricted, or deleted."
                }

            formats = info.get('formats', [])
            quality_options = []

            # HD and SD qualities
            hd_format = None
            sd_format = None

            for f in formats:
                fid = (f.get('format_id') or "").lower()
                fmt_url = f.get('url')
                if not fmt_url:
                    continue
                if "hd" in fid:
                    hd_format = f
                elif "sd" in fid:
                    sd_format = f

            if hd_format:
                quality_options.append({
                    "resolution": "1080p",
                    "label": "HD High Definition",
                    "url": hd_format.get('url'),
                    "filesize": hd_format.get('filesize') or hd_format.get('filesize_approx') or 0,
                    "has_audio": True
                })

            if sd_format:
                quality_options.append({
                    "resolution": "720p",
                    "label": "SD Standard Definition",
                    "url": sd_format.get('url'),
                    "filesize": sd_format.get('filesize') or sd_format.get('filesize_approx') or 0,
                    "has_audio": True
                })

            # Fallback quality if none tagged HD/SD
            if not quality_options and formats:
                best_fmt = formats[-1]
                quality_options.append({
                    "resolution": "Original",
                    "label": "Original Quality",
                    "url": best_fmt.get('url'),
                    "filesize": best_fmt.get('filesize') or 0,
                    "has_audio": True
                })

            primary_url = quality_options[0]["url"] if quality_options else info.get('url', url)

            return {
                "success": True,
                "platform": "Facebook",
                "type": "video",
                "title": info.get('title') or "Facebook Video",
                "duration": info.get('duration', 0),
                "thumbnail": info.get('thumbnail') or "",
                "primary_download_url": primary_url,
                "quality_options": quality_options
            }

    except Exception as e:
        err_msg = str(e)
        if "login" in err_msg.lower() or "private" in err_msg.lower():
            err_msg = "This Facebook post is private or requires authorization. Retrieval blocked by platform."
        return {
            "success": False,
            "platform": "Facebook",
            "error": err_msg
        }

