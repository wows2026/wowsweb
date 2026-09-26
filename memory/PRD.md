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

## Backlog
- P0: Real ambassador video content for social section (user to supply)
- P1: Full e-commerce (product pages, cart, checkout) — products currently MOCKED (static data)
- P1: Legal pages (T&C, Privacy Policy) — footer links currently placeholders
- P2: Product detail pages, size guide, lookbook page
- P2: Cookie consent banner
- P2: Newsletter welcome email (Resend integration)
