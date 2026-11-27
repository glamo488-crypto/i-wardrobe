import subprocess,urllib.request,concurrent.futures,re,json,time,html
from pathlib import Path
base='https://style2bloom.com'
dest=Path(__file__).resolve().parent
def get(path):
    try:
        return subprocess.check_output(['curl','-LsS','--max-time','25',base+path],text=True,stderr=subprocess.DEVNULL)
    except Exception:return ''

categories=['work','everyday','going-out','business-casual','date-night','weekend','vacation','brunch','dinner','party','summer','autumn','winter','spring']
directory=Path('/tmp/yiku-library.html').read_text()
categories=list(dict.fromkeys(categories+re.findall(r'href="/outfits/([^"/]+)"',directory)))
sitemap=get('/sitemap.xml')
urls=set(re.findall(r'<loc>https://style2bloom.com(/look/[^<]+)</loc>',sitemap))
if not urls:
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for page in pool.map(lambda c:get('/outfits/'+c),categories):
            urls.update(re.findall(r'href="(/look/[^"]+)"',page))
print('Discovered',len(urls),flush=True)
(dest/'discovered.json').write_text(json.dumps(sorted(urls),indent=2))
def parse(path):
    page=get(path)
    if not page:return None
    title=re.search(r'<h1[^>]*>(.*?)</h1>',page,re.S)
    descriptions=re.findall(r'<meta[^>]*name="description"[^>]*content="([^"]+)"',page)
    structured=[]
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',page,re.S):
        try:structured.append(json.loads(raw))
        except ValueError:pass
    headings=re.findall(r'<h[23][^>]*>(.*?)</h[23]>',page,re.S)
    text=lambda value:html.unescape(re.sub('<[^>]+>',' ',value)).strip()
    return {'url':base+path,'checkedAt':'2026-11-18','title':text(title[1]) if title else path.rsplit('/',1)[-1],
      'summary':html.unescape(descriptions[0]) if descriptions else '',
      'sections':[text(h) for h in headings], 'structured':structured,
      'status':'text-collected-awaiting-visual-review','sourceType':'third-party-editorial'}
records=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(parse,sorted(urls)[:500]):
        if result:records.append(result)
        if len(records)%25==0:
            (dest/'cases.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
            print('Collected',len(records),flush=True)
(dest/'cases.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
print('Finished',len(records),flush=True)
