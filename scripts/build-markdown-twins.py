#!/usr/bin/env python3
"""Build markdown twins for AI readers and mark Vietnamese blocks.

For every page listed in sitemap.xml this script:
  - writes <page-dir>/index.html.md (English section, then Vietnamese section),
  - adds <link rel="alternate" type="text/markdown"> to the page head,
  - adds lang="vi" to every element carrying the .lang-vi class,
and finally concatenates all twins into /llms-full.txt.

Re-run after editing page content:  python3 scripts/build-markdown-twins.py
Needs: pip install html2text beautifulsoup4
"""
import copy
import re
from pathlib import Path

import html2text
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://phongminhto.com"
DROP = ["script", "style", "noscript", "header", "footer", "nav", "form", "svg", "iframe", "button"]


def page_files():
    urls = re.findall(r"<loc>(.*?)</loc>", (ROOT / "sitemap.xml").read_text(encoding="utf-8"))
    for url in urls:
        rel = url.replace(ORIGIN, "").strip("/")
        html = ROOT / rel / "index.html" if rel else ROOT / "index.html"
        if html.exists():
            yield url if url.endswith("/") else url + "/", html


def to_markdown(soup, hide_class):
    body = copy.copy(soup.body)
    for tag in body.find_all(DROP):
        tag.decompose()
    for tag in body.select(f".{hide_class}"):
        tag.decompose()
    conv = html2text.HTML2Text()
    conv.body_width = 0
    conv.ignore_images = True
    conv.ignore_emphasis = False
    text = conv.handle(str(body))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def mark_vietnamese(html):
    def add_lang(m):
        tag = m.group(0)
        return tag if " lang=" in tag else tag[:-1] + ' lang="vi">'
    return re.sub(r'<[a-zA-Z][^<>]*\bclass="[^"]*\blang-vi\b[^"]*"[^<>]*>', add_lang, html)


def main():
    twins = []
    for url, html_path in page_files():
        html = html_path.read_text(encoding="utf-8")
        soup = BeautifulSoup(html, "html.parser")
        title = (soup.title.string or "").strip() if soup.title else url
        desc = soup.find("meta", attrs={"name": "description"})
        md = [f"# {title}", "", f"Source: {url}"]
        if desc and desc.get("content"):
            md += ["", f"> {desc['content'].strip()}"]
        md += ["", "## English", "", to_markdown(soup, "lang-vi"), "", "## Tiếng Việt", "", to_markdown(soup, "lang-en"), ""]
        twin_path = html_path.parent / "index.html.md"
        twin_path.write_text("\n".join(md), encoding="utf-8")
        twin_url = "/" + str(twin_path.relative_to(ROOT))
        if 'type="text/markdown"' not in html:
            html = html.replace("</head>", f'  <link rel="alternate" type="text/markdown" href="{twin_url}">\n</head>', 1)
        html = mark_vietnamese(html)
        html_path.write_text(html, encoding="utf-8")
        twins.append("\n".join(md))
        print(f"{twin_url}  {len(md[-4]) + len(md[-2])} chars")
    (ROOT / "llms-full.txt").write_text("\n\n---\n\n".join(twins) + "\n", encoding="utf-8")
    print(f"llms-full.txt  {len(twins)} pages")


if __name__ == "__main__":
    main()
