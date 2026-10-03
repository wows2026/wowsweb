import json
import re
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

doc = Document("/app/scripts/pravni.docx")


def iter_blocks(parent):
    for child in parent.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield ("p", Paragraph(child, parent))
        elif child.tag == qn("w:tbl"):
            yield ("tbl", Table(child, parent))


raw = []
for kind, block in iter_blocks(doc):
    if kind == "p":
        text = block.text.strip()
        if not text:
            continue
        style = block.style.name if block.style else ""
        raw.append((style, text))
    else:
        rows = []
        for row in block.rows:
            rows.append([cell.text.strip() for cell in row.cells])
        raw.append(("table", rows))

# --- split into documents by Heading 1 ---
SLUGS = {"1.": "terms", "2.": "refund", "3.": "shipping", "4.": "privacy", "5.": "cookies"}
docs = {}
current = None
for style, text in raw:
    if style == "Heading 1":
        if "Poznámky" in text:
            current = None
            continue
        slug = SLUGS.get(text[:2])
        current = slug
        if slug:
            docs[slug] = []
        continue
    if current:
        docs[current].append((style, text))

EXACT = {
    "[NÁZEV ZNAČKY]": "WINORWINS",
    "[www.vaseznacka.cz]": "winorwins.co",
    "[info@vaseznacka.cz]": "info@winorwins.com",
    "[vraceni@vaseznacka.cz]": "info@winorwins.com",
    "[reklamace@vaseznacka.cz]": "info@winorwins.com",
    "[gdpr@vaseznacka.cz]": "info@winorwins.com",
    "[DD. MM. RRRR]": "03. 10. 2026",
    ", telefon [+420 000 000 000] (dostupnost [po–pá 9–17 h])": "",
    ", [+420 000 000 000]": "",
    "[Chudenická 1059/30, 102 00 Praha 10 / adresa skladu]": "Chudenická 1059/30, 102 00 Praha 10",
    "[adresa pro vracení]": "Chudenická 1059/30, 102 00 Praha 10",
    "[online platební kartou / rychlým bankovním převodem přes platební bránu [Comgate / GoPay / Stripe] / Apple Pay a Google Pay / bankovním převodem předem na účet uvedený v potvrzení objednávky / na dobírku (poplatek [00] Kč)]": "online platební kartou a dalšími způsoby přes zabezpečenou platební bránu (Teya / Shopify Payments)",
    "[Comgate / GoPay / Stripe]": "Teya (platební brána)",
    "[Shoptet / Shopify / WooCommerce + hosting]": "Shopify",
    "[Zásilkovna, PPL, DPD, Česká pošta]": "Zásilkovna, Česká pošta",
    "[varianta: Vrácení v rámci ČR přes [Zásilkovnu] hradíme my / nabízíme zpětný štítek za [00] Kč, který odečteme z vracené částky]": "",
    "[varianta: vrácení v ČR přes [Zásilkovnu] je zdarma / zpětný štítek za [00] Kč odečteme z vracené částky]": "",
    "[např. spodní prádlo, plavky, ponožky – platí jen tehdy, pokud toto zboží skutečně dodáváte v hygienicky zapečetěném obalu]": "",
    "[vrácení zboží postupem podle tohoto článku a nová objednávka / výměna přes formulář na [odkaz], poštovné za novou zásilku [hradíme / hradí kupující]]": "vrácením zboží postupem podle tohoto článku a novou objednávkou",
    "[Ceny v e-shopu nejsou personalizovány na základě automatizovaného rozhodování. / Cena byla personalizována na základě automatizovaného rozhodování. – vyberte pravdivou variantu]": "Ceny v e-shopu nejsou personalizovány na základě automatizovaného rozhodování.",
    "[a slovenském / anglickém jazyce]": "a anglickém jazyce",
    " nebo vyplňte [reklamační formulář na odkazu]": "",
    "Dobírka: příplatek [39 Kč]. [Dobírku nenabízíme u objednávek nad [5 000] Kč.]": "Dobírka: příplatek 39 Kč.",
    "[nedoručujeme / doručujeme po individuální dohodě; clo a daně země určení hradí kupující]": "nedoručujeme",
    "[Popište svůj proces, např.: Výměnu vyřídíte přes formulář na [odkaz]. Novou velikost odešleme, jakmile nám dorazí původní kus. Poštovné za novou zásilku [hradíme my / hradíte vy]. Není-li velikost skladem, vrátíme peníze.]": "Výměnu velikosti vyřídíte e-mailem na info@winorwins.com — uveďte číslo objednávky a požadovanou velikost. Novou velikost odešleme, jakmile nám dorazí původní kus. Není-li velikost skladem, vrátíme peníze.",
}

DROP_IF_CONTAINS = [
    "Spodní prádlo, plavky a ponožky v hygienicky zapečetěném obalu",
    "Je-li u zboží uvedena delší záruka za jakost",
    "Recenze zboží může vložit pouze zákazník",
    "online formulářem / tlačítkem",
    "Volitelně: prodloužená lhůta na vrácení",
    "Nad rámec zákona umožňujeme vrátit zboží",
]


def clean(text):
    for k, v in EXACT.items():
        text = text.replace(k, v)
    prev = None
    while prev != text:
        prev = text
        text = re.sub(r"\[([^\[\]]*?)\]", lambda m: m.group(1).split(" / ")[0].strip(), text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\s+([.,;:])", r"\1", text)
    return text.strip()


TITLES = {
    "terms": "Obchodní podmínky",
    "refund": "Vrácení zboží a reklamace",
    "shipping": "Doprava a doručení",
    "privacy": "Ochrana osobních údajů",
    "cookies": "Cookies",
}

STYLE_MAP = {"Heading 2": "h2", "Heading 3": "h3", "Compact": "li", "table": "table"}

out = {}
for slug, blocks in docs.items():
    content = []
    for style, text in blocks:
        if style == "table":
            rows = [[clean(c) for c in row] for row in text]
            content.append({"type": "table", "rows": rows})
            continue
        if any(d in text for d in DROP_IF_CONTAINS):
            continue
        t = clean(text)
        if not t:
            continue
        content.append({"type": STYLE_MAP.get(style, "p"), "text": t})
    out[slug] = {"title": TITLES[slug], "content": content}

js = "export const LEGAL_DOCS = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n"
with open("/app/frontend/src/legalContent.js", "w") as f:
    f.write(js)

for slug, d in out.items():
    print(slug, "->", len(d["content"]), "blocks,", sum(len(json.dumps(b, ensure_ascii=False)) for b in d["content"]), "chars")
leftover = [b["text"] for d in out.values() for b in d["content"] if b["type"] != "table" and "[" in b["text"]]
print("leftover brackets:", len(leftover))
for l in leftover[:10]:
    print("  !!", l[:140])
