#!/usr/bin/env python3
"""Register a new page on the site: sitemap.xml, a card at the top of /blog/, and a line in llms.txt.

Usage:
  python3 scripts/register-page.py --path /blog/my-post/ --tag "TAX OPTIMIZATION" \
      --title-vi "..." --title-en "..." --desc-vi "..." --desc-en "..." --llms "One-line English summary"
Idempotent: running it twice for the same path changes nothing.
Afterwards run scripts/build-markdown-twins.py so the .md twin and llms-full.txt include the page.
"""
import argparse
import datetime
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://phongminhto.com"
CARD_ANCHOR = "<!-- Article Card:"


def add_sitemap(url, today):
    p = ROOT / "sitemap.xml"
    s = p.read_text(encoding="utf-8")
    if f"<loc>{url}</loc>" in s:
        return False
    entry = f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n"
    p.write_text(s.replace("</urlset>", entry + "</urlset>"), encoding="utf-8")
    return True


def add_blog_card(a):
    p = ROOT / "blog" / "index.html"
    s = p.read_text(encoding="utf-8")
    if f'href="{a.path}"' in s:
        return False
    e = html.escape
    card = f"""{CARD_ANCHOR} {a.path.strip('/').split('/')[-1]} -->
          <article class="blog-card bg-slate-800/50 border border-slate-700/80 rounded-xl p-6 hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 text-xs text-amber-400/90 font-mono mb-2">
                <span>{e(a.tag)}</span> • <span>NEW</span>
              </div>
              <h4 class="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                <a href="{a.path}">
                  <span class="lang-vi" lang="vi">{e(a.title_vi)}</span>
                  <span class="lang-en">{e(a.title_en)}</span>
                </a>
              </h4>
              <p class="mt-3 text-sm text-slate-300 leading-relaxed">
                <span class="lang-vi" lang="vi">{e(a.desc_vi)}</span>
                <span class="lang-en">{e(a.desc_en)}</span>
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>By Phong Minh To</span>
              <a href="{a.path}" class="text-amber-400 font-bold hover:underline">Read →</a>
            </div>
          </article>

          """
    i = s.index(CARD_ANCHOR)
    p.write_text(s[:i] + card + s[i:], encoding="utf-8")
    return True


def add_llms(url, a):
    p = ROOT / "llms.txt"
    s = p.read_text(encoding="utf-8")
    if url in s:
        return False
    line = f"- [{a.title_en}]({url}): {a.llms}\n"
    p.write_text(s.replace("\n## Site\n", line + "\n## Site\n", 1), encoding="utf-8")
    return True


def main():
    ap = argparse.ArgumentParser()
    for k in ["path", "tag", "title-vi", "title-en", "desc-vi", "desc-en", "llms"]:
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    if not (a.path.startswith("/") and a.path.endswith("/")):
        raise SystemExit("--path must start and end with /")
    if not (ROOT / a.path.strip("/") / "index.html").exists():
        raise SystemExit(f"page not found: {a.path}index.html")
    url = ORIGIN + a.path
    today = datetime.date.today().isoformat()
    print("sitemap", add_sitemap(url, today), "| blog card", add_blog_card(a), "| llms.txt", add_llms(url, a))


if __name__ == "__main__":
    main()
