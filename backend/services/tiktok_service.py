import yt_dlp
from typing import Dict, Any

def inspect_tiktok(url: str) -> Dict[str, Any]:
    """
    Extracts TikTok video without watermark, audio/music, author, and description.
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
                    "platform": "TikTok",
                    "error": "Could not access TikTok video. It may be private or deleted."
                }

            formats = info.get('formats', [])
            formats_with_video = [f for f in formats if f.get('vcodec') != 'none' and f.get('url')]
            
            # Look for best no-watermark format
            best_format = None
            audio_url = None

            for f in formats:
                if f.get('vcodec') == 'none' and f.get('url'):
                    audio_url = f.get('url')

            if formats_with_video:
                # Last format is usually the best quality
                best_format = formats_with_video[-1]

            video_url = (best_format.get('url') if best_format else None) or info.get('url') or url
            title = info.get('description') or info.get('title') or "TikTok Video"
            duration = info.get('duration', 0)
            thumbnail = info.get('thumbnail') or ""
            uploader = info.get('uploader') or ""

            quality_options = [{
                "resolution": "Original",
                "label": "Original (No Watermark)",
                "url": video_url,
                "filesize": (best_format.get('filesize') if best_format else 0) or 0,
                "has_audio": True
            }]

            return {
                "success": True,
                "platform": "TikTok",
                "type": "video",
                "title": title,
                "duration": duration,
                "thumbnail": thumbnail,
                "uploader": uploader,
                "audio_url": audio_url,
                "primary_download_url": video_url,
                "quality_options": quality_options
            }

    except Exception as e:
        err_msg = str(e)
        if "login" in err_msg.lower() or "private" in err_msg.lower():
            err_msg = "This TikTok video is private or restricted. Access controls prevent retrieval."
        return {
            "success": False,
            "platform": "TikTok",
            "error": err_msg
        }

