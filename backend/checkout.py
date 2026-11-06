"""Own checkout: Shopify cart + Shopify shipping rates, card payment through Teya Hosted Checkout,
then the paid order is written back to Shopify (orderCreate) so fulfilment, stock and e-mails stay there.

Flow: /checkout/shipping (address → rates) → /checkout/start (Teya session, redirect) →
Teya webhook and/or /checkout/status polling (both confirm the payment with Teya before acting) →
_finalize creates the Shopify order exactly once.
"""
import os
import re
import time
import secrets
import logging
import unicodedata
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from html import escape
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, field_validator

import httpx

import teya_client as teya
from shopify_client import storefront_query, admin_query, ShopifyError

logger = logging.getLogger(__name__)
# httpx logs every request URL at INFO, and an address search has what the buyer typed in it.
logging.getLogger("httpx").setLevel(logging.WARNING)

ORDER_ALERT_RECIPIENT = os.environ.get("ORDER_ALERT_EMAIL", "info@winorwins.com")
PUBLIC_SITE_URL = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9 ()-]{6,20}$")
# Shopify rates named like "DPD – box" / "DPD Pickup" deliver to a point the customer picks on DPD's map.
PICKUP_RE = re.compile(r"box|pickup|výdejn", re.I)
DPD_PICKUP_URL = "https://api.dpd.cz/api/v1/pickup-points/{}"
MAPY_SUGGEST_URL = "https://api.mapy.com/v1/suggest"
# Result language per delivery country, so city names come out the way the courier expects them.
CITY_IN_QUERY = re.compile(r"^(.*?\d\S*)[,\s]+(\D{2,})$")
MAPY_LANG = {"CZ": "cs", "SK": "sk", "DE": "de", "AT": "de", "FR": "fr", "ES": "es", "IT": "it", "NL": "nl", "PL": "pl", "PT": "pt", "GR": "el"}

CHECKOUT_FRAGMENT = """
fragment CheckoutCart on Cart {
  id
  totalQuantity
  cost { totalAmount { amount currencyCode } }
  discountCodes { code applicable }
  discountAllocations { targetType discountedAmount { amount } }
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
            image { url }
            product { title featuredImage { url } }
          }
        }
      }
    }
  }
  deliveryGroups(first: 5) {
    nodes {
      id
      selectedDeliveryOption { handle title estimatedCost { amount currencyCode } }
      deliveryOptions { handle title estimatedCost { amount currencyCode } }
    }
  }
}
"""

CHECKOUT_CART = CHECKOUT_FRAGMENT + """
query CheckoutCart($id: ID!) { cart(id: $id) { ...CheckoutCart } }
"""

ADDRESS_REPLACE = CHECKOUT_FRAGMENT + """
mutation AddressReplace($cartId: ID!, $addresses: [CartSelectableAddressInput!]!, $country: CountryCode!, $email: String) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: { countryCode: $country, email: $email }) {
    userErrors { field message }
  }
  cartDeliveryAddressesReplace(cartId: $cartId, addresses: $addresses) {
    cart { ...CheckoutCart }
    userErrors { field message }
  }
}
"""

SELECT_DELIVERY = CHECKOUT_FRAGMENT + """
mutation SelectDelivery($cartId: ID!, $options: [CartSelectedDeliveryOptionInput!]!) {
  cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $options) {
    cart { ...CheckoutCart }
    userErrors { field message }
  }
}
"""

ORDER_CREATE = """
mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order { id name }
    userErrors { field message }
  }
}
"""


class CheckoutAddress(BaseModel):
    cart_id: str
    email: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    address1: str
    address2: str = ""
    city: str
    zip: str
    country: str

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.fullmatch(r"[A-Z]{2}", v):
            raise ValueError("Invalid country")
        return v

    @field_validator("address1", "city", "zip")
    @classmethod
    def validate_required(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= 120:
            raise ValueError("Required")
        return v

    @field_validator("address2", "first_name", "last_name")
    @classmethod
    def validate_optional(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 120:
            raise ValueError("Too long")
        return v


class PickupPoint(BaseModel):
    id: str
    name: str = ""
    street: str = ""
    zip: str = ""
    city: str = ""
    country: str = ""

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{2,40}", v):
            raise ValueError("Invalid pickup point")
        return v

    @field_validator("name", "street", "zip", "city", "country")
    @classmethod
    def validate_text(cls, v: str) -> str:
        return v.strip()[:120]


class CheckoutStart(CheckoutAddress):
    email: str
    phone: str
    delivery_handle: str
    pickup_point: Optional[PickupPoint] = None
    lang: Literal["cz", "en"] = "cz"

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_RE.match(v):
            raise ValueError("Invalid phone")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not 1 <= len(v) <= 80:
            raise ValueError("Required")
        return v


def _dec(amount) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _minor(amount: Decimal) -> int:
    return int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))


def _shopify_address(a: CheckoutAddress) -> dict:
    return {
        "deliveryAddress": {
            "firstName": a.first_name or None,
            "lastName": a.last_name or None,
            "address1": a.address1,
            "address2": a.address2 or None,
            "city": a.city,
            "zip": a.zip,
            "countryCode": a.country,
        }
    }


def _summary(cart: dict) -> dict:
    """Cart as the checkout page shows it; every amount comes from Shopify."""
    lines = []
    items_total = Decimal("0")
    currency = cart["cost"]["totalAmount"]["currencyCode"]
    for edge in cart["lines"]["edges"]:
        node = edge["node"]
        merch = node.get("merchandise") or {}
        product = merch.get("product") or {}
        price = _dec(merch["price"]["amount"])
        items_total += price * node["quantity"]
        lines.append({
            "variantId": merch.get("id"),
            "productTitle": product.get("title"),
            "variantTitle": merch.get("title"),
            "quantity": node["quantity"],
            "price": float(price),
            "available": bool(merch.get("availableForSale")),
            "image": (merch.get("image") or {}).get("url") or (product.get("featuredImage") or {}).get("url"),
        })
    group = (cart.get("deliveryGroups") or {}).get("nodes") or []
    group = group[0] if group else None
    selected = (group or {}).get("selectedDeliveryOption")
    shipping = _dec(selected["estimatedCost"]["amount"]) if selected else Decimal("0")
    # A shipping discount ("free shipping") is an allocation on the shipping line, not part of the rate's price,
    # and it is only allocated to the selected rate; the same share applies to the other rates.
    shipping_off = sum((_dec(a["discountedAmount"]["amount"]) for a in cart.get("discountAllocations") or [] if a.get("targetType") == "SHIPPING_LINE"), Decimal("0"))
    shipping_off = min(shipping_off, shipping)
    paid_share = (shipping - shipping_off) / shipping if shipping else Decimal("1")
    options = [
        {"handle": o["handle"], "title": o["title"], "amount": float(_dec(_dec(o["estimatedCost"]["amount"]) * paid_share)),
         "pickup": bool(PICKUP_RE.search(o["title"]))}
        for o in (group or {}).get("deliveryOptions") or []
    ]
    shipping -= shipping_off
    total = _dec(cart["cost"]["totalAmount"]["amount"])
    # totalAmount already includes the selected shipping and every discount, so the rest is the discount on the goods.
    discount = items_total + shipping - total
    if discount < Decimal("0.01"):
        discount = Decimal("0")
    return {
        "currency": currency,
        "lines": lines,
        "itemsTotal": float(items_total),
        "discount": float(discount),
        "discountCodes": [d["code"] for d in cart.get("discountCodes") or [] if d.get("applicable")],
        "shipping": {"handle": selected["handle"], "title": selected["title"], "amount": float(shipping)} if selected else None,
        "deliveryGroupId": group["id"] if group else None,
        "options": options,
        "total": float(total),
    }


def _mapy_address(item: dict, country: str) -> Optional[dict]:
    """A Mapy.com suggestion as checkout form fields; None when it lies outside the delivery country."""
    regions = item.get("regionalStructure") or []
    iso = next((r.get("isoCode") for r in regions if r.get("isoCode")), None)
    if iso and iso.upper() != country:
        return None
    city = next((r.get("name") for r in regions if r.get("type") == "regional.municipality"), "")
    return {"address1": item.get("name") or "", "city": city or "", "zip": item.get("zip") or "", "label": item.get("location") or item.get("name") or ""}


def _fold(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", text.casefold()) if not unicodedata.combining(ch))


def _rank_addresses(addresses: list, query: str) -> list:
    """Mapy.com matches the street first and may ignore a typed city or number, so best overlap with the query goes on top."""
    terms = _fold(query).replace(",", " ").split()

    def score(a: dict) -> int:
        words = set(re.split(r"[\s/,-]+", _fold(f"{a['address1']} {a['zip']} {a['city']}")))
        # An exact word (house number, city) beats a street name that merely starts with what was typed.
        return sum(2 if t in words else 1 if any(w.startswith(t) for w in words) else 0 for t in terms)

    unique = {(a["address1"], a["zip"], a["city"]): a for a in reversed(addresses)}
    return sorted(reversed(list(unique.values())), key=score, reverse=True)[:5]


async def _suggest_addresses(query: str, country: str) -> list:
    """Autocomplete is a convenience: without a key or when Mapy.com fails the buyer just types the address."""
    key = os.environ.get("MAPY_API_KEY")
    query = query.strip()
    if not key or not 3 <= len(query) <= 120 or not re.fullmatch(r"[A-Z]{2}", country):
        return []
    # "Husova 12 Plzeň": search the street inside the typed city, or common street names drown it out.
    typed_city = CITY_IN_QUERY.match(query)
    searches = [(typed_city[1], typed_city[2])] if typed_city else []
    searches.append((query, country.lower()))
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            for text, locality in searches:
                resp = await client.get(
                    MAPY_SUGGEST_URL,
                    headers={"X-Mapy-Api-Key": key},
                    params={"query": text, "type": "regional.address", "locality": locality, "limit": 15, "lang": MAPY_LANG.get(country, "en")},
                )
                if resp.status_code != 200:
                    logger.warning("Mapy.com suggest returned %s", resp.status_code)
                    return []
                addresses = [a for a in (_mapy_address(i, country) for i in resp.json().get("items") or []) if a and a["address1"]]
                if addresses:
                    return _rank_addresses(addresses, query)
        return []
    except (httpx.HTTPError, ValueError) as e:
        logger.warning("Mapy.com suggest failed: %s", type(e).__name__)
        return []


async def _dpd_point(point: "PickupPoint") -> dict:
    """The point's address straight from DPD's public pickup API; the browser only supplies the ID."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(DPD_PICKUP_URL.format(point.id), headers={"Accept": "application/json"})
        if 400 <= resp.status_code < 500:
            raise HTTPException(status_code=400, detail="pickup_point_required")
        resp.raise_for_status()
        data = resp.json()
        addr = (data.get("location") or {}).get("address") or {}
        if data.get("enabled") is False:
            raise HTTPException(status_code=400, detail="pickup_point_required")
        return {"id": data["id"], "name": data.get("name") or "", "type": data.get("type") or "", "street": addr.get("street") or "",
                "zip": addr.get("zip") or "", "city": addr.get("city") or "", "country": (addr.get("country") or "").upper()}
    except HTTPException:
        raise
    except Exception:
        logger.warning("DPD pickup API unavailable, using the widget's data for %s", point.id)
        return {**point.model_dump(), "type": "", "country": point.country.upper()}


def _site_url(request: Request) -> str:
    if PUBLIC_SITE_URL:
        return PUBLIC_SITE_URL
    origin = request.headers.get("origin") or ""
    if re.fullmatch(r"https?://[A-Za-z0-9.-]+(:\d+)?", origin):
        return origin
    raise HTTPException(status_code=500, detail="site_url_not_configured")


def _public(doc: dict) -> dict:
    return {
        "ref": doc["ref"],
        "status": doc["status"],
        "orderName": doc.get("shopify_order_name"),
        "email": doc["customer"]["email"],
        "total": doc["total"],
        "currency": doc["currency"],
    }


def build_router(db, send_email) -> APIRouter:
    router = APIRouter(prefix="/checkout")
    checkouts = db.checkouts

    async def _set_address(a: CheckoutAddress) -> dict:
        try:
            data = await storefront_query(ADDRESS_REPLACE, {
                "cartId": a.cart_id,
                "country": a.country,
                "email": a.email,
                "addresses": [{"address": _shopify_address(a), "selected": True, "oneTimeUse": True}],
            })
        except ShopifyError:
            raise HTTPException(status_code=502, detail="shopify_unavailable")
        res = data["cartDeliveryAddressesReplace"]
        errs = res["userErrors"] + (data.get("cartBuyerIdentityUpdate") or {}).get("userErrors", [])
        if errs or not res.get("cart"):
            logger.warning("checkout address userErrors: %s", errs)
            if any("not found" in (e.get("message") or "").lower() for e in errs) or not res.get("cart"):
                raise HTTPException(status_code=404, detail="cart_not_found")
            raise HTTPException(status_code=400, detail="invalid_address")
        return res["cart"]

    @router.get("/address-suggest")
    async def address_suggest(q: str = "", country: str = ""):
        return {"items": await _suggest_addresses(q, country.strip().upper())}

    @router.post("/shipping")
    async def shipping_options(input: CheckoutAddress):
        cart = await _set_address(input)
        return _summary(cart)

    @router.post("/start")
    async def start(input: CheckoutStart, request: Request):
        if not teya.configured():
            raise HTTPException(status_code=503, detail="payments_not_configured")
        cart = await _set_address(input)
        summary = _summary(cart)
        if not summary["lines"]:
            raise HTTPException(status_code=400, detail="cart_empty")
        if not all(l["available"] for l in summary["lines"]):
            raise HTTPException(status_code=409, detail="item_unavailable")
        if input.delivery_handle not in {o["handle"] for o in summary["options"]}:
            raise HTTPException(status_code=400, detail="invalid_delivery")
        try:
            data = await storefront_query(SELECT_DELIVERY, {
                "cartId": input.cart_id,
                "options": [{"deliveryGroupId": summary["deliveryGroupId"], "deliveryOptionHandle": input.delivery_handle}],
            })
        except ShopifyError:
            raise HTTPException(status_code=502, detail="shopify_unavailable")
        res = data["cartSelectedDeliveryOptionsUpdate"]
        if res["userErrors"] or not res.get("cart"):
            logger.error("select delivery userErrors: %s", res["userErrors"])
            raise HTTPException(status_code=400, detail="invalid_delivery")
        summary = _summary(res["cart"])
        if not summary["shipping"] or summary["shipping"]["handle"] != input.delivery_handle:
            raise HTTPException(status_code=400, detail="invalid_delivery")
        pickup = None
        if PICKUP_RE.search(summary["shipping"]["title"]):
            # The rate is priced for the address's country, so the box must be in that country too.
            if not input.pickup_point:
                raise HTTPException(status_code=400, detail="pickup_point_required")
            pickup = await _dpd_point(input.pickup_point)
            if pickup["country"] not in ("", input.country):
                raise HTTPException(status_code=400, detail="pickup_point_country")

        ref = "W" + secrets.token_hex(8).upper()
        currency = summary["currency"]
        total = _dec(summary["total"])
        site = _site_url(request)
        line_items = [
            {
                "description": " — ".join(x for x in (l["productTitle"], l["variantTitle"]) if x and x != "Default Title")[:120],
                "quantity": l["quantity"],
                "unit_price": _minor(_dec(l["price"])),
            }
            for l in summary["lines"]
        ]
        if summary["shipping"]["amount"]:
            line_items.append({"description": summary["shipping"]["title"][:120], "quantity": 1,
                               "unit_price": _minor(_dec(summary["shipping"]["amount"]))})
        if summary["discount"]:
            line_items.append({"description": "Sleva / Discount", "quantity": 1, "unit_price": -_minor(_dec(summary["discount"]))})

        doc = {
            "ref": ref,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "cart_id": input.cart_id,
            "lang": input.lang,
            "currency": currency,
            "total": float(total),
            "amount_minor": _minor(total),
            "summary": summary,
            "customer": {"email": input.email, "phone": input.phone, "first_name": input.first_name, "last_name": input.last_name},
            "address": {"address1": input.address1, "address2": input.address2, "city": input.city, "zip": input.zip, "country": input.country},
            "pickup_point": pickup,
            "shopify_state": None,
        }
        await checkouts.insert_one(doc)

        phone = re.sub(r"[^\d+]", "", input.phone)
        body = {
            "type": "SALE",
            "amount": {"currency": currency, "value": _minor(total)},
            "line_items": line_items,
            "merchant_reference": ref,
            "metadata": {"ref": ref},
            "customer": {"email": input.email, "name": f"{input.first_name} {input.last_name}",
                         **({"phone_number": phone} if phone.startswith("+") else {})},
            "billing_address": {"country": input.country, "city": input.city, "zipcode": input.zip,
                                "street_address_line1": input.address1,
                                **({"street_address_line2": input.address2} if input.address2 else {})},
            "language": "cs-CZ" if input.lang == "cz" else "en-GB",
            "success_url": f"{site}/checkout/return?ref={ref}",
            "failure_url": f"{site}/checkout/return?ref={ref}",
            "cancel_url": f"{site}/checkout?cancelled={ref}",
            "post_success_payment": "REDIRECT",
        }
        try:
            session = await teya.create_session(body, idempotency_key=ref)
        except teya.TeyaError:
            await checkouts.update_one({"ref": ref}, {"$set": {"status": "failed", "error": "session_create_failed"}})
            raise HTTPException(status_code=502, detail="payment_unavailable")
        await checkouts.update_one({"ref": ref}, {"$set": {"teya_session_id": session["session_id"]}})
        return {"ref": ref, "redirectUrl": session["session_url"]}

    async def _confirm(doc: dict) -> dict:
        """Asks Teya for the session state; never trusts the browser or the webhook body alone."""
        if doc["status"] != "pending" or not doc.get("teya_session_id"):
            return doc
        try:
            s = await teya.get_session(doc["teya_session_id"])
        except teya.TeyaError:
            return doc
        status = s.get("session_status")
        paid = status == "COMPLETED" and s.get("payment_status") == "SUCCESS"
        amount = s.get("amount") or {}
        if paid and (amount.get("value") != doc["amount_minor"] or amount.get("currency") != doc["currency"]):
            logger.error("Teya amount mismatch for %s: %s", doc["ref"], amount)
            paid = False
            status = "MISMATCH"
        update = None
        if paid:
            update = {"status": "paid", "paid_at": datetime.now(timezone.utc), "teya_transaction_id": s.get("transaction_id")}
        elif status == "COMPLETED" or status == "MISMATCH":
            update = {"status": "failed"}
        elif status == "EXPIRED":
            update = {"status": "expired"}
        if update:
            doc = await checkouts.find_one_and_update(
                {"ref": doc["ref"], "status": "pending"}, {"$set": update}, return_document=True
            ) or await checkouts.find_one({"ref": doc["ref"]})
        if doc["status"] == "paid":
            doc = await _finalize(doc)
        return doc

    async def _finalize(doc: dict) -> dict:
        """Creates the Shopify order once; the state switch is atomic, so a webhook and a poll can't both create it."""
        claimed = await checkouts.find_one_and_update(
            {"ref": doc["ref"], "status": "paid", "shopify_state": {"$in": [None, "error"]}},
            {"$set": {"shopify_state": "creating", "shopify_attempt_at": time.time()}},
            return_document=True,
        )
        if not claimed:
            return await checkouts.find_one({"ref": doc["ref"]})
        s, c, a, cur = claimed["summary"], claimed["customer"], claimed["address"], claimed["currency"]

        def money(v):
            return {"shopMoney": {"amount": str(_dec(v)), "currencyCode": cur}}

        address = {"firstName": c["first_name"], "lastName": c["last_name"], "address1": a["address1"],
                   "address2": a["address2"] or None, "city": a["city"], "zip": a["zip"],
                   "countryCode": a["country"], "phone": c["phone"]}
        pp = claimed.get("pickup_point")
        # Box delivery: ship to the DPD point; its ID goes into company, shipping code and note for the label.
        shipping_address = {**address, "company": f"DPD Pickup {pp['id']} {pp['name']}"[:255], "address1": pp["street"] or pp["id"],
                            "address2": None, "city": pp["city"] or a["city"], "zip": pp["zip"] or a["zip"]} if pp else address
        shipping_code = f"DPD-PICKUP:{pp['id']}" if pp else s["shipping"]["title"]
        order = {
            "currency": cur,
            "email": c["email"],
            "phone": c["phone"],
            "customer": {"toUpsert": {"email": c["email"], "firstName": c["first_name"], "lastName": c["last_name"]}},
            "lineItems": [{"variantId": l["variantId"], "quantity": l["quantity"], "priceSet": money(l["price"])} for l in s["lines"]],
            "shippingAddress": shipping_address,
            "billingAddress": address,
            "shippingLines": [{"title": s["shipping"]["title"], "code": shipping_code, "priceSet": money(s["shipping"]["amount"])}],
            "financialStatus": "PAID",
            "transactions": [{"kind": "SALE", "status": "SUCCESS", "gateway": "Teya",
                              "authorizationCode": claimed.get("teya_transaction_id"), "amountSet": money(claimed["total"])}],
            "taxesIncluded": True,
            "sourceIdentifier": claimed["ref"],
            "note": f"Teya {claimed.get('teya_transaction_id') or ''} · web checkout {claimed['ref']}"
                    + (f" · DPD Pickup {pp['id']}: {pp['name']}, {pp['street']}, {pp['zip']} {pp['city']}" if pp else ""),
            "tags": ["teya", "web-checkout"],
        }
        if s["discount"]:
            order["discountCode"] = {"itemFixedDiscountCode": {
                "code": ", ".join(s["discountCodes"]) or "SLEVA", "amountSet": money(s["discount"])}}
        error = None
        try:
            data = await admin_query(ORDER_CREATE, {"order": order, "options": {
                "inventoryBehaviour": "DECREMENT_OBEYING_POLICY", "sendReceipt": True}})
            res = data["orderCreate"]
            if res["userErrors"] or not res.get("order"):
                error = _err_text(res["userErrors"])
        except ShopifyError as e:
            error = str(e)
        if error:
            logger.error("orderCreate failed for %s: %s", claimed["ref"], error)
            doc = await checkouts.find_one_and_update(
                {"ref": claimed["ref"]}, {"$set": {"shopify_state": "error", "shopify_error": error}}, return_document=True)
            await _alert(doc, error)
            return doc
        return await checkouts.find_one_and_update(
            {"ref": claimed["ref"]},
            {"$set": {"shopify_state": "done", "shopify_order_id": res["order"]["id"], "shopify_order_name": res["order"]["name"]}},
            return_document=True,
        )

    async def _alert(doc: dict, error: str):
        """The customer has paid but Shopify refused the order: the shop must not lose it."""
        if doc.get("alert_sent"):
            return
        s, c, a = doc["summary"], doc["customer"], doc["address"]
        rows = "".join(
            f"<li>{escape(l['productTitle'] or '')} {escape(l['variantTitle'] or '')} × {l['quantity']} — {l['price']} {doc['currency']}</li>"
            for l in s["lines"])
        html = (
            '<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
            "<p style=\"font-size:12px;letter-spacing:2px;color:#888\">WINORWINS — PAID ORDER NOT IN SHOPIFY</p>"
            f"<p>Payment {escape(doc['ref'])} was paid via Teya (transaction {escape(doc.get('teya_transaction_id') or '-')}), "
            f"but creating the Shopify order failed: <strong>{escape(error)}</strong>. Create it manually.</p>"
            f"<p><strong>Total:</strong> {doc['total']} {doc['currency']}<br><strong>Shipping:</strong> "
            f"{escape(s['shipping']['title'])} ({s['shipping']['amount']})<br><strong>Discount:</strong> {s['discount']}</p>"
            + (f"<p><strong>DPD Pickup:</strong> {escape(doc['pickup_point']['id'])} — {escape(doc['pickup_point']['name'])}, "
               f"{escape(doc['pickup_point']['street'])}, {escape(doc['pickup_point']['zip'])} {escape(doc['pickup_point']['city'])}</p>"
               if doc.get("pickup_point") else "")
            +
            f"<ul>{rows}</ul>"
            f"<p>{escape(c['first_name'])} {escape(c['last_name'])}<br>{escape(c['email'])}<br>{escape(c['phone'])}<br>"
            f"{escape(a['address1'])} {escape(a['address2'] or '')}<br>{escape(a['zip'])} {escape(a['city'])}, {escape(a['country'])}</p>"
            "</td></tr></table>"
        )
        try:
            await send_email(to=ORDER_ALERT_RECIPIENT, subject=f"WINORWINS — paid order {doc['ref']} needs manual entry", html=html)
            await checkouts.update_one({"ref": doc["ref"]}, {"$set": {"alert_sent": True}})
        except Exception:
            logger.exception("order alert e-mail failed for %s", doc["ref"])

    @router.get("/status/{ref}")
    async def status(ref: str):
        doc = await checkouts.find_one({"ref": ref})
        if not doc:
            raise HTTPException(status_code=404, detail="not_found")
        if doc["status"] == "pending":
            doc = await _confirm(doc)
        elif doc["status"] == "paid" and doc.get("shopify_state") == "error" and time.time() - doc.get("shopify_attempt_at", 0) > 300:
            doc = await _finalize(doc)
        return _public(doc)

    @router.post("/teya-webhook")
    async def teya_webhook(request: Request, background: BackgroundTasks):
        body = await request.body()
        if teya.webhook_key_configured() and not teya.verify_webhook(body, request.headers.get("x-teya-signature", "")):
            raise HTTPException(status_code=401, detail="invalid_signature")
        try:
            data = (await request.json()).get("data") or {}
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid_body")
        query = {"teya_session_id": data["session_id"]} if data.get("session_id") else {"ref": data.get("merchant_reference")}
        doc = await checkouts.find_one(query) if any(query.values()) else None
        if not doc:
            return {"status": "ignored"}
        # Answer within Teya's 30 s; the payment itself is re-checked with Teya before the order is created.
        background.add_task(_confirm, doc)
        return {"status": "accepted"}

    return router


def _err_text(errs) -> str:
    return "; ".join(f"{'.'.join(map(str, e.get('field') or []))}: {e.get('message', '')}" for e in errs) or "unknown"
