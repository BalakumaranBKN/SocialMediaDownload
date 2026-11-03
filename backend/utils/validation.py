import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException

# Disallowed internal network ranges for SSRF prevention
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_ip_blocked(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in BLOCKED_IP_NETWORKS)
    except ValueError:
        return True

def validate_and_sanitize_url(url: str) -> str:
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Invalid URL provided.")

    cleaned_url = url.strip()
    parsed = urlparse(cleaned_url)

    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="Only HTTP and HTTPS protocols are supported."
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL must contain a valid hostname.")

    # Avoid localhost / local domain access
    lower_host = hostname.lower()
    if lower_host in ("localhost", "127.0.0.1", "::1", "metadata.google.internal") or lower_host.endswith(".local") or lower_host.endswith(".internal"):
        raise HTTPException(status_code=400, detail="Access to internal hosts is restricted.")

    # Resolve hostname to check for SSRF attacks pointing to private IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            sockaddr = item[4]
            ip_str = sockaddr[0]
            if is_ip_blocked(ip_str):
                raise HTTPException(status_code=400, detail="Access to private or local IP ranges is blocked.")
    except socket.gaierror:
        raise HTTPException(status_code=400, detail=f"Could not resolve domain: {hostname}")

    return cleaned_url

