import concurrent.futures, subprocess, re, json, html
from pathlib import Path
root=Path(__file__).resolve().parent
base='https://getwholefit.com'
def get(path):
 try:return subprocess.check_output(['curl','-LsS','--max-time','25',base+path],text=True,stderr=subprocess.DEVNULL)
 except Exception:return ''
categories=['mens-outfit-ideas','mens-everyday-outfits','mens-smart-casual-outfits','mens-work-outfits','mens-weekend-outfits','mens-date-night-outfits','mens-workout-outfits']
records={}
def clean(value):
 return html.unescape(re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',value))).strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for category,page in zip(categories,pool.map(lambda category:get('/outfits/'+category),categories)):
  for card in re.findall(r'<article\b.*?</article>',page,re.S):
   link=re.search(r'href="(/outfit/[^"]+)"',card)
   heading=re.search(r'<h3[^>]*>(.*?)</h3>',card,re.S)
   if not link or not heading:continue
   url=base+link[1]
   title=clean(heading[1])
   scene=re.findall(r'<p[^>]*>(.*?)</p>',card,re.S)
   records.setdefault(url,{'url':url,'title':title,'summary':title,
    'listingContext':clean(scene[-1]) if scene else '',
    'sourceListing':base+'/outfits/'+category,'checkedAt':'2026-11-18','audience':'men',
    'sourceType':'third-party-generated-outfits','status':'listing-collected-detail-pending',
    'visualReview':'pending'})
(root/'men-cases.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2))
print('独立男装列表记录',len(records))
