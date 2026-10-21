// Rebuild everything (IR JSON -> compiled maps -> index.html), from this folder's parent:
//   cd ~/Projects/phongminhto-site/quy-trinh-mua-nha-texas && node src/gen-ir.mjs && node src/build-page.mjs
// gen-ir.mjs writes src/diagram-vi.json and src/diagram-en.json (the single source of copy).
// build-page.mjs compiles map-vi.html / map-en.html with ak:diagram, inlines the fragments (desktop map)
// and renders the vertical timeline (all screens) from the same JSON, then writes index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const CMP='/Users/macstudio36/Tools/trai-nghiem-claudekit/.claude/skills/ak-diagram/scripts/compiler/compile.mjs';
const standalone=l=>execFileSync('node',[CMP,'--input',D+'src/diagram-'+l+'.json','--format','html','--preset','classic','--theme','dark','--out',D+'map-'+l+'.html']);
const frag=l=>execFileSync('node',[CMP,'--input',D+'src/diagram-'+l+'.json','--format','fragment','--preset','classic','--theme','dark'],{encoding:'utf8',maxBuffer:1e8});
const HERE=dirname(fileURLToPath(import.meta.url));
const D=resolve(HERE,'..')+'/';
const B=resolve(HERE,'../..')+'/';
const vi=JSON.parse(readFileSync(D+'src/diagram-vi.json','utf8')), en=JSON.parse(readFileSync(D+'src/diagram-en.json','utf8'));
const blog=readFileSync(B+'blog/texas-homestead-exemption-guide-2026/index.html','utf8');
const header=blog.slice(blog.indexOf('  <!-- HEADER -->'), blog.indexOf('  <!-- MAIN ARTICLE -->'));
const footer=blog.slice(blog.indexOf('  <!-- LEGAL FOOTER -->'), blog.indexOf('  <!-- BILINGUAL SCRIPT -->'));
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const main=d=>d.steps.filter(s=>/^\d+\./.test(s.label));
const branch=d=>d.steps.filter(s=>!/^\d+\./.test(s.label));
const strip=s=>s.replace(/^\d+\.\s*/,'');
const olist=(d,l)=>`<ol class="space-y-3 list-none p-0">\n`+main(d).map((s,i)=>`<li id="${l==='vi'?'buoc':'step'}-${i+1}" class="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4"><h3 class="text-base font-bold text-white"><span class="text-amber-400 font-mono">${i+1}.</span> ${esc(strip(s.label))}</h3><p class="mt-1 text-sm text-slate-300 leading-relaxed">${esc(s.description)}</p></li>`).join('\n')+`\n</ol>`;
const blist=(d)=>`<ul class="space-y-3 list-none p-0">\n`+branch(d).filter(s=>s.kind==='decision'||true).map(s=>`<li class="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4"><h4 class="text-base font-bold text-white">${esc(s.label)}</h4><p class="mt-1 text-sm text-slate-300 leading-relaxed">${esc(s.description)}</p></li>`).join('\n')+`\n</ul>`;

const LANECOL={buyer:['bg-sky-400/15 text-sky-300 border-sky-400/40','bg-sky-400'],realtor:['bg-amber-400/15 text-amber-300 border-amber-400/40','bg-amber-400'],lender:['bg-emerald-400/15 text-emerald-300 border-emerald-400/40','bg-emerald-400'],title:['bg-violet-400/15 text-violet-300 border-violet-400/40','bg-violet-400'],insp:['bg-rose-400/15 text-rose-300 border-rose-400/40','bg-rose-400']};
const short=t=>t.replace(/\s*\(.*?\)\s*/g,' ').trim();
const first=t=>{const m=t.match(/^.*?[.!?](\s|$)/);return (m?m[0]:t).trim();};
const badge=(d,id)=>`<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${LANECOL[id][0]}">${esc(short(d.lanes.find(x=>x.id===id).label))}</span>`;
function timeline(d,l){
  const vi_=l==='vi', pre=vi_?'buoc':'step', byId=Object.fromEntries(d.steps.map(s=>[s.id,s]));
  const num={}; main(d).forEach((s,i)=>num[s.id]=i+1);
  const nm=id=>byId[id]&&num[id]?(vi_?'bước ':'step ')+num[id]:strip(byId[id].label);
  const decs=d.steps.filter(s=>s.kind==='decision'); const decNo=Object.fromEntries(decs.map((s,i)=>[s.id,i+1]));
  const L=vi_?{who:'Ai làm',branch:'Điểm rẽ nhánh',out:'Các hướng đi',more:'Chạm để xem chi tiết',chap:'Giai đoạn',side:'Nhánh phụ'}:{who:'Who',branch:'Decision point',out:'Possible outcomes',more:'Tap for details',chap:'Stage',side:'Side path'};
  const legend=`<div class="flex flex-wrap gap-2 mb-6" aria-label="${L.who}">`+d.lanes.map(x=>badge(d,x.id)).join('')+`</div>`;
  const chev=`<svg class="w-5 h-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 7.3a1 1 0 011.4 0L10 10.6l3.3-3.3a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z"/></svg>`;
  const card=(s)=>{
    const n=num[s.id], isDec=s.kind==='decision', side=!n&&!isDec;
    const outs=isDec?d.transitions.filter(t=>t.from===s.id).map(t=>`<li class="flex gap-2"><span class="text-amber-400" aria-hidden="true">→</span><span><strong class="text-white">${esc(t.label||'')}</strong> → ${t.to===d.transitions.find(x=>x.from===s.id&&x.to===t.to)?.to&&num[t.to]&&t.to!==s.id&&(num[t.to]<num[s.id])?(vi_?'quay lại ':'back to ')+nm(t.to):esc(strip(byId[t.to].label))+(num[t.to]?' ('+nm(t.to)+')':'')}</span></li>`).join(''):'';
    const sideBox=isDec?`<div class="mt-3 rounded-lg bg-slate-900/70 p-3"><p class="text-sm font-semibold text-fuchsia-300">${L.out}</p><ul class="mt-2 space-y-1.5 text-base text-slate-200 list-none p-0">${outs}</ul></div>`:'';
    const cls=isDec?'border-fuchsia-400/60 bg-fuchsia-400/10':side?'border-slate-700/60 bg-slate-800/20 border-dashed':'border-slate-700/80 bg-slate-800/50';
    const dot=n?`<span class="absolute -left-[43px] top-4 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900 ring-4 ring-slate-900">${n}</span>`:`<span class="absolute -left-[35px] top-6 h-3 w-3 rounded-full ${isDec?'bg-fuchsia-400':'bg-slate-500'} ring-4 ring-slate-900"></span>`;
    return `<li ${n?`id="${pre}-${n}" `:''}class="relative">${dot}<details class="group rounded-xl border ${cls}"><summary class="flex min-h-[56px] cursor-pointer list-none items-start gap-3 p-4"><span class="min-w-0 flex-1">${isDec?`<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-fuchsia-300">${L.branch} ${decNo[s.id]}/${decs.length}</span>`:side?`<span class="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">${L.side}</span>`:''}<span class="block text-lg font-bold leading-snug text-white break-words">${esc(strip(s.label))}</span><span class="mt-2 block">${badge(d,s.lane)}</span><span class="mt-2 block text-base leading-relaxed text-slate-300 group-open:hidden">${esc(first(s.description))}</span></span>${chev}</summary><div class="border-t border-slate-700/60 px-4 pb-4 pt-3 text-base leading-relaxed text-slate-200">${esc(s.description)}${sideBox}</div></details></li>`;
  };
  const used=new Set();
  const chapters=d.meta.views.map((v,ci)=>{
    const ids=d.steps.filter(s=>v.focus_nodes.includes(s.id)).map(s=>s.id);
    ids.forEach(i=>used.add(i));
    return `<section class="mt-10" aria-labelledby="ch-${l}-${ci+1}"><h3 id="ch-${l}-${ci+1}" class="mb-4 flex items-start gap-3 text-xl font-bold text-white"><span class="mt-0.5 shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-sm font-mono text-amber-300">${L.chap} ${ci+1}</span><span class="min-w-0 break-words">${esc(v.title)}</span></h3><ol class="relative ml-3.5 list-none space-y-4 border-l-2 border-slate-600 p-0 pl-7">${ids.map(i=>card(byId[i])).join('')}</ol></section>`;
  }).join('');
  if(used.size!==d.steps.length) throw new Error('timeline: steps missing from chapters');
  return legend+chapters;
}
const pills=(d,l)=>`<div class="flex flex-wrap gap-2 p-3 border-b border-slate-800 bg-slate-900/80">`+d.meta.views.map((v,i)=>`<button type="button" data-chapter="${i}" data-chapter-btn="${l}" onclick="goChapter('${l}',${i})" class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300 transition-all text-left"><span class="text-amber-400 font-mono">${i+1}</span> ${esc(v.title)}</button>`).join('')+`</div>`;
const FOCUS=Object.fromEntries(['vi','en'].map(l=>[l,(l==='vi'?vi:en).meta.views.map(v=>v.focus_nodes)]));
const TITLE='Quy Trình Mua Nhà Ở Texas: 14 Bước Từ Vay Đến Nhận Nhà';
const DESC='Hướng dẫn 14 bước mua nhà có sẵn ở Texas bằng khoản vay: pre-approval, offer, option period, appraisal, closing và nhận chìa khóa.';
const OGALT='Ngôi nhà rộng rãi ở Texas, minh họa cho quy trình mua nhà ở Texas';
console.log(TITLE.length, DESC.length);
const URL='https://phongminhto.com/quy-trinh-mua-nha-texas/', IMG='https://phongminhto.com/images/pillar2-texas-spacious-living.jpg';
const person={"@type":"Person","@id":"https://phongminhto.com/#person","name":"Phong Minh To","jobTitle":"Licensed Texas REALTOR®","licenseNumber":"TREC #843757","telephone":"+1-737-242-9999","url":"https://phongminhto.com"};
const howto={"@context":"https://schema.org","@type":"HowTo","name":"Quy trình mua nhà ở Texas (mua nhà có sẵn bằng khoản vay)","alternateName":"Texas home buying process (resale home with a mortgage)","description":DESC,"inLanguage":"vi","image":IMG,"datePublished":"2026-10-21","dateModified":"2026-10-21","author":person,
 "step":main(vi).map((s,i)=>({"@type":"HowToStep","position":i+1,"name":strip(s.label),"text":s.description,"url":URL+"#buoc-"+(i+1)}))};
const agent={"@context":"https://schema.org","@type":"RealEstateAgent","@id":"https://phongminhto.com/#agent","name":"Phong Minh To","url":"https://phongminhto.com","telephone":"+1-737-242-9999","image":"https://phongminhto.com/images/phong-to-headshot-round.webp","identifier":"TREC #843757","parentOrganization":{"@type":"Organization","name":"eXp Realty"},"areaServed":["Sherman, TX","Denison, TX","Dallas-Fort Worth, TX"],"knowsLanguage":["vi","en"]};
const crumbs={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://phongminhto.com/"},{"@type":"ListItem","position":2,"name":"Quy trình mua nhà ở Texas","item":URL}]};
const page=webpage=>({"@context":"https://schema.org","@type":"WebPage","@id":URL,"url":URL,"name":TITLE,"inLanguage":["vi","en"],"dateModified":"2026-10-21","author":person});
const ld=o=>`  <script type="application/ld+json">\n${JSON.stringify(o,null,2)}\n  </script>\n`;
const sources=[['TREC One to Four Family Residential Contract (Resale), Form 20-19','https://www.trec.texas.gov/forms/one-four-family-residential-contract-resale'],['TREC Third Party Financing Addendum, Form 40-11','https://www.trec.texas.gov/forms/third-party-financing-addendum-0'],['CFPB: Loan Estimate','https://www.consumerfinance.gov/ask-cfpb/what-is-a-loan-estimate-en-1995/'],['CFPB: Closing Disclosure','https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-i-do-not-get-a-closing-disclosure-three-days-before-my-mortgage-closing-en-1911'],['Texas Comptroller: Residence homestead exemption','https://comptroller.texas.gov/taxes/property-tax/exemptions/']];
const html=`<!DOCTYPE html>
<html lang="vi" data-lang="vi" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${TITLE}</title>
  <meta name="description" content="${DESC}">
  <link rel="canonical" href="${URL}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${URL}">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESC}">
  <meta property="og:image" content="${IMG}">
  <meta property="og:image:alt" content="${OGALT}">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:locale:alternate" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${URL}">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESC}">
  <meta name="twitter:image" content="${IMG}">
  <meta name="twitter:image:alt" content="${OGALT}">

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

${ld(howto)}${ld(agent)}${ld(crumbs)}
  <style>
    html[data-lang="en"] .lang-vi { display: none !important; }
    html[data-lang="vi"] .lang-en { display: none !important; }
  </style>
  <style>summary::-webkit-details-marker{display:none}
    header summary{min-width:44px;padding-left:0;padding-right:0;min-height:44px;display:flex;align-items:center;justify-content:center}
    #btn-en,#btn-vi{min-height:44px}
    @media (max-width:420px){header .gap-1\.5{gap:4px}header .px-2{padding-left:6px;padding-right:6px}}</style>
</head>
<body class="bg-slate-900 text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-900 min-h-screen flex flex-col justify-between">

${header}  <main class="flex-grow">
    <article class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav class="text-xs text-slate-400 mb-6 flex items-center gap-2">
        <a href="/" class="hover:text-amber-400">Home</a>
        <span>/</span>
        <span class="text-amber-400 truncate">quy-trinh-mua-nha-texas</span>
      </nav>

      <div class="flex items-center gap-3 text-xs text-slate-400 mb-4">
        <span class="px-2.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase">
          <span class="lang-vi" lang="vi">Hướng dẫn từng bước</span><span class="lang-en">Step-by-step guide</span>
        </span>
        <span>•</span>
        <time datetime="2026-10-21"><span class="lang-vi" lang="vi">Cập nhật 21/10/2026</span><span class="lang-en">Updated October 21, 2026</span></time>
      </div>

      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
        <span class="lang-vi" lang="vi">Quy trình mua nhà ở Texas</span>
        <span class="lang-en">The Texas home buying process</span>
      </h1>

      <div class="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed border-l-4 border-amber-400 pl-4 py-1 bg-slate-800/40 rounded-r-lg">
        <div class="lang-vi" lang="vi">Từ pre-approval đến lúc nhận chìa khóa, đây là các bước khi gia đình mua một căn nhà có sẵn (resale) ở Texas bằng khoản vay. Chạm vào từng bước để xem ai làm gì, từ lúc chuẩn bị tài chính đến khi nhận nhà.</div>
        <div class="lang-en">From pre-approval to receiving your keys, these are the steps when a family buys an existing (resale) home in Texas with a mortgage. Tap any step to see who does what, from preparing your finances to getting the home.</div>
      </div>


      <section class="mt-12 mx-auto max-w-3xl lg:max-w-none">
        <h2 class="text-2xl font-bold text-white">
          <span class="lang-vi" lang="vi">Từng bước, ai làm gì</span>
          <span class="lang-en">Step by step: who does what</span>
        </h2>
        <p class="mt-2 text-base text-slate-300">
          <span class="lang-vi" lang="vi">Chạm vào một bước để mở chi tiết. Màu của nhãn cho biết ai phụ trách bước đó.</span>
          <span class="lang-en">Tap a step to open the details. The badge color shows who handles it.</span>
        </p>
        <div class="lang-vi mt-6 lg:max-w-3xl" lang="vi">
${timeline(vi,"vi")}
        </div>
        <div class="lang-en mt-6 lg:max-w-3xl" lang="en">
${timeline(en,"en")}
        </div>
      </section>

      <section class="mt-12 text-sm text-slate-400">
        <h2 class="text-base font-bold text-slate-200">
          <span class="lang-vi" lang="vi">Nguồn chính thức</span><span class="lang-en">Official sources</span>
        </h2>
        <p class="mt-2">
          <span class="lang-vi" lang="vi">Các mốc thời gian lấy từ mẫu hợp đồng TREC 20-19 (hiệu lực 07/01/2026) và Third Party Financing Addendum 40-11. Số ngày option period và các điều khoản cụ thể do hai bên thỏa thuận trong từng hợp đồng. Đây là thông tin tham khảo chung, không phải tư vấn pháp lý.</span>
          <span class="lang-en">Deadlines come from TREC contract form 20-19 (effective 07/01/2026) and Third Party Financing Addendum 40-11. The option period length and other terms are negotiated in each contract. This is general information, not legal advice.</span>
        </p>
        <ul class="mt-3 space-y-1 list-disc pl-5">
${sources.map(([n,u])=>`          <li><a href="${u}" target="_blank" rel="noopener noreferrer" class="text-amber-400 underline hover:text-amber-300">${esc(n)}</a></li>`).join('\n')}
        </ul>
      </section>

      <section class="mt-12 text-center p-8 bg-slate-950 rounded-2xl border border-amber-400/30">
        <p class="text-lg text-slate-200">
          <span class="lang-vi" lang="vi">Có câu hỏi về bước nào? Phong sẵn lòng giải thích.</span>
          <span class="lang-en">Questions about any step? Phong is happy to explain.</span>
        </p>
        <div class="mt-5">
          <a href="https://tidycal.com/phongto" target="_blank" rel="noopener noreferrer" class="inline-block px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg">
            <span class="lang-vi" lang="vi">Đặt Lịch 1:1 TidyCal</span>
            <span class="lang-en">Schedule 1:1 Call</span>
          </a>
        </div>
      </section>

      <p class="mt-8 text-xs text-slate-400 font-mono">Phong Minh To · Licensed Texas REALTOR® · TREC #843757 · eXp Realty Texas</p>
    </article>
  </main>

${footer}${blog.slice(blog.indexOf('  <!-- BILINGUAL SCRIPT -->')).replace('</body>',`</body>`)}`;
writeFileSync(D+'index.html',html);

