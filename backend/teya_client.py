import os
import time
import base64
import logging
import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger(__name__)

# TEYA_ENV=staging → api.teya.xyz / id.teya.xyz (test cards), production → api.teya.com / id.teya.com.
_PROD = os.environ.get("TEYA_ENV", "staging") == "production"
API_URL = os.environ.get("TEYA_API_URL") or ("https://api.teya.com" if _PROD else "https://api.teya.xyz")
TOKEN_URL = os.environ.get("TEYA_TOKEN_URL") or (
    "https://id.teya.com/oauth/v2/oauth-token" if _PROD else "https://id.teya.xyz/oauth/v2/oauth-token"
)
CLIENT_ID = os.environ.get("TEYA_CLIENT_ID")
CLIENT_SECRET = os.environ.get("TEYA_CLIENT_SECRET")
STORE_ID = os.environ.get("TEYA_STORE_ID")
WEBHOOK_PUBLIC_KEY = os.environ.get("TEYA_WEBHOOK_PUBLIC_KEY")
SCOPES = "checkout/sessions/create checkout/sessions/id/get refunds/create"
USER_AGENT = "winorwins-web/1.0"

_token = None
_token_expires_at = 0.0


class TeyaError(Exception):
    pass


def configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


async def _get_token() -> str:
    global _token, _token_expires_at
    if _token and time.time() < _token_expires_at - 60:
        return _token
    if not configured():
        raise TeyaError("teya_not_configured")
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            TOKEN_URL,
            data={"grant_type": "client_credentials", "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET, "scope": SCOPES},
            headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT},
        )
    if resp.status_code != 200:
        logger.error("Teya token request failed %s: %s", resp.status_code, resp.text[:300])
        raise TeyaError("token_error")
    data = resp.json()
    _token = data["access_token"]
    _token_expires_at = time.time() + int(data.get("expires_in", 300))
    return _token


async def _request(method: str, path: str, **kwargs) -> httpx.Response:
    token = await _get_token()
    headers = {"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT, **kwargs.pop("headers", {})}
    async with httpx.AsyncClient(timeout=25) as client:
        return await client.request(method, f"{API_URL}{path}", headers=headers, **kwargs)


async def create_session(body: dict, idempotency_key: str) -> dict:
    if STORE_ID:
        body = {"store_id": STORE_ID, **body}
    resp = await _request("POST", "/v2/checkout/sessions", json=body, headers={"Idempotency-Key": idempotency_key})
    if resp.status_code not in (200, 201):
        logger.error("Teya create session %s: %s", resp.status_code, resp.text[:500])
        raise TeyaError("session_create_failed")
    return resp.json()


async def get_session(session_id: str) -> dict:
    resp = await _request("GET", f"/v2/checkout/sessions/{session_id}")
    if resp.status_code != 200:
        logger.error("Teya get session %s: %s", resp.status_code, resp.text[:300])
        raise TeyaError("session_get_failed")
    return resp.json()


def _public_key():
    # The Business Portal shows the webhook key as PEM; the signature validator uses bare base64 DER. Accept both.
    raw = WEBHOOK_PUBLIC_KEY.replace("\\n", "\n").strip()
    if raw.startswith("-----BEGIN"):
        return serialization.load_pem_public_key(raw.encode())
    return serialization.load_der_public_key(base64.b64decode(raw))


def webhook_key_configured() -> bool:
    return bool(WEBHOOK_PUBLIC_KEY)


def verify_webhook(body: bytes, signature_b64: str) -> bool:
    """SHA256withRSA over the raw request body, signature base64 in the x-teya-signature header."""
    if not signature_b64:
        return False
    try:
        _public_key().verify(base64.b64decode(signature_b64), body, padding.PKCS1v15(), hashes.SHA256())
        return True
    except (InvalidSignature, ValueError):
        return False
