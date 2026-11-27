import researchRules from './research-rules.json' with { type: 'json' }
export const categories = ['上衣', '外套', '裤装', '鞋履'] as const
export type Category = typeof categories[number]
export const statuses = ['可穿', '在洗', '归档'] as const
export type GarmentStatus = typeof statuses[number]
export type Garment = { id: string; name: string; category: Category; color: string; photo?: string; uploadedAt?: string; tags?: GarmentTags; status?: GarmentStatus }

export const tagFields = [
  { key: 'kind', label: '细分款式', examples: ['冲锋衣', '软壳夹克', '衬衫', '喇叭裤', '乐福鞋'] },
  { key: 'brand', label: '品牌或系列', examples: [] },
  { key: 'fit', label: '版型', examples: ['修身', '常规', '宽松', '短款', '中长款'] },
  { key: 'detail', label: '辨识细节', examples: ['连帽', '无帽', '可拆帽', '撞色拉链', '带内胆', '侧袋'] },
] as const
export type GarmentTags = Partial<Record<typeof tagFields[number]['key'], string>>

function rgb(color: string) {
  return [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) || 0)
}

export function colorFamily(color: string) {
  const [r, g, b] = rgb(color)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max < 45) return '黑色'
  if (max - min < 30) return min > 210 ? '白色' : max < 115 ? '深灰色' : '灰色'
  if (g >= r && g >= b) return max < 115 ? '深绿色' : '绿色'
  if (b >= r && b >= g) return r > g ? '紫色' : '蓝色'
  if (g < r * 0.55) return '红色'
  if (max < 160) return '棕色'
  return b > r * 0.62 ? '米色' : '黄色'
}

export function suggestedGarmentName(category: Category, color: string, tags?: GarmentTags) {
  return [tags?.brand, colorFamily(color) + (tags?.kind || category), tags?.fit, tags?.detail].filter(Boolean).join(' · ')
}

export function garmentName(item: Garment) {
  return item.name || suggestedGarmentName(item.category, item.color, item.tags)
}

export function similarGarment(item: Garment, other: Garment) {
  if (item.id === other.id || item.category !== other.category) return false
  const comparison = rgb(other.color)
  return rgb(item.color).every((value, index) => Math.abs(value - comparison[index]) <= 48)
}

export const seed: Garment[] = [
  { id: 'green', name: '墨绿高腰喇叭裤', category: '裤装', color: '#233c30' },
  { id: 'olive', name: '浅橄榄喇叭裤', category: '裤装', color: '#838655' },
  { id: 'cream', name: '白色长袖衬衫', category: '上衣', color: '#ded3bd' },
  { id: 'wine', name: '酒红短款开衫', category: '上衣', color: '#682b3a' },
  { id: 'ink', name: '石墨灰衬衫', category: '上衣', color: '#494751' },
  { id: 'loafers', name: '深棕乐福鞋', category: '鞋履', color: '#49362b' },
  { id: 'sneakers', name: '米白帆布鞋', category: '鞋履', color: '#d8cdbb' },
  { id: 'jacket', name: '黑色短夹克', category: '外套', color: '#28282a' },
]

export const wearStates = ['未安排', '计划穿', '已穿'] as const
export type WearState = typeof wearStates[number]
export type SavedLook = Look & { name?: string; scene?: string; season?: string; wear?: WearState; createdAt?: string; outfitId?: string }
export type Look = { id: string; title: string; note: string; items: Garment[] }

function outfitTitle(items: Garment[]) {
  const upper = items.find(item => item.category === '外套') ?? items.find(item => item.category === '上衣')
  const bottom = items.find(item => item.category === '裤装')
  return [upper && garmentName(upper), bottom && garmentName(bottom)].filter(Boolean).join(' × ')
}

function describe(items: Garment[]) {
  const outer = items.find(item => item.category === '外套')
  const top = items.find(item => item.category === '上衣')
  const trousers = items.find(item => item.category === '裤装')
  const shoes = items.find(item => item.category === '鞋履')
  const notes: string[] = []
  if (outer) {
    notes.push(`以${garmentName(outer)}为主角，${top ? garmentName(top) + '作为内搭' : '留意内搭厚薄'}。`)
  }
  if (trousers && /喇叭/.test(garmentName(trousers))) {
    notes.push('裤脚外扩，试穿时可把上衣收短或塞下摆，让腰线更清楚。')
  } else if (trousers) {
    notes.push(`${garmentName(trousers)}衔接上下身，试穿时核对腰线和裤脚长度。`)
  }
  if (shoes) {
    notes.push(`${garmentName(shoes)}收尾，${/运动|帆布/.test(garmentName(shoes)) ? '偏日常休闲方向' : /乐福|德比/.test(garmentName(shoes)) ? '增加利落感' : '请结合步行需求检查舒适度'}。`)
  }
  return notes.join('')
}

const required = ['上衣', '裤装', '鞋履'] as const

export function missingCategories(clothes: Garment[]) {
  return required.filter(category => !clothes.some(item =>
    item.category === category && (!item.status || item.status === '可穿')))
}

function colorScore(left: Garment, right: Garment) {
  const a = rgb(left.color)
  const b = rgb(right.color)
  const saturation = (rgb: number[]) => Math.max(...rgb) - Math.min(...rgb)
  const distance = a.reduce((total, value, index) => total + Math.abs(value - b[index]), 0)
  return 100 - distance / 9 + (Math.min(saturation(a), saturation(b)) < 32 ? 35 : 0)
}

export function reviseLook(look: Look, items: Garment[]): Look {
  return { ...look, items, title: outfitTitle(items), id: items.map(item => item.id).join('/'), note: describe(items) }
}

function researchScore(items: Garment[]) {
  const text = items.map(item => [item.name, item.tags?.kind].join(' ')).join(' ')
  const terms: Record<string, RegExp> = {
    shirt: /衬衫/, tee: /短 T|短袖|T恤/, knit: /针织|开衫|毛衣/,
    blazer: /西装|西服/, shell: /冲锋|软壳/,
    denim: /牛仔/, trousers: /长裤|西裤|直筒裤/, skirt: /半裙|短裙/,
    dress: /连衣裙/, sneakers: /运动鞋|帆布鞋/, loafers: /乐福鞋/,
    boots: /短靴|长靴/, flats: /平底鞋/,
  }
  return researchRules.reduce((total, rule) => {
    const matches = rule.pair.split('/').every(part => terms[part]?.test(text))
    return total + (matches ? Math.min(12, Math.log2(rule.count + 1) * 2) : 0)
  }, 0)
}

export function createLooks(anchor: Garment, clothes: Garment[], rotation = 0, locked: Garment[] = []): Look[] {
  const available = clothes.filter(item => !item.status || item.status === '可穿')
  if (!available.some(item => item.id === anchor.id) || missingCategories(available).length) return []
  const fixed = new Map<Category, Garment>()
  for (const item of locked) {
    const current = available.find(entry => entry.id === item.id)
    if (current) fixed.set(current.category, current)
  }
  fixed.set(anchor.category, anchor)
  const slots = required.filter(category => !fixed.has(category))
  const candidates = slots.map(category => {
    const ranked = available.filter(item => item.category === category)
      .sort((left, right) => colorScore(anchor, right) - colorScore(anchor, left))
    const offset = rotation % ranked.length
    return [...ranked.slice(offset), ...ranked.slice(0, offset)].slice(0, 12)
  })
  const combinations = candidates.reduce<Garment[][]>(
    (outfits, items) => items.flatMap(item => outfits.map(outfit => [...outfit, item])),
    [[anchor, ...Array.from(fixed.values()).filter(item => item.id !== anchor.id)]],
  )
  const functional = /冲锋|软壳|抓绒|工装/.test([anchor.name, anchor.tags?.kind].join(' '))
  const pool = combinations
  const score = (items: Garment[]) => {
    let value = items.reduce((total, item) => total + colorScore(anchor, item), 0) + researchScore(items)
    if (functional) {
      for (const item of items) {
        if (item.category === '裤装' && /喇叭/.test(item.name)) value -= 100
        if (item.category === '鞋履' && /乐福|德比/.test(item.name)) value -= 60
        if (item.category === '鞋履' && /运动|帆布/.test(item.name)) value += 40
      }
    }
    return value
  }
  pool.sort((left, right) => score(right) - score(left))
  return pool.slice(rotation % Math.max(1, pool.length)).concat(pool.slice(0, rotation % Math.max(1, pool.length))).slice(0, 3).map((items) =>
    reviseLook({ id: '', title: outfitTitle(items), items: [], note: '' }, items))
}
