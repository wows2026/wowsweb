# WINORWINS — PRD

## Original Problem Statement
"udělej mi web ve stylu representclo.com, nocta.com, mertra.com s animacemi od TEYA.COM britské verzi ... prostě jednoduše .. udělej zatím jen landing page. nazev webu winorwins .. clothing brand"

User choices: light minimalist design with a few yellow details; hero section with VIDEO; marquee with logo scrolling RIGHT under hero; featured products like NOCTA; newsletter; social media placeholders (ambassador videos later); footer with T&C, privacy policy, Instagram/TikTok/Facebook/contact; English with Czech language toggle.

## User Personas
- Streetwear customer (18-35) discovering the brand via Instagram/TikTok, wants drop info and newsletter early access
- Brand owner (Czech) who will later add ambassador videos and real shop functionality

## Architecture
- Frontend: React 19 + Tailwind + framer-motion + Lenis (smooth scroll), shadcn/sonner toasts
- Backend: FastAPI + MongoDB (motor), /api prefix
- i18n: custom React context (EN/CZ) in /app/frontend/src/i18n.js
- Fonts: Anton (display), Archivo (body), JetBrains Mono (labels)
- Colors: #FAF9F6 paper, #0D0D0D ink, #FFE600 electric yellow

## Core Requirements (static)
1. Full-screen video hero with kinetic masked line-by-line headline reveal
2. Marquee scrolling RIGHT directly under hero
3. NOCTA-style featured products grid (4 products, hover image flip)
4. Newsletter signup (DB-backed)
5. Social media placeholder tiles (IG/TikTok/FB)
6. Footer: legal links, customer care, socials, contact email
7. EN/CZ language toggle
8. Light minimalist theme with yellow accents

## Implemented (2026-09-26)
- Landing page: Hero (video + parallax + masked reveal "NO LOSSES. ONLY PROGRESS."), right-scrolling marquee, Featured products (DROP 001, 4 products w/ badges, GSM specs, hover flip), Lookbook editorial (parallax middle column), Social placeholders ("COMING SOON"), Newsletter (yellow section, POST /api/newsletter, duplicate = 409, invalid = 422), Footer (giant wordmark, legal/care/socials columns)
- Original SVG logo mark (W monogram + yellow square) + favicon.svg
- Lenis smooth scrolling, film grain overlay, staggered reveals, custom scrollbar selection color
- EN/CZ toggle in navbar
- Backend: POST/GET /api/newsletter with email validation + duplicate check

## Verification Status
- Backend: health, subscribe, duplicate (409), invalid (422) — all curl-verified
- Frontend: screenshots at 375/768/1366, masked titles, CZ toggle, newsletter toast — verified
- Hero video: URL serves HTTP 200 video/mp4 (curl); headless test browser aborts media loads, poster fallback confirmed visually. Real-browser playback not verifiable from this environment.

## Iteration 2026-09-26 (user feedback round 1)
- Marquee: replaced text items with the user's own brand logo (white-on-transparent PNG derived from uploaded webp, stored in /app/frontend/public/brand-logo-white.png), scrolling right with yellow diamond separators
- Products: compact 4-across Represent-style cards (name, price, colorway, colour dots, hover flip + "+" button)
- Social section renamed to "OUR SOCIALS" / "NAŠE SOCIÁLNÍ SÍTĚ", tiles are vertical video placeholders with play buttons ("VIDEO SOON") waiting for ambassador videos from user
- Hero quote replaced with "THERE'S NO LOSING. ONLY LEARNING OR Winning" — smaller, left-aligned; "Winning" in Pinyon Script with animated hand-drawn yellow circle; quote stays English in both languages
- Typography switched from Anton/Archivo to Helvetica Now Display (cdnfonts) + Pinyon Script accent

## Iteration 2026-09-26 (user feedback round 2)
- ALL text now Helvetica Now Display (including former mono labels/nav/buttons/toasts); Pinyon Script remains ONLY on the hero "Winning" word
- User supplied final logos: 15.webp = main logo (W + WINORWINS wordmark), 23.webp = W mark for marquee (both white-on-transparent; black versions generated via PIL)
- Main logo placed: navbar (black), footer (white), favicon (W mark on paper bg, favicon.png)
- Marquee: white W mark (logo-mark-white.png) repeating rightward, yellow diamond separators REMOVED per user request

## Shopify Integration (2026-09-26)
Architecture: Emergent React frontend → FastAPI backend proxy → Shopify Storefront API (products/cart/checkout) + Shopify Admin API (newsletter customers). Teya = payment provider inside Shopify Checkout (no code on our side).
- Credentials in /app/backend/.env ONLY: SHOPIFY_SHOP=c007fn-qn, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (Admin via Client Credentials Grant, token cached + auto-refresh in shopify_client.py), SHOPIFY_STOREFRONT_TOKEN, SHOPIFY_API_VERSION=2026-01
- Backend endpoints: GET /api/products, GET/POST /api/cart, POST /api/cart/lines, PATCH /api/cart/lines, POST /api/cart/lines/remove, POST /api/cart/discount, POST /api/newsletter (creates Shopify customer with SINGLE_OPT_IN marketing consent; duplicate → 409)
- Storefront API quirks: Cart has NO completedAt field in 2026-01 (completed cart returns null → frontend clears stored cart on 404); cartDiscountCodesUpdate variable must be [String!]!
- Frontend: /src/shop.js CartProvider (cart id in localStorage), CartDrawer.jsx (slide-over in existing design), Navbar cart icon + badge, FeaturedProducts fetches live Shopify products (same card design, "+" quick-add, variant picker overlay, SOLD OUT badge, compare-at strikethrough, skeleton/error/empty states)
- Prices/inventory always validated server-side via Shopify — frontend never trusts its own data
- Verified: products list (2 test products), cart create/update/remove, discount code applicability, checkoutUrl, newsletter subscribe + 409 duplicate, E2E screenshots desktop+mobile

## Multi-page + Product Detail (2026-09-26, user feedback round 4)
- react-router-dom routes: / (landing), /collection, /product/:handle, /lookbook, /socials, /contact; ScrollToTop works with Lenis; navbar uses Link navigation
- Product detail page per user reference: info LEFT (back link, title, description), image CENTER (+thumbnails), price + option selectors + ADD TO CART RIGHT; sold-out/disabled variants; data from Shopify (backend products query now includes description + allImages)
- ProductCard extracted (shared by landing FeaturedProducts + CollectionPage); card click navigates to product page, "+" = quick add
- Marquee: YELLOW background with black logo marks (was black bg)
- Footer: YELLOW background, black text/wordmark, yellow dot removed (was dark)

## Iteration 2026-09-26 (user feedback round 5)
- Footer reverted to BLACK background; only the giant WINORWINS wordmark is yellow
- Product page: left info block and right buy box (price + ADD TO CART) are now vertically centered against the product image; grid rows min-height = viewport minus nav

## Lock / gate page (2026-09-29, user feedback round 6)
- Full-screen lock overlay: yellow bg, black main logo centered, "DROP 001 — COMING SOON", email capture (reuses /api/newsletter → Shopify customer), "ENTER PASSWORD" bottom-right expands password field
- Backend: POST /api/auth/unlock validates against SITE_PASSWORD env (current: WINNER2026, see /app/memory/test_credentials.md); wrong → 401
- Unlock persists via localStorage wino_unlocked; lock slides up on success; Lenis scroll stopped while locked
- Lock page additions: pill email form (black border/placeholder/button), "JOIN THE WAITLIST" headline, live countdown timer (DROP_DATE in LockScreen.jsx = **2026-11-11 11:11 CET**, user-confirmed)
- Navbar menu simplified per user: HOME (/) + SHOP (/collection) + CONTACT (/contact); LOOKBOOK and SOCIALS links removed (pages still exist at /lookbook, /socials)

## Iteration 2026-09-26 (user feedback round 3)
- Hero: quote enlarged (text-6xl desktop), removed "DROP 001 — LIVE NOW" eyebrow, removed subtext, meta bar now shows only centered SCROLL indicator (PRG—LDN—TYO and 500 GSM removed)
- Removed eyebrows: FEATURED // DROP 001 (products), CAMPAIGN 01 (lookbook), COMMUNITY (social), // NEWSLETTER (newsletter)
- Hero video replaced with clothing showcase: mixkit 50639 (fashion studio photoshoot with garment rack), verified HTTP 200 video/mp4; poster = extracted video frame hosted locally at /public/hero-poster.jpg

## Backlog
- P0: Real ambassador video content for social section (user to supply)
- P1: Full e-commerce (product pages, cart, checkout) — products currently MOCKED (static data)
- P1: Legal pages (T&C, Privacy Policy) — footer links currently placeholders
- P2: Product detail pages, size guide, lookbook page
- P2: Cookie consent banner
- P2: Newsletter welcome email (Resend integration)
