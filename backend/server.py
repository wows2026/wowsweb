import os
import json
import re
import time
import logging
import ipaddress
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, field_validator

from shopify_client import storefront_query, admin_query, ShopifyError
from checkout import build_router as build_checkout_router

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Shopify prices by market; the EUR market ("Slovensko a EU") is priced through one of its countries.
Currency = Literal["CZK", "EUR"]
CURRENCY_COUNTRY = {"CZK": "CZ", "EUR": "SK"}

COLOR_HEX = {
    "black": "#111111", "white": "#F5F5F5", "oatmeal": "#E7DECB", "bone": "#F2F0E9",
    "yellow": "#FFE600", "grey": "#9CA3AF", "gray": "#9CA3AF", "graphite": "#3F3F46",
    "navy": "#1E3A5F", "red": "#DC2626", "green": "#16A34A", "blue": "#2563EB",
    "beige": "#E5DCC5", "pink": "#F9A8D4", "brown": "#92400E", "orange": "#F97316",
    "purple": "#9333EA", "cream": "#FFFDD0", "olive": "#6B7A2A", "khaki": "#C3B091",
}

PRODUCTS_QUERY = """
query Products($first: Int!, $country: CountryCode!) @inContext(country: $country) {
  products(first: $first) {
    edges {
      node {
        id
        handle
        title
        description
        tags
        images(first: 50) { edges { node { url altText } } }
        options { name values }
        variants(first: 50) {
          edges {
            node {
              id
              title
              availableForSale
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              selectedOptions { name value }
              image { url }
            }
          }
        }
      }
    }
  }
}
"""

CART_FRAGMENT = """
fragment CartData on Cart {
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  discountCodes { code applicable }
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            image { url }
            selectedOptions { name value }
            product { title handle featuredImage { url } }
          }
        }
      }
    }
  }
}
"""

CART_CREATE = CART_FRAGMENT + """
mutation CartCreate($lines: [CartLineInput!]!, $country: CountryCode!) {
  cartCreate(input: { lines: $lines, buyerIdentity: { countryCode: $country } }) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CART_LINES_ADD = CART_FRAGMENT + """
mutation LinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CART_LINES_UPDATE = CART_FRAGMENT + """
mutation LinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CART_LINES_REMOVE = CART_FRAGMENT + """
mutation LinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CART_DISCOUNT = CART_FRAGMENT + """
mutation Discount($cartId: ID!, $discountCodes: [String!]!) {
  cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CART_QUERY = CART_FRAGMENT + """
query GetCart($id: ID!) {
  cart(id: $id) { ...CartData }
}
"""

CART_BUYER_IDENTITY = CART_FRAGMENT + """
mutation BuyerIdentity($cartId: ID!, $country: CountryCode!) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: { countryCode: $country }) {
    cart { ...CartData }
    userErrors { field message }
  }
}
"""

CUSTOMER_CREATE = """
mutation CustomerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id }
    userErrors { field message }
  }
}
"""

CUSTOMER_BY_EMAIL = """
query CustomerByEmail($query: String!) {
  customers(first: 1, query: $query) { edges { node { id email } } }
}
"""

CUSTOMER_UPDATE = """
mutation CustomerUpdate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer { id }
    userErrors { field message }
  }
}
"""


class NewsletterSubscribe(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v


class CartLineInputModel(BaseModel):
    variant_id: str
    quantity: int = 1


class CartCreateModel(CartLineInputModel):
    currency: Currency = "CZK"


class CartLineAddModel(CartLineInputModel):
    cart_id: str


class CartCurrencyModel(BaseModel):
    cart_id: str
    currency: Currency


class CartLineUpdateModel(BaseModel):
    cart_id: str
    line_id: str
    quantity: int


class CartLineRemoveModel(BaseModel):
    cart_id: str
    line_id: str


class DiscountModel(BaseModel):
    cart_id: str
    code: str


def _user_error(errs) -> str:
    return "; ".join(e.get("message", "") for e in errs) or "Shopify error"


def _is_not_found(errs) -> bool:
    msg = _user_error(errs).lower()
    return "not found" in msg or "does not exist" in msg


def _map_money(m):
    return {"amount": float(m["amount"]), "currencyCode": m["currencyCode"]} if m else None


def map_cart(cart: dict) -> dict:
    lines = []
    for edge in cart["lines"]["edges"]:
        node = edge["node"]
        merch = node.get("merchandise") or {}
        product = merch.get("product") or {}
        lines.append({
            "id": node["id"],
            "quantity": node["quantity"],
            "variantId": merch.get("id"),
            "variantTitle": merch.get("title"),
            "availableForSale": merch.get("availableForSale"),
            "price": _map_money(merch.get("price")),
            "compareAtPrice": _map_money(merch.get("compareAtPrice")),
            "image": (merch.get("image") or {}).get("url") or ((product.get("featuredImage") or {}).get("url")),
            "options": merch.get("selectedOptions") or [],
            "productTitle": product.get("title"),
            "productHandle": product.get("handle"),
        })
    return {
        "id": cart["id"],
        "checkoutUrl": cart["checkoutUrl"],
        "totalQuantity": cart["totalQuantity"],
        "subtotal": _map_money((cart.get("cost") or {}).get("subtotalAmount")),
        "total": _map_money((cart.get("cost") or {}).get("totalAmount")),
        "discountCodes": cart.get("discountCodes") or [],
        "lines": lines,
    }


def _map_product(node: dict) -> dict:
    variants = []
    for edge in node["variants"]["edges"]:
        v = edge["node"]
        variants.append({
            "id": v["id"],
            "title": v["title"],
            "available": v["availableForSale"],
            "price": _map_money(v.get("price")),
            "compareAtPrice": _map_money(v.get("compareAtPrice")),
            "options": v.get("selectedOptions") or [],
            "image": (v.get("image") or {}).get("url"),
        })
    images = [e["node"]["url"] for e in node["images"]["edges"]]
    color_values = []
    for opt in node.get("options") or []:
        if opt["name"].strip().lower() in ("color", "colour", "barva", "farbe"):
            color_values = opt["values"]
            break
    colors = [COLOR_HEX.get(v.strip().lower(), "#D4D4D4") for v in color_values]
    return {
        "id": node["id"],
        "handle": node["handle"],
        "name": node["title"],
        "description": node.get("description") or "",
        "badge": node["tags"][0] if node.get("tags") else None,
        "colorway": " / ".join(color_values) if color_values else (variants[0]["title"] if variants else ""),
        "colors": colors,
        "available": any(v["available"] for v in variants),
        "images": {
            "main": images[0] if images else None,
            "hover": images[1] if len(images) > 1 else (images[0] if images else None),
        },
        "allImages": images,
        "price": variants[0]["price"] if variants else None,
        "compareAtPrice": variants[0]["compareAtPrice"] if variants else None,
        "variants": variants,
    }


@api_router.get("/")
async def root():
    return {"message": "WINORWINS API"}


PRODUCT_SPECS_QUERY = """
query ProductSpecs {
  products(first: 50) {
    nodes {
      handle
      metafields(first: 40) {
        nodes {
          type
          value
          definition { name }
          reference { ... on Metaobject { displayName } }
          references(first: 10) { nodes { ... on Metaobject { displayName } } }
        }
      }
    }
  }
}
"""
SPECS_TTL = 300
_specs_cache = {"at": None, "data": {}}


def _rich_text(node: dict) -> str:
    if node.get("type") == "text":
        return node.get("value") or ""
    return "".join(_rich_text(child) for child in node.get("children") or [])


def _metafield_text(field: dict) -> str:
    """A Shopify metafield as display text; types with no sensible text form (colours, files, booleans) give ''."""
    kind, value = field["type"], field.get("value") or ""
    if kind.endswith("metaobject_reference"):
        names = [n.get("displayName") for n in ((field.get("references") or {}).get("nodes") or [])]
        names.append((field.get("reference") or {}).get("displayName"))
        return ", ".join(n for n in names if n)
    try:
        if kind == "rich_text_field":
            return _rich_text(json.loads(value)).strip()
        if kind.startswith("list.") and kind.split(".", 1)[1] in ("single_line_text_field", "multi_line_text_field", "number_integer", "number_decimal"):
            return ", ".join(str(v) for v in json.loads(value))
        if kind in ("weight", "dimension", "volume"):
            measure = json.loads(value)
            return f"{measure['value']:g} {measure['unit'].lower()}"
    except (ValueError, KeyError, TypeError):
        return ""
    return value if kind in ("single_line_text_field", "multi_line_text_field", "number_integer", "number_decimal", "date") else ""


async def _product_specs() -> dict:
    """Each product's own metafields by handle, from the Admin API; only fields with a definition, which leaves out apps' internal data."""
    if _specs_cache["at"] is not None and time.monotonic() - _specs_cache["at"] < SPECS_TTL:
        return _specs_cache["data"]
    try:
        data = await admin_query(PRODUCT_SPECS_QUERY)
    except ShopifyError:
        data = None  # Specs are optional: the shop keeps working without them, and this retries after the TTL.
    specs = {}
    for product in (data or {}).get("products", {}).get("nodes", []):
        rows = [{"label": f["definition"]["name"], "value": _metafield_text(f)} for f in product["metafields"]["nodes"] if f.get("definition")]
        # Shopify returns them in no fixed order: longer texts first, then alphabetically, the same on every product.
        specs[product["handle"]] = sorted((r for r in rows if r["value"]), key=lambda r: ("\n" not in r["value"], r["label"]))
    _specs_cache.update(at=time.monotonic(), data=specs)
    return specs


@api_router.get("/products")
async def list_products(currency: Currency = "CZK"):
    try:
        data = await storefront_query(PRODUCTS_QUERY, {"first": 50, "country": CURRENCY_COUNTRY[currency]})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    specs = await _product_specs()
    return [{**_map_product(e["node"]), "specs": specs.get(e["node"]["handle"], [])} for e in data["products"]["edges"]]


@api_router.get("/cart")
async def get_cart(cart_id: str):
    try:
        data = await storefront_query(CART_QUERY, {"id": cart_id})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    if not data.get("cart"):
        raise HTTPException(status_code=404, detail="cart_not_found")
    return map_cart(data["cart"])


@api_router.post("/cart")
async def create_cart(input: CartCreateModel):
    try:
        data = await storefront_query(CART_CREATE, {
            "lines": [{"merchandiseId": input.variant_id, "quantity": input.quantity}],
            "country": CURRENCY_COUNTRY[input.currency],
        })
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartCreate"]
    if res["userErrors"]:
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.post("/cart/currency")
async def set_cart_currency(input: CartCurrencyModel):
    try:
        data = await storefront_query(CART_BUYER_IDENTITY, {"cartId": input.cart_id, "country": CURRENCY_COUNTRY[input.currency]})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartBuyerIdentityUpdate"]
    if res["userErrors"]:
        if _is_not_found(res["userErrors"]):
            raise HTTPException(status_code=404, detail="cart_not_found")
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.post("/cart/lines")
async def add_lines(input: CartLineAddModel):
    try:
        data = await storefront_query(CART_LINES_ADD, {
            "cartId": input.cart_id,
            "lines": [{"merchandiseId": input.variant_id, "quantity": input.quantity}],
        })
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartLinesAdd"]
    if res["userErrors"]:
        if _is_not_found(res["userErrors"]):
            raise HTTPException(status_code=404, detail="cart_not_found")
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.patch("/cart/lines")
async def update_line(input: CartLineUpdateModel):
    try:
        data = await storefront_query(CART_LINES_UPDATE, {
            "cartId": input.cart_id,
            "lines": [{"id": input.line_id, "quantity": input.quantity}],
        })
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartLinesUpdate"]
    if res["userErrors"]:
        if _is_not_found(res["userErrors"]):
            raise HTTPException(status_code=404, detail="cart_not_found")
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.post("/cart/lines/remove")
async def remove_line(input: CartLineRemoveModel):
    try:
        data = await storefront_query(CART_LINES_REMOVE, {"cartId": input.cart_id, "lineIds": [input.line_id]})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartLinesRemove"]
    if res["userErrors"]:
        if _is_not_found(res["userErrors"]):
            raise HTTPException(status_code=404, detail="cart_not_found")
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.post("/cart/discount")
async def apply_discount(input: DiscountModel):
    codes = [input.code.strip()] if input.code.strip() else []
    try:
        data = await storefront_query(CART_DISCOUNT, {"cartId": input.cart_id, "discountCodes": codes})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartDiscountCodesUpdate"]
    if res["userErrors"]:
        if _is_not_found(res["userErrors"]):
            raise HTTPException(status_code=404, detail="cart_not_found")
        raise HTTPException(status_code=400, detail=_user_error(res["userErrors"]))
    return map_cart(res["cart"])


@api_router.post("/newsletter")
async def subscribe_newsletter(input: NewsletterSubscribe):
    consent = {"marketingState": "SUBSCRIBED", "marketingOptInLevel": "SINGLE_OPT_IN"}
    try:
        data = await admin_query(CUSTOMER_CREATE, {"input": {"email": input.email, "emailMarketingConsent": consent}})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["customerCreate"]
    if res["userErrors"]:
        msg = _user_error(res["userErrors"]).lower()
        if "taken" in msg or "already" in msg or "exist" in msg:
            try:
                found = await admin_query(CUSTOMER_BY_EMAIL, {"query": f"email:{input.email}"})
                edges = found["customers"]["edges"]
                if edges:
                    await admin_query(CUSTOMER_UPDATE, {"input": {"id": edges[0]["node"]["id"], "emailMarketingConsent": consent}})
            except ShopifyError:
                logger.warning("customer consent update skipped for existing email")
            raise HTTPException(status_code=409, detail="already_subscribed")
        logger.error("customerCreate userErrors: %s", res["userErrors"])
        raise HTTPException(status_code=400, detail="subscribe_failed")
    return {"status": "subscribed", "email": input.email}


EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
CONTACT_RECIPIENT = "info@winorwins.com"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str = None):
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error("Email send failed: %s %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="Failed to send email")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email send error: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to send email")


ECOMAIL_API_KEY = os.environ.get("ECOMAIL_API_KEY")
ECOMAIL_LIST_ID = os.environ.get("ECOMAIL_LIST_ID")
ECOMAIL_URL = f"https://api2.ecomailapp.cz/lists/{ECOMAIL_LIST_ID}/subscribe"

CUSTOMER_TAGS_ADD = """
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}
"""

_rate_limit = {}


class WaitlistSubscribe(BaseModel):
    email: str
    marketingConsent: bool = True

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v


async def _ecomail_subscribe(email: str):
    payload = {
        "subscriber_data": {
            "email": email,
            "source": "locked-page",
            "custom_fields": {"lead_source": "locked-page"},
            "status": 1,
        },
        "trigger_autoresponders": False,
        "update_existing": True,
        "resubscribe": False,
        "skip_double_optin": True,
    }
    async with httpx.AsyncClient(timeout=20) as http_client:
        resp = await http_client.post(
            ECOMAIL_URL,
            headers={"key": ECOMAIL_API_KEY, "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code >= 400:
        logger.error("Ecomail subscribe failed %s: %s", resp.status_code, resp.text[:300])
        raise ShopifyError("ecomail_error")
    return resp.json()


@api_router.post("/waitlist")
async def waitlist_subscribe(input: WaitlistSubscribe, request: Request):
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    now = time.time()
    hits = [t for t in _rate_limit.get(client_ip, []) if now - t < 60]
    if len(hits) >= 5:
        raise HTTPException(status_code=429, detail="too_many_requests")
    hits.append(now)
    _rate_limit[client_ip] = hits

    email = input.email
    shopify_ok = False
    ecomail_ok = False

    try:
        consent = {"marketingState": "SUBSCRIBED", "marketingOptInLevel": "SINGLE_OPT_IN"} if input.marketingConsent else None
        create_input = {"email": email, "tags": ["locked-page"]}
        if consent:
            create_input["emailMarketingConsent"] = consent
        data = await admin_query(CUSTOMER_CREATE, {"input": create_input})
        res = data["customerCreate"]
        if res["userErrors"]:
            msg = _user_error(res["userErrors"]).lower()
            if "taken" in msg or "already" in msg or "exist" in msg:
                shopify_ok = True
                try:
                    found = await admin_query(CUSTOMER_BY_EMAIL, {"query": f"email:{email}"})
                    edges = found["customers"]["edges"]
                    if edges:
                        cid = edges[0]["node"]["id"]
                        await admin_query(CUSTOMER_TAGS_ADD, {"id": cid, "tags": ["locked-page"]})
                        if consent:
                            await admin_query(CUSTOMER_UPDATE, {"input": {"id": cid, "emailMarketingConsent": consent}})
                except ShopifyError:
                    logger.warning("waitlist: tag update skipped for existing %s", email)
            else:
                logger.error("waitlist customerCreate userErrors: %s", res["userErrors"])
        else:
            shopify_ok = True
    except ShopifyError:
        logger.exception("waitlist: shopify failed for a signup")

    try:
        await _ecomail_subscribe(email)
        ecomail_ok = True
    except Exception:
        logger.exception("waitlist: ecomail failed for a signup")

    if not shopify_ok and not ecomail_ok:
        raise HTTPException(status_code=502, detail="signup_unavailable")
    return {"status": "ok", "email": email, "shopify": shopify_ok, "ecomail": ecomail_ok}


class UnlockInput(BaseModel):
    password: str


@api_router.post("/auth/unlock")
async def unlock_site(input: UnlockInput):
    if input.password != os.environ.get("SITE_PASSWORD"):
        raise HTTPException(status_code=401, detail="wrong_password")
    return {"status": "unlocked"}


class ContactMessage(BaseModel):
    name: str
    email: str
    message: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= 100:
            raise ValueError("Invalid name")
        return v

    @field_validator("email")
    @classmethod
    def validate_contact_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= 2000:
            raise ValueError("Invalid message")
        return v


@api_router.post("/contact")
async def contact_message(input: ContactMessage):
    subject = "WINORWINS — Contact form"
    html = (
        '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
        '<p style="font-size:12px;letter-spacing:2px;color:#888">WINORWINS — CONTACT FORM</p>'
        f'<p><strong>Name:</strong> {escape(input.name)}</p>'
        f'<p><strong>Email:</strong> {escape(input.email)}</p>'
        f'<p><strong>Message:</strong></p>'
        f'<p style="white-space:pre-line">{escape(input.message)}</p>'
        '<p style="font-size:12px;color:#888;margin-top:24px">Sent from the WINORWINS website contact form.</p>'
        "</td></tr></table>"
    )
    email_id = await send_email(to=CONTACT_RECIPIENT, subject=subject, html=html)
    return {"status": "sent", "email_id": email_id}


api_router.include_router(build_checkout_router(db, send_email))
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
