"""Build auditable co-occurrence features from collected case descriptions."""
import json,re
from pathlib import Path
root=Path(__file__).parent
women=[record for record in json.loads((root/'cases.json').read_text()) if record.get('audience') != 'men']
men=json.loads((root/'men-cases.json').read_text()) if (root/'men-cases.json').exists() else []
records=list({record['url']: record for record in women+men}.values())
terms={
 'shirt':r'\bshirts?\b|\bblouse',
 'tee':r'\bt-?shirt|\btee\b',
 'knit':r'\bknit|\bsweater|\bcardigan',
 'blazer':r'\bblazer',
 'shell':r'\btechnical jacket|\bshell jacket|\bwindbreaker',
 'denim':r'\bjeans|\bdenim',
 'trousers':r'\btrousers|\bpants',
 'skirt':r'\bskirt',
 'dress':r'\b(?:mini |midi |maxi |slip |shift |wrap )dress\b',
 'sneakers':r'\bsneakers?|\btrainers?',
 'loafers':r'\bloafers?',
 'boots':r'\bboots?',
 'flats':r'\bflats?|\bballet',
}
pairs={}
for record in records:
 # Titles describe the pictured combination. Summaries may mention alternatives.
 text=record['title'].lower()
 tokens=[key for key,pattern in terms.items() if re.search(pattern,text)]
 record['features']=tokens
 record.setdefault('visualReview','pending')
 record['textAudit'] = {
  'method': 'title-feature-check',
  'status': 'usable-for-cooccurrence' if any(item in tokens for item in ['shirt','tee','knit','blazer','shell']) and any(item in tokens for item in ['denim','trousers','skirt','dress']) else 'insufficient-features',
 }
 if record['textAudit']['status'] != 'usable-for-cooccurrence':
  continue
 for upper in ['shirt','tee','knit','blazer','shell']:
  for lower in ['denim','trousers','skirt','dress']:
   if upper in tokens and lower in tokens:
    key=upper+'/'+lower
    pairs.setdefault(key,[]).append(record['url'])
output=[{'pair':pair,'count':len(urls),'sources':urls[:3]} for pair,urls in pairs.items()]
(root/'cases.json').write_text(json.dumps(women,ensure_ascii=False,indent=2))
if men:
 (root/'men-cases.json').write_text(json.dumps(men,ensure_ascii=False,indent=2))
(root.parent/'src/research-rules.json').write_text(json.dumps(output,ensure_ascii=False,indent=2))
report={'target':500,'collected':len(records),'uniqueUrls':len({r['url'] for r in records}),
 'textFeatureUsable':sum(r.get('textAudit',{}).get('status')=='usable-for-cooccurrence' for r in records),
 'textFeatureInsufficient':sum(r.get('textAudit',{}).get('status')=='insufficient-features' for r in records),
 'visualReviewed':sum(r.get('visualReview')=='approved' for r in records),'womenTextRecords':len(women),'menListingRecords':len(men),'womenCollected':len(women),'menCollected':len(men),'coverage':'男女第三方案例文字已采集。逐图审核、功能外套覆盖和真实用户效果仍待验证。',
 'featureMethod':'根据组合标题提取单品共现，只用于软排序，不代表穿搭质量评分。',
 'sources':['https://style2bloom.com','https://getwholefit.com'],'date':'2026-11-18'}
(root/'progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
