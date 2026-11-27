import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { categories, colorFamily, garmentName, similarGarment, suggestedGarmentName, tagFields, type GarmentTags, createLooks, missingCategories, reviseLook, seed, statuses, type GarmentStatus, type Garment, type Category, type Look, type SavedLook, wearStates, type WearState } from './wardrobe'
import { garmentPhoto, persist, restore } from './storage'
import { Inspiration } from './inspiration'
import { Account, Admin, EmailAction, api, type User } from './accounts'
import './style.css'

const sections = ['灵感', '开始穿搭', '我的衣库'] as const
type Section = typeof sections[number]
const shapes = { 裤装: 'pants', 上衣: 'top', 外套: 'jacket', 鞋履: 'shoe' }

const photos = ['portrait', 'green', 'olive', 'cream', 'wine', 'ink', 'loafers', 'sneakers', 'jacket']

function Photo({ name }: { name: string }) {
  const index = photos.indexOf(name)
  return <div className="photo" aria-hidden="true" style={{
    backgroundPosition: `${index % 3 * 50}% ${Math.floor(index / 3) * 50}%`,
  }} />
}

function Piece({ item }: { item: Garment }) {
  if (item.photo) return <div className="piece"><img className="uploaded-photo" src={item.photo} alt="" /></div>
  if (photos.includes(item.id)) return <div className="piece"><Photo name={item.id} /></div>
  return <div className="piece" aria-hidden="true"><div className={'fabric ' + shapes[item.category]} style={{ backgroundColor: item.color }} /></div>
}

const outfitOrder: Category[] = ['外套', '上衣', '裤装', '鞋履']

function OutfitBoard({ items }: { items: Garment[] }) {
  const ordered = [...items].sort((left, right) =>
    outfitOrder.indexOf(left.category) - outfitOrder.indexOf(right.category))
  return <figure className="outfit-board">
    <div className="outfit-flatlay" role="img" aria-label={ordered.map(garmentName).join('、')}>
      {ordered.map(item => <div key={item.id} className={'outfit-item outfit-' + shapes[item.category]}>
        <Piece item={item} />
      </div>)}
    </div>
    <figcaption>单品拼图</figcaption>
  </figure>
}

function App() {
  const [user,setUser]=useState<User|null>(null)
  const [accountMessage,setAccountMessage]=useState('')
  const version=useRef(0)
  async function changeUser(next:User|null) {
    if(next){
      const result=await api('/api/account/wardrobe')
      version.current=result.version
      setClothes(result.data.clothes)
      setSaved(result.data.looks)
      setAccountMessage('账号衣库已加载。修改后点「保存到账号」。')
    } else {
      setClothes(seed)
      setSaved([])
      setAccountMessage('已退出登录')
    }
    setUser(next)
    setLooks(null)
    setEditor(null)
  }
  useEffect(()=>{api('/api/account/me').then(result=>result.user&&changeUser(result.user)).catch(()=>setAccountMessage('账号服务暂不可用'))},[])
  async function saveAccount(){
    try{
      const result=await api('/api/account/wardrobe','PUT',{data:{clothes,looks:saved},version:version.current})
      version.current=result.version
      setAccountMessage('已保存到账号')
    }catch(error){setAccountMessage((error as Error).message)}
  }

  const [section, setSection] = useState<Section>('灵感')
  const [clothes, setClothes] = useState(() => restore('clothes', seed))
  const [saved, setSaved] = useState(() => restore<SavedLook[]>('looks', []))
  const [mode, setMode] = useState<'单品搭配' | '衣橱搭配'>('衣橱搭配')
  const [styleUpload, setStyleUpload] = useState(false)
  const [singleFile, setSingleFile] = useState<File | null>(null)
  const [singleCategory, setSingleCategory] = useState<Category>('上衣')
  const [singleColor, setSingleColor] = useState('#55565a')
  const [feedback, setFeedback] = useState(() => restore<Record<string, string>>('outfit-feedback', {}))
  const [referenceLooks, setReferenceLooks] = useState<Look[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [anchor, setAnchor] = useState<Garment>(seed[0])
  const [round, setRound] = useState(0)
  const [locks, setLocks] = useState<Garment[]>([])
  const [looks, setLooks] = useState<Look[] | null>(null)
  const [tab, setTab] = useState<'衣物' | '收藏 Look'>('衣物')
  const [filter, setFilter] = useState<Category | '全部'>('全部')
  const [editor, setEditor] = useState<Garment | 'new' | null>(null)
  const [garmentQuery, setGarmentQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<GarmentStatus | '全部'>('全部')
  const [busy, setBusy] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const hasPersonalClothes = clothes.some(item => !seed.some(sample => sample.id === item.id) || item.photo)
  const available = clothes.filter(item => (!item.status || item.status === '可穿') &&
    (!hasPersonalClothes || item.photo || !seed.some(sample => sample.id === item.id)))
  const recent = clothes.filter(item => item.photo).reverse()
    .sort((left, right) => (right.uploadedAt ?? '').localeCompare(left.uploadedAt ?? '')).slice(0, 8)
  const selected = available.find(item => item.id === anchor.id) ?? available[0]
  const [lookEditor, setLookEditor] = useState<string | null>(null)
  const [lookSearch, setLookSearch] = useState('')
  const [wearFilter, setWearFilter] = useState('')
  const [notice, setNotice] = useState('')

  function navigate(next: Section) {
    setSection(next)
    if (next !== '开始穿搭') setStyleUpload(false)
    setNotice('')
    window.scrollTo(0, 0)
  }

  function pick(item = seed[0]) {
    setMode('衣橱搭配')
    setAnchor(item)
    setLocks([])
    setRound(0)
    setLooks(null)
  }

  function update<T>(key: string, value: T, apply: (value: T) => void) {
    try {
      if (!user) persist(key, value)
      if (user && (key === 'clothes' || key === 'looks')) setAccountMessage('有未保存的修改，请点「保存到账号」。')
      apply(value)
      return true
    } catch {
      setNotice('浏览器无法保存，请检查本地存储权限或空间。')
      return false
    }
  }

  function toggle(look: Look) {
    const exists = saved.some(item => item.id === look.id)
    const record: SavedLook = { ...look, createdAt: new Date().toISOString() }
    if (update('looks', exists ? saved.filter(item => item.id !== look.id) : [...saved, record], setSaved)) {
      setNotice(exists ? '已取消收藏' : '已收藏到我的衣库')
    }
  }

  function saveLookDetails(event: FormEvent<HTMLFormElement>, look: SavedLook) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next: SavedLook = {
      ...look,
      name: String(form.get('name')).trim(),
      scene: String(form.get('scene')).trim(),
      season: String(form.get('season')).trim(),
      wear: form.get('wear') as WearState,
    }
    if (update('looks', saved.map(item => item.id === look.id ? next : item), setSaved)) {
      setLookEditor(null)
      setNotice('已更新 Look')
    }
  }

  function savedCards() {
    const query = lookSearch.trim().toLowerCase()
    const filtered = saved.filter(look =>
      (!wearFilter || (look.wear ?? '未安排') === wearFilter) &&
      [look.name, look.title, look.scene, look.season, ...look.items.map(garmentName)]
        .some(value => value?.toLowerCase().includes(query)))
    return <>
      <div className="look-filters">
        <label>搜索 Look<input type="search" value={lookSearch} onChange={event => setLookSearch(event.target.value)} placeholder="名称、单品、场景或季节" /></label>
        <label>穿着状态<select aria-label="穿着状态" value={wearFilter} onChange={event => setWearFilter(event.target.value)}><option value="">全部状态</option>{wearStates.map(state => <option key={state}>{state}</option>)}</select></label>
      </div>
      {filtered.length === 0 && <p>{saved.length ? '没有符合条件的 Look。' : '还没有收藏的 Look。'}</p>}
      <div className="looks">{filtered.map(look => {
        const current = look.items.map(item => available.find(entry => entry.id === item.id))
        const missing = look.items.filter((_, index) => !current[index])
        const reusable = current.filter((item): item is Garment => Boolean(item))
        return <article className="look" key={look.id}>
          <OutfitBoard items={look.items} />
          <div className="look-body">
            <h3>{look.name || look.title}</h3>
            <p>{[look.scene, look.season, look.wear ?? '未安排'].filter(Boolean).join(' · ')}</p>
            {look.createdAt && <p>收藏于 {new Date(look.createdAt).toLocaleDateString('zh-CN')}</p>}
            <p>{look.items.map(garmentName).join(' ＋ ')}</p>
            <p>{look.note}</p>
            {missing.length > 0 && <p>暂不可用：{missing.map(garmentName).join('、')}</p>}
            <div className="options">
              <button className="pill" aria-expanded={lookEditor === look.id} onClick={() => setLookEditor(lookEditor === look.id ? null : look.id)}>编辑</button>
              <button className="pill" onClick={() => {
                if (update('looks', [...saved, { ...look, id: crypto.randomUUID(), outfitId: look.outfitId ?? look.id, name: `${look.name || look.title}（副本）`, createdAt: new Date().toISOString() }], setSaved)) setNotice('已复制 Look')
              }}>复制</button>
              <button className="pill" disabled={!reusable.length} onClick={() => {
                pick(reusable[0])
                if (!missing.length) {
                  setLooks([reviseLook(look, reusable)])
                  setLocks(reusable.slice(1))
                }
                navigate('开始穿搭')
                if (missing.length) setNotice('部分衣物暂不可用，请重新生成搭配。')
              }}>{missing.length ? '用可穿单品重搭' : '复用搭配'}</button>
              <button className="pill" onClick={() => {
                if (window.confirm('移除这条 Look 收藏？')) toggle(look)
              }}>删除</button>
            </div>
            {lookEditor === look.id && <form className="look-editor" onSubmit={event => saveLookDetails(event, look)}>
              <label>Look 名称<input name="name" maxLength={60} defaultValue={look.name ?? look.title} /></label>
              <label>场景<input name="scene" maxLength={40} defaultValue={look.scene} /></label>
              <label>季节<input name="season" maxLength={20} defaultValue={look.season} /></label>
              <label>状态<select name="wear" defaultValue={look.wear ?? '未安排'}>{wearStates.map(state => <option key={state}>{state}</option>)}</select></label>
              <button className="primary">保存 Look</button>
            </form>}
          </div>
        </article>
      })}</div>
    </>
  }

  function commitClothes(next: Garment[], message: string) {
    if (update('clothes', next, setClothes)) {
      setEditor(null)
      setLooks(null)
      setNotice(message)
      return true
    }
    return false
  }

  function readTags(form: FormData): GarmentTags {
    return Object.fromEntries(tagFields.map(({ key }) => [key, String(form.get(key) ?? '').trim()]))
  }

  function fillSuggestedName(form: HTMLFormElement) {
    const data = new FormData(form)
    const input = form.elements.namedItem('name')
    if (input instanceof HTMLInputElement) {
      input.value = suggestedGarmentName(data.get('category') as Category, String(data.get('color')), readTags(data)).slice(0, input.maxLength)
    }
  }

  function garmentCaption(item: Garment) {
    const hasSimilar = clothes.some(other => similarGarment(item, other))
    const tags = [colorFamily(item.color), ...Object.values(item.tags ?? {}).filter(Boolean)]
    return <span className="garment-caption">
      <strong>{garmentName(item)}</strong>
      <small>{tags.join(' · ')}{hasSimilar ? ` · #${item.id.slice(0, 6)}` : ''}{item.status && item.status !== '可穿' ? ` · ${item.status}` : ''}</small>
    </span>
  }

  async function suggestGarment(form: HTMLFormElement) {
    const photoInput = form.elements.namedItem('photo')
    const file = photoInput instanceof HTMLInputElement ? photoInput.files?.[0] : undefined
    if (!(file instanceof File) || !file.size) {
      setNotice('请先选择一张单品照片。')
      return
    }
    const initial = new FormData(form)
    setRecognizing(true)
    setNotice('')
    try {
      const photo = await garmentPhoto(file, 'image/jpeg')
      const image = await (await fetch(photo)).blob()
      const response = await fetch('/api/wardrobe/recognize', {
        method: 'POST', body: image, signal: AbortSignal.timeout(25000),
      })
      if (!response.ok) throw Error('Recognition unavailable')
      const suggestion = await response.json()
      if (!form.isConnected) return
      const currentFile = form.elements.namedItem('photo')
      if (!(currentFile instanceof HTMLInputElement) || currentFile.files?.[0] !== file) return
      const category = form.elements.namedItem('category')
      const color = form.elements.namedItem('color')
      const hasCategory = categories.includes(suggestion.category)
      if (category instanceof HTMLSelectElement && hasCategory && category.value === initial.get('category')) category.value = suggestion.category
      const hasColor = typeof suggestion.color === 'string' && /^#[0-9a-f]{6}$/i.test(suggestion.color)
      if (color instanceof HTMLInputElement && hasColor && color.value === initial.get('color')) color.value = suggestion.color
      if (!hasCategory && !hasColor) {
        setNotice('没有可靠的识别建议，请手动填写。')
        return
      }
      const name = form.elements.namedItem('name')
      if (hasCategory && name instanceof HTMLInputElement && !name.value.trim() && name.value === initial.get('name')) fillSuggestedName(form)
      setNotice(hasCategory ? '已填入识别建议，请核对后保存。' : '已建议主色，类别请手动选择。')
    } catch {
      if (form.isConnected) setNotice('识别暂不可用，仍可手动填写并保存。')
    } finally {
      setRecognizing(false)
    }
  }

  async function saveGarment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const previous = editor === 'new' ? undefined : editor ?? undefined
    const category = form.get('category') as Category
    const color = String(form.get('color'))
    const name = String(form.get('name')).trim()
    const tags = readTags(form)
    const file = form.get('photo')
    setBusy(true)
    try {
      const photo = file instanceof File && file.size ? await garmentPhoto(file) :
        form.get('removePhoto') ? undefined : previous?.photo
      const uploadedAt = file instanceof File && file.size ? new Date().toISOString() : previous?.uploadedAt
      const item = { id: previous?.id ?? crypto.randomUUID(), name, category, color, tags, photo, uploadedAt, status: form.get('status') as GarmentStatus }
      const next = previous ? clothes.map(entry => entry.id === item.id ? item : entry) : [...clothes, item]
      if (!commitClothes(next, previous ? '已更新单品' : '已添加单品')) return
      if (styleUpload && section === '开始穿搭') {
        setStyleUpload(false)
        if (item.status === '可穿') pick(item)
      }
      setFilter('全部')
      setStatusFilter('全部')
      setGarmentQuery('')
    } catch {
      setNotice('无法读取这张图片。请换一张，或清空文件后手动保存。')
    } finally {
      setBusy(false)
    }
  }

  function garmentForm(editor: Garment | 'new') {
    return <form className="garment-editor" key={editor === 'new' ? editor : editor.id} onSubmit={saveGarment}>
            <fieldset disabled={busy}>
              <legend>{editor === 'new' ? '添加单品' : '编辑单品'}</legend>
              {editor !== 'new' && <Piece item={editor} />}
              <label>照片<input name="photo" type="file" accept="image/*" /></label>
              <button type="button" className="pill" disabled={recognizing} onClick={event => {
                if (event.currentTarget.form) void suggestGarment(event.currentTarget.form)
              }}>{recognizing ? '正在识别…' : '识别类别和主色'}</button>
              {editor !== 'new' && editor.photo && <label><input name="removePhoto" type="checkbox" />移除已上传的照片</label>}
              <div className="garment-name-field">
                <label htmlFor="garment-name">名称</label>
                <input id="garment-name" type="text" name="name" placeholder="例如：深灰色冲锋衣" maxLength={40} defaultValue={editor === 'new' ? '' : editor.name} />
                <div className="name-actions">
                  <button type="button" className="pill" onClick={event => { if (event.currentTarget.form) fillSuggestedName(event.currentTarget.form) }}>填入建议名称</button>
                  <button type="button" className="pill" onClick={event => {
                    const input = event.currentTarget.form?.elements.namedItem('name')
                    if (input instanceof HTMLInputElement) { input.value = ''; input.focus() }
                  }}>清空名称</button>
                </div>
              </div>
              <label>类别<select name="category" defaultValue={editor === 'new' ? categories[0] : editor.category}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
              <label>主色<input name="color" type="color" defaultValue={editor === 'new' ? '#233c30' : editor.color} /></label>
              <div className="tag-fields">
                <h3>辨识标签</h3>
                {tagFields.map(({ key, label, examples }) => <label key={key}>{label}
                  <input name={key} list={examples.length ? `garment-${key}` : undefined} maxLength={24}
                    placeholder={examples[0] ?? '选填'} defaultValue={editor === 'new' ? '' : editor.tags?.[key]} />
                  {examples.length > 0 && <datalist id={`garment-${key}`}>{examples.map(value => <option key={value} value={value} />)}</datalist>}
                </label>)}
              </div>
              <label>状态<select aria-label="状态" name="status" defaultValue={editor === 'new' ? '可穿' : editor.status ?? '可穿'}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
              <div className="options">
                <button className="primary">{busy ? '保存中…' : '保存单品'}</button>
                <button type="button" className="pill" onClick={() => { setEditor(null); setStyleUpload(false) }}>取消</button>
                {editor !== 'new' && <>
                  <button type="button" className="pill" disabled={!available.some(item => item.id === editor.id)} onClick={() => { pick(editor); navigate('开始穿搭') }}>用这件搭</button>
                  <button type="button" className="pill" onClick={() => {
                    if (window.confirm('删除这件衣物？已有收藏会保留单品快照。')) commitClothes(clothes.filter(item => item.id !== editor.id), '已删除单品')
                  }}>删除单品</button>
                </>}
              </div>
            </fieldset>
          </form>
  }

  async function previewPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!singleFile) return
    const form = event.currentTarget
    setPreviewing(true)
    setNotice('')
    try {
      const photo = await garmentPhoto(singleFile)
      if (!form.isConnected) return
      const candidate: Garment = { id: 'purchase-preview', name: '待购单品', category: singleCategory, color: singleColor, photo }
      const referencePieces: Garment[] = singleCategory === '外套' ? [
        { id: 'ref-white', name: '白色圆领短 T', category: '上衣', color: '#eeeeeb', tags: { fit: '常规' } },
        { id: 'ref-gray', name: '灰色抓绒内搭', category: '上衣', color: '#77777a' },
        { id: 'ref-ivory', name: '米白针织内搭', category: '上衣', color: '#e5deca' },
        { id: 'ref-pants', name: '炭灰直筒裤', category: '裤装', color: '#3d3e41' },
        { id: 'ref-cargo', name: '黑色直筒工装裤', category: '裤装', color: '#252629' },
        { id: 'ref-jeans', name: '深靛蓝直筒牛仔裤', category: '裤装', color: '#293748' },
        { id: 'ref-shoes', name: '米白运动鞋', category: '鞋履', color: '#e4e2d9' },
        { id: 'ref-trail', name: '灰色越野运动鞋', category: '鞋履', color: '#75777a' },
        { id: 'ref-boots', name: '黑色短靴', category: '鞋履', color: '#252527' },
      ] : seed.filter(item => item.category !== candidate.category)
      const groups = singleCategory === '外套' ? [[0, 3, 6], [1, 4, 7], [2, 5, 8]] : []
      setReferenceLooks(groups.length ? groups.map((group, index) => ({
        id: 'purchase-' + index,
        title: ['干净休闲', '轻户外', '城市日常'][index],
        note: [
          '白色内搭提亮领口，炭灰直筒裤承接外套体量，米白鞋呼应内搭。',
          '抓绒作为中间层，直筒工装裤和越野鞋延续功能风格。需结合气温决定层数。',
          '米白针织柔化功能外套，深蓝直筒牛仔和黑短靴补足城市感。',
        ][index],
        items: [candidate, ...group.map(position => referencePieces[position])],
      })) : createLooks(candidate, [candidate, ...referencePieces]))
      requestAnimationFrame(() => document.getElementById('reference-results')?.scrollIntoView({ block: 'start' }))
    } catch {
      if (form.isConnected) setNotice('无法读取这张照片，请换一张后重试。')
    } finally {
      setPreviewing(false)
    }
  }

  function cards(entries: Look[], editable = false) {
    return <div className="looks">{entries.map(look => {
      const favorite = saved.some(item => item.id === look.id)
      return <article key={look.id} className="look">
        <OutfitBoard items={look.items} />
        <div className="look-body">
          <h3>{look.title}</h3><p>{look.items.map(garmentName).join(' ＋ ')}</p><p>{look.note}</p>
          {editable && <div className="look-controls">{look.items.filter(item => item.id !== selected?.id).map(item => {
            const locked = locks.some(entry => entry.id === item.id)
            const options = available.filter(entry => entry.category === item.category && entry.id !== item.id)
            return <div key={item.id}>
              <button className="pill" aria-pressed={locked} onClick={() => setLocks(locked ?
                locks.filter(entry => entry.id !== item.id) :
                [...locks.filter(entry => entry.category !== item.category), item])}>{locked ? '已锁定' : '锁定'} {garmentName(item)}</button>
              {options.length > 0 && <select aria-label={`替换${garmentName(item)}`} value="" disabled={locked} onChange={event => {
                const replacement = options.find(entry => entry.id === event.target.value)
                if (!replacement) return
                const revised = reviseLook(look, look.items.map(entry => entry.id === item.id ? replacement : entry))
                setLooks(entries.map(entry => entry.id === look.id ? revised : entry)
                  .filter((entry, index, all) => all.findIndex(other => other.id === entry.id) === index))
              }}><option value="" disabled>替换</option>{options.map(entry => <option key={entry.id} value={entry.id}>{garmentName(entry)}</option>)}</select>}
            </div>
          })}</div>}
          <button className="pill" aria-pressed={favorite} onClick={() => toggle(look)}>{favorite ? '♥ 已收藏' : '♡ 收藏 Look'}</button>
        </div>
      </article>
    })}</div>
  }

  return <>
    
    <main>
      <div role="status" className={notice ? 'notice' : ''}>{notice}</div>
      {section === '灵感' && <Inspiration onStyle={category => {
        pick(available.find(item => item.category === category))
        navigate('开始穿搭')
      }} />}
      {section === '开始穿搭' && <>
        <div className="page-heading"><h1>开始穿搭</h1><p>先选一件，再看它能怎么搭。</p></div>
        <div className="style-modes" role="group" aria-label="穿搭模式">
          <button type="button" aria-pressed={mode === '单品搭配'} onClick={() => { setMode('单品搭配'); setStyleUpload(false) }}>
            <strong>单品搭配</strong><span>想买一件，先看看怎么搭</span>
          </button>
          <button type="button" aria-pressed={mode === '衣橱搭配'} onClick={() => { setMode('衣橱搭配'); setSingleFile(null); setReferenceLooks([]) }}>
            <strong>衣橱搭配</strong><span>用自己已有的衣服搭一套</span>
          </button>
        </div>
        {mode === '单品搭配' ? <>
          <form className="style-upload purchase-form" onSubmit={previewPurchase}>
            <label>上传想买的单品照片<input type="file" required accept="image/*" disabled={previewing} onChange={event => {
              setSingleFile(event.target.files?.[0] ?? null)
              setReferenceLooks([])
            }} /></label>
            {singleFile && <div className="purchase-fields">
              <label>类别<select disabled={previewing} value={singleCategory} onChange={event => { setSingleCategory(event.target.value as Category); setReferenceLooks([]) }}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
              <label>主色<input type="color" disabled={previewing} value={singleColor} onChange={event => { setSingleColor(event.target.value); setReferenceLooks([]) }} /></label>
            </div>}
            <button className="primary" disabled={!singleFile || previewing}>{previewing ? '生成中…' : '查看搭配参考'}</button>
          </form>
          {referenceLooks.length > 0 && <section id="reference-results"><h2>待购搭配参考</h2>
            <p>用你选的单品搭配示例衣物，方便买前判断。</p>
            {singleCategory === '外套' && <details className="onbody-example">
              <summary>查看紫色外套的男女上身案例</summary>
              <figure className="onbody-reference">
                <img src="/styling/plum-shell-reference.png" alt="参考上传截图中的紫色外套，配白 T、炭灰直筒裤和米白运动鞋的男女示意" />
                <figcaption>AI 上身示意 · 依据紫色外套参考图生成的固定案例。用于观察搭配方向，细节与实际衣物可能存在差异。</figcaption>
              </figure>
            </details>}
            <div className="looks">{referenceLooks.map(look => <article key={look.id} className="look">
              <OutfitBoard items={look.items} /><div className="look-body"><h3>{look.title}</h3>
                <p>{look.items.slice(1).map(garmentName).join(' ＋ ')}</p><p>{look.note}</p>
                <div className="outfit-feedback" role="group" aria-label="搭配评价">
                  {['愿意穿', '配色不喜欢', '版型不合适', '场景不适合'].map(reason => <button type="button" key={reason} className="pill"
                    aria-pressed={feedback[look.items.map(item => item.id + item.color).join('/')] === reason}
                    onClick={() => {
                      const key = look.items.map(item => item.id + item.color).join('/')
                      update('outfit-feedback', { ...feedback, [key]: reason }, setFeedback)
                    }}>{reason}</button>)}
                </div>
              </div>
            </article>)}</div>
          </section>}
        </> : <>
          {styleUpload ? garmentForm('new') : <button type="button" className="style-upload" onClick={() => { setEditor('new'); setStyleUpload(true) }}>
            <span aria-hidden="true">＋</span><strong>上传我的衣物</strong><small>添加到衣库，围绕它开始搭配</small>
          </button>}
        </>}
        <section className="style-recent">
          <h2>最近上传</h2>
          {recent.length ? <div className="style-strip" aria-label="最近上传的衣物">{recent.map(item =>
            <button type="button" className="garment" key={item.id} disabled={!available.some(entry => entry.id === item.id)} aria-pressed={mode === '衣橱搭配' && selected?.id === item.id} onClick={() => { pick(item); setStyleUpload(false) }}>
              <Piece item={item} />{garmentCaption(item)}
            </button>)}</div> : <p>上传的衣物会出现在这里。</p>}
        </section>
        {mode === '衣橱搭配' && <>
        <details className="closet-picker">
          <summary>{hasPersonalClothes ? '从已有衣物挑选' : '从示例衣物挑选'}</summary>
          <div className="style-strip">{available.map(item => <button type="button" className="garment" key={item.id} aria-pressed={selected?.id === item.id} onClick={() => pick(item)}><Piece item={item} />{garmentCaption(item)}</button>)}</div>
        </details>
        {selected ? <div className="style-anchor"><Piece item={selected} /><div><small>{hasPersonalClothes ? '搭配锚点' : '示例锚点'}</small><strong>{garmentName(selected)}</strong></div></div> : <p>衣库里暂时没有可穿单品。</p>}
        <button className="primary" disabled={!selected} onClick={() => {
          if (!selected) return
          setLooks(createLooks(selected, available, 0, locks))
          setRound(0)
          requestAnimationFrame(() => document.getElementById('style-results')?.scrollIntoView({ block: 'start' }))
        }}>生成搭配</button>
        {looks && <section id="style-results" aria-label="模拟搭配结果"><h2>搭配结果</h2>{looks.length ? <>
          <div className="options"><button className="pill" onClick={() => {
            setRound(round + 1)
            setLooks(selected ? createLooks(selected, available, round + 1, locks) : [])
          }}>重新生成</button>{locks.length > 0 && <button className="pill" onClick={() => setLocks([])}>清除额外锁定</button>}</div>
          {locks.length > 0 && <p>下次生成保留 {locks.map(garmentName).join('、')}</p>}
          {cards(looks, true)}
        </> : <p>{missingCategories(available).length ? `参考补位：添加可穿的${missingCategories(available).join('、')}后，就能组成一套完整搭配。` : '当前衣物暂时没有适合这件单品的完整组合，请补充合适的同类衣物再试。'}</p>}</section>}
        </>}
      </>}
      {section === '我的衣库' && <>
        <div className="page-heading"><h1>我的衣库</h1><p className="inspiration-meta">i衣柜 · 内测版</p></div>
        <Account user={user} onUser={changeUser} onSave={saveAccount} message={accountMessage} />
        <div className="options segmented">{(['衣物', '收藏 Look'] as const).map(option => <button key={option} className="pill" aria-pressed={tab === option} onClick={() => setTab(option)}>{option} · {option === '衣物' ? clothes.length : saved.length}</button>)}</div>
        {tab === '衣物' ? <>
          <div className="options">{(['全部', ...categories] as const).map(category => <button key={category} className="pill" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
          <label className="garment-search">搜索衣物<input type="search" value={garmentQuery} onChange={event => setGarmentQuery(event.target.value)} placeholder="名称、品牌、款式或标签" /></label>
          <div className="options"><label>衣物状态<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>{['全部', ...statuses].map(status => <option key={status}>{status}</option>)}</select></label></div>
          <button className="primary" disabled={busy} onClick={() => setEditor(editor === 'new' ? null : 'new')}>＋ 添加单品</button>
          {editor && garmentForm(editor)}
          <div className="garments">{clothes.filter(item => (filter === '全部' || item.category === filter) && (statusFilter === '全部' || (item.status ?? '可穿') === statusFilter) &&
            [garmentName(item), item.category, colorFamily(item.color), item.id, ...Object.values(item.tags ?? {})]
              .some(value => value.toLowerCase().includes(garmentQuery.trim().toLowerCase()))).map(item =>
            <button key={item.id} className="garment" disabled={busy} onClick={() => { setEditor(item); window.scrollTo(0, 0) }}><Piece item={item} />{garmentCaption(item)}</button>
          )}</div>
        </> : savedCards()}
      </>}
    </main>
    <div className="dock"><nav aria-label="主导航">{sections.map((item) => <button key={item} aria-label={item} aria-current={section === item ? 'page' : undefined} onClick={() => navigate(item)}>{item === '开始穿搭' ? '穿搭' : item === '我的衣库' ? '衣库' : item}</button>)}</nav><button type="button" className="dock-add" aria-label="添加衣物" onClick={() => { navigate('我的衣库'); setTab('衣物'); setEditor('new') }}>＋</button></div>
  </>
}

createRoot(document.getElementById('root')!).render(new URLSearchParams(location.hash.slice(1)).has('token') ? <EmailAction /> : location.pathname === '/admin' ? <Admin /> : <App />)
