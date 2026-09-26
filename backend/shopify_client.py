import os
import time
import logging
import httpx

logger = logging.getLogger(__name__)

SHOP = os.environ["SHOPIFY_SHOP"]
CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SHOPIFY_CLIENT_SECRET"]
STOREFRONT_TOKEN = os.environ["SHOPIFY_STOREFRONT_TOKEN"]
API_VERSION = os.environ.get("SHOPIFY_API_VERSION", "2026-01")

STOREFRONT_URL = f"https://{SHOP}.myshopify.com/api/{API_VERSION}/graphql.json"
ADMIN_URL = f"https://{SHOP}.myshopify.com/admin/api/{API_VERSION}/graphql.json"
ADMIN_TOKEN_URL = f"https://{SHOP}.myshopify.com/admin/oauth/access_token"

_admin_token = None
_admin_token_expires_at = 0.0


class ShopifyError(Exception):
    pass


async def _get_admin_token() -> str:
    global _admin_token, _admin_token_expires_at
    if _admin_token and time.time() < _admin_token_expires_at - 120:
        return _admin_token
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            ADMIN_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code != 200:
        logger.error("Shopify token request failed %s: %s", resp.status_code, resp.text[:300])
        raise ShopifyError("token_error")
    data = resp.json()
    _admin_token = data["access_token"]
    _admin_token_expires_at = time.time() + int(data.get("expires_in", 86399))
    logger.info("Shopify admin token refreshed, expires in %ss", data.get("expires_in"))
    return _admin_token


async def storefront_query(query: str, variables=None) -> dict:
    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.post(
            STOREFRONT_URL,
            json={"query": query, "variables": variables or {}},
            headers={
                "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
                "Content-Type": "application/json",
            },
        )
    if resp.status_code != 200:
        logger.error("Storefront API %s: %s", resp.status_code, resp.text[:500])
        raise ShopifyError("storefront_unavailable")
    payload = resp.json()
    if payload.get("errors"):
        logger.error("Storefront API errors: %s", payload["errors"])
        raise ShopifyError("storefront_error")
    return payload["data"]


async def admin_query(query: str, variables=None) -> dict:
    token = await _get_admin_token()
    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.post(
            ADMIN_URL,
            json={"query": query, "variables": variables or {}},
            headers={"X-Shopify-Access-Token": token, "Content-Type": "application/json"},
        )
    if resp.status_code != 200:
        logger.error("Admin API %s: %s", resp.status_code, resp.text[:500])
        raise ShopifyError("admin_unavailable")
    payload = resp.json()
    if payload.get("errors"):
        logger.error("Admin API errors: %s", payload["errors"])
        raise ShopifyError("admin_error")
    return payload["data"]
