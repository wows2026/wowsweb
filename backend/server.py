import os
import re
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, field_validator

from shopify_client import storefront_query, admin_query, ShopifyError

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

COLOR_HEX = {
    "black": "#111111", "white": "#F5F5F5", "oatmeal": "#E7DECB", "bone": "#F2F0E9",
    "yellow": "#FFE600", "grey": "#9CA3AF", "gray": "#9CA3AF", "graphite": "#3F3F46",
    "navy": "#1E3A5F", "red": "#DC2626", "green": "#16A34A", "blue": "#2563EB",
    "beige": "#E5DCC5", "pink": "#F9A8D4", "brown": "#92400E", "orange": "#F97316",
    "purple": "#9333EA", "cream": "#FFFDD0", "olive": "#6B7A2A", "khaki": "#C3B091",
}

PRODUCTS_QUERY = """
query Products($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        handle
        title
        description
        tags
        images(first: 4) { edges { node { url altText } } }
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
mutation CartCreate($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) {
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


class CartLineAddModel(CartLineInputModel):
    cart_id: str


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


@api_router.get("/products")
async def list_products():
    try:
        data = await storefront_query(PRODUCTS_QUERY, {"first": 50})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    return [_map_product(e["node"]) for e in data["products"]["edges"]]


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
async def create_cart(input: CartLineInputModel):
    try:
        data = await storefront_query(CART_CREATE, {"lines": [{"merchandiseId": input.variant_id, "quantity": input.quantity}]})
    except ShopifyError:
        raise HTTPException(status_code=502, detail="shopify_unavailable")
    res = data["cartCreate"]
    if res["userErrors"]:
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
