from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import httpx
from backend.utils.validation import validate_and_sanitize_url

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str = Field(..., description="Target media URL to stream/download")
    filename: Optional[str] = Field(default=None, description="Preferred output filename")

@router.post("/download")
async def download_media(req: DownloadRequest):
    sanitized_url = validate_and_sanitize_url(req.url)

    # Stream media directly from source to Android client
    client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        # Initiate stream request
        req_stream = client.build_request("GET", sanitized_url, headers=headers)
        response = await client.send(req_stream, stream=True)

        if response.status_code >= 400:
            await response.aclose()
            await client.aclose()
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Source server returned status {response.status_code}"
            )

        content_type = response.headers.get("content-type", "application/octet-stream")
        content_length = response.headers.get("content-length")

        filename = req.filename or sanitized_url.split("/")[-1].split("?")[0]
        if not filename or len(filename) < 3:
            filename = "downloaded_media.bin"

        response_headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length"
        }
        if content_length:
            response_headers["Content-Length"] = content_length

        async def stream_generator():
            try:
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await response.aclose()
                await client.aclose()

        return StreamingResponse(
            stream_generator(),
            media_type=content_type,
            headers=response_headers
        )

    except HTTPException:
        raise
    except Exception as e:
        await client.aclose()
        raise HTTPException(status_code=500, detail=f"Streaming download failed: {str(e)}")

