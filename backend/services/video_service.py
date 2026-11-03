import os
import shutil
import subprocess
import tempfile
from typing import Dict, Any, List, Optional
import yt_dlp

def get_ffmpeg_path() -> Optional[str]:
    # Check PATH or common winget location
    path = shutil.which("ffmpeg")
    if path:
        return path
    
    # Check typical local app data or Program Files
    candidates = [
        r"C:\Users\balak\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def extract_video_info(url: str) -> Dict[str, Any]:
    """
    Extract video metadata, thumbnail, duration, and available quality options using yt-dlp.
    Only returns resolutions that are actually available.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'no_color': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Could not extract video information.")

            # If playlist or multi-entry, take first entry
            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            title = info.get('title') or "Social_Video"
            duration = info.get('duration') or 0
            thumbnail = info.get('thumbnail') or ""
            uploader = info.get('uploader') or ""
            formats = info.get('formats', [])

            # Parse available video resolutions
            resolution_map: Dict[str, Dict[str, Any]] = {}
            audio_url = None

            # Look for best audio
            for f in formats:
                if f.get('vcodec') == 'none' and f.get('acodec') != 'none' and f.get('url'):
                    if not audio_url or (f.get('tbr') or 0) > (resolution_map.get('audio', {}).get('tbr') or 0):
                        audio_url = f.get('url')

            # Look for progressive formats (video + audio) and video formats
            for f in formats:
                vcodec = f.get('vcodec')
                if vcodec == 'none':
                    continue
                
                height = f.get('height')
                if not height:
                    continue

                fmt_url = f.get('url')
                if not fmt_url:
                    continue

                filesize = f.get('filesize') or f.get('filesize_approx') or 0
                has_audio = f.get('acodec') != 'none'

                # Categorize by target heights
                target_label = None
                if height >= 1080:
                    target_label = "1080p"
                elif height >= 720:
                    target_label = "720p"
                elif height >= 480:
                    target_label = "480p"
                elif height >= 360:
                    target_label = "360p"

                if target_label:
                    existing = resolution_map.get(target_label)
                    # Prefer progressive (has audio) or higher bitrate
                    if not existing or (has_audio and not existing.get('has_audio')) or (filesize > existing.get('filesize', 0)):
                        resolution_map[target_label] = {
                            "resolution": target_label,
                            "height": height,
                            "width": f.get('width', 0),
                            "url": fmt_url,
                            "format_id": f.get('format_id'),
                            "ext": f.get('ext', 'mp4'),
                            "filesize": filesize,
                            "has_audio": has_audio,
                            "tbr": f.get('tbr') or 0
                        }

            # Original / Best format
            best_url = info.get('url')
            best_height = info.get('height') or 0
            best_width = info.get('width') or 0
            best_filesize = info.get('filesize') or info.get('filesize_approx') or 0

            # Sort available qualities
            quality_options = []
            
            # Add Original option first
            original_url = best_url or (formats[-1].get('url') if formats else "")
            quality_options.append({
                "resolution": "Original",
                "label": f"Original ({best_width}x{best_height})" if best_width and best_height else "Original Quality",
                "height": best_height,
                "width": best_width,
                "url": original_url,
                "filesize": best_filesize,
                "has_audio": True
            })

            for label in ["1080p", "720p", "480p", "360p"]:
                if label in resolution_map:
                    res_item = resolution_map[label]
                    res_item["label"] = f"{label} HD" if label in ("1080p", "720p") else f"{label} SD"
                    quality_options.append(res_item)

            return {
                "type": "video",
                "title": title,
                "duration": duration,
                "thumbnail": thumbnail,
                "uploader": uploader,
                "audio_url": audio_url,
                "quality_options": quality_options,
                "primary_download_url": original_url
            }

    except Exception as e:
        # Check if direct video URL
        return {
            "type": "video",
            "title": "Direct Video",
            "duration": 0,
            "thumbnail": "",
            "uploader": "Direct",
            "audio_url": None,
            "quality_options": [
                {
                    "resolution": "Original",
                    "label": "Original Quality",
                    "height": 0,
                    "width": 0,
                    "url": url,
                    "filesize": 0,
                    "has_audio": True
                }
            ],
            "primary_download_url": url,
            "error_note": str(e)
        }

def mute_video_stream(input_url: str, output_path: str) -> bool:
    """
    Remove audio track from video using FFmpeg without re-encoding video stream.
    Supports remote HTTP/HTTPS URLs with proper User-Agent headers as well as local files.
    """
    ffmpeg_exe = get_ffmpeg_path() or "ffmpeg"
    
    # If remote URL, download first to temp file to prevent FFmpeg 403 / header rejection
    temp_input = None
    source_to_use = input_url

    if input_url.startswith("http://") or input_url.startswith("https://"):
        try:
            import requests
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            r = requests.get(input_url, headers=headers, stream=True, timeout=30)
            if r.status_code == 200:
                tfile = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
                temp_input = tfile.name
                for chunk in r.iter_content(chunk_size=65536):
                    if chunk:
                        tfile.write(chunk)
                tfile.close()
                source_to_use = temp_input
        except Exception:
            source_to_use = input_url

    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", source_to_use,
        "-an", # Remove audio
        "-c:v", "copy", # Fast stream copy
        output_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if res.returncode != 0:
            print("FFMPEG ERROR:", res.stderr.decode('utf-8', errors='ignore'))
        success = res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
        return success
    except Exception:
        return False
    finally:
        if temp_input and os.path.exists(temp_input):
            try:
                os.remove(temp_input)
            except Exception:
                pass
