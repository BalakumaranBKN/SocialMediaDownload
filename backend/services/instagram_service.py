import re
import html
import requests
import yt_dlp
from typing import Dict, Any, List, Optional

def get_clean_instagram_url(url: str) -> str:
    """Normalize and strip tracking query parameters to extract canonical shortcode URL."""
    shortcode_match = re.search(r'/(?:p|reel|tv)/([A-Za-z0-9_-]+)', url)
    if shortcode_match:
        tag = "reel" if "/reel/" in url else "p"
        return f"https://www.instagram.com/{tag}/{shortcode_match.group(1)}/"
    return url.split('?')[0]

def scrape_instagram_opengraph(url: str) -> Optional[Dict[str, Any]]:
    """
    Direct crawler extraction for Instagram posts (especially photos, carousels, and reels).
    Bypasses yt-dlp 'No video formats found' issues on photo posts.
    """
    clean_url = get_clean_instagram_url(url)
    headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }

    try:
        r = requests.get(clean_url, headers=headers, timeout=12)
        if r.status_code != 200:
            return None

        text = r.text

        # Extract OpenGraph tags
        og_vid = re.findall(r'<meta\s+property=["\']og:video(?::secure_url)?["\']\s+content=["\']([^"\']+)["\']', text, re.IGNORECASE)
        og_img = re.findall(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', text, re.IGNORECASE)
        og_title = re.findall(r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']', text, re.IGNORECASE)

        title = "Instagram Post"
        if og_title:
            title = html.unescape(og_title[0])

        # If video found
        if og_vid:
            vid_url = html.unescape(og_vid[0]).replace('&amp;', '&')
            thumb = html.unescape(og_img[0]).replace('&amp;', '&') if og_img else ""
            return {
                "success": True,
                "platform": "Instagram",
                "type": "video",
                "title": title,
                "duration": 0,
                "thumbnail": thumb,
                "primary_download_url": vid_url,
                "quality_options": [{
                    "resolution": "Original",
                    "label": "Original Video",
                    "url": vid_url,
                    "has_audio": True
                }]
            }

        # If photo / carousel post
        if og_img:
            primary_img = html.unescape(og_img[0]).replace('&amp;', '&')

            # Search for distinct carousel images in page
            cdn_matches = re.findall(r'https://scontent[^\s"\'<>\\]+', text)
            clean_cdn: List[str] = []
            seen = set()
            for u in cdn_matches:
                cleaned = html.unescape(u.replace(r'\/', '/').replace('&amp;', '&'))
                if cleaned not in seen and 's150x150' not in cleaned and 's320x320' not in cleaned:
                    seen.add(cleaned)
                    clean_cdn.append(cleaned)

            if len(clean_cdn) > 1:
                images = [
                    {
                        "index": i + 1,
                        "type": "image",
                        "url": u,
                        "thumbnail": u,
                        "title": f"Instagram Photo {i + 1}"
                    }
                    for i, u in enumerate(clean_cdn)
                ]
                return {
                    "success": True,
                    "platform": "Instagram",
                    "type": "multi_image",
                    "title": title,
                    "count": len(images),
                    "images": images,
                    "thumbnail": images[0]["thumbnail"]
                }
            else:
                return {
                    "success": True,
                    "platform": "Instagram",
                    "type": "image",
                    "title": title,
                    "thumbnail": primary_img,
                    "primary_download_url": primary_img,
                    "images": [{
                        "index": 1,
                        "url": primary_img,
                        "thumbnail": primary_img,
                        "title": title
                    }]
                }

    except Exception:
        return None

    return None

def inspect_instagram(url: str) -> Dict[str, Any]:
    """
    Extracts public Instagram photo, carousel/multi-image, or reel/video.
    Tries crawler extraction first, falling back to yt-dlp and vice versa.
    """
    clean_url = get_clean_instagram_url(url)

    # 1. First attempt: Direct OpenGraph scraper (handles photos, carousels, and videos instantly)
    og_result = scrape_instagram_opengraph(clean_url)
    if og_result and og_result.get("success"):
        return og_result

    # 2. Second attempt: yt-dlp extractor
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'no_color': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            if not info:
                # Retry with og_result if any
                if og_result:
                    return og_result
                return {
                    "success": False,
                    "platform": "Instagram",
                    "error": "Unable to access media. Post may be private or deleted."
                }

            # Check if multi-item carousel (playlist / entries)
            entries = info.get('entries')
            if entries and len(entries) > 0:
                images: List[Dict[str, Any]] = []
                videos: List[Dict[str, Any]] = []

                for idx, entry in enumerate(entries):
                    if not entry:
                        continue
                    entry_url = entry.get('url')
                    thumbnail = entry.get('thumbnail') or entry_url
                    vcodec = entry.get('vcodec')

                    if vcodec and vcodec != 'none':
                        videos.append({
                            "index": idx + 1,
                            "type": "video",
                            "url": entry_url,
                            "thumbnail": thumbnail,
                            "width": entry.get('width', 0),
                            "height": entry.get('height', 0),
                        })
                    else:
                        images.append({
                            "index": idx + 1,
                            "type": "image",
                            "url": entry_url or thumbnail,
                            "thumbnail": thumbnail,
                            "width": entry.get('width', 0),
                            "height": entry.get('height', 0),
                            "title": f"Instagram Image {idx + 1}"
                        })

                if len(images) > 0:
                    return {
                        "success": True,
                        "platform": "Instagram",
                        "type": "multi_image",
                        "title": info.get('title') or "Instagram Carousel",
                        "count": len(images),
                        "images": images,
                        "thumbnail": images[0]["thumbnail"]
                    }
                elif len(videos) > 0:
                    first_vid = videos[0]
                    return {
                        "success": True,
                        "platform": "Instagram",
                        "type": "video",
                        "title": info.get('title') or "Instagram Video",
                        "duration": info.get('duration', 0),
                        "thumbnail": first_vid.get("thumbnail"),
                        "primary_download_url": first_vid.get("url"),
                        "quality_options": [{
                            "resolution": "Original",
                            "label": "Original Quality",
                            "url": first_vid.get("url"),
                            "has_audio": True
                        }]
                    }

            # Single item
            vcodec = info.get('vcodec')
            is_video = vcodec and vcodec != 'none'

            if is_video:
                formats = info.get('formats', [])
                video_url = info.get('url') or (formats[-1].get('url') if formats else clean_url)
                return {
                    "success": True,
                    "platform": "Instagram",
                    "type": "video",
                    "title": info.get('title') or "Instagram Video",
                    "duration": info.get('duration', 0),
                    "thumbnail": info.get('thumbnail') or "",
                    "primary_download_url": video_url,
                    "quality_options": [
                        {
                            "resolution": "Original",
                            "label": "Original High Quality",
                            "url": video_url,
                            "has_audio": True
                        }
                    ]
                }
            else:
                image_url = info.get('url') or info.get('thumbnail') or clean_url
                return {
                    "success": True,
                    "platform": "Instagram",
                    "type": "image",
                    "title": info.get('title') or "Instagram Image",
                    "images": [{
                        "index": 1,
                        "url": image_url,
                        "thumbnail": image_url,
                        "width": info.get('width', 0),
                        "height": info.get('height', 0)
                    }],
                    "thumbnail": image_url,
                    "primary_download_url": image_url
                }

    except Exception as e:
        # Check if direct opengraph can recover
        direct_try = scrape_instagram_opengraph(clean_url)
        if direct_try and direct_try.get("success"):
            return direct_try

        err_msg = str(e)
        if "login" in err_msg.lower() or "private" in err_msg.lower():
            err_msg = "This Instagram post is private or requires authentication. Platform access controls prevent retrieval."
        elif "no video formats found" in err_msg.lower():
            err_msg = "No downloadable media stream found on this Instagram post. The post may contain only private content."
        return {
            "success": False,
            "platform": "Instagram",
            "error": err_msg
        }
