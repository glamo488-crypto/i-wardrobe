import { useRef, useState } from 'react'
import type { Category } from './wardrobe'

type Style = '干净日常' | '城市通勤' | '复古层次' | '轻户外'
type Entry = [Style, Category, string, string, string, string]

const outfits: Entry[] = [
  ['轻户外','裤装','绿色工装裤 × 白色短 T','橄榄绿工装裤、白色圆领短 T、白色运动鞋','白 T 提亮脸周，白鞋和上衣呼应。把颜色留给工装裤，宽松也能穿出干净感。','橄榄绿与白'],
  ['城市通勤','外套','藏蓝夹克 × 奶油色长裤','藏蓝短夹克、奶油色长裤、棕色乐福鞋','深上浅下，把夹克的硬朗感放轻。棕鞋延续奶油色的暖调。','深蓝与奶油白'],
  ['复古层次','外套','炭灰夹克 × 水洗牛仔','炭灰夹克、水洗蓝牛仔裤、黑色德比鞋','浅牛仔打破深灰和黑的沉闷，让裤子成为整套最轻的一块。','炭灰与浅蓝'],
  ['城市通勤','外套','驼色夹克 × 黑色长裤','驼色夹克、黑色直筒裤、黑色短靴','黑裤和黑靴连成一条干净的线，驼色夹克就成了焦点。','驼色与黑'],
  ['干净日常','上衣','浅蓝衬衫 × 灰西裤','浅蓝衬衫、灰色褶裥西裤、白运动鞋','浅蓝和灰都偏冷，白鞋把整套亮度提起来。','冷蓝与灰'],
  ['复古层次','上衣','燕麦针织 × 深蓝牛仔','燕麦色针织、深靛蓝牛仔裤、棕色麂皮鞋','粗针织和深牛仔形成材质对比，麂皮鞋接住针织的暖色。','燕麦色与靛蓝'],
  ['城市通勤','外套','黑夹克 × 浅灰长裤','黑色夹克、浅灰长裤、黑乐福鞋','黑色在上身和脚下各出现一次，浅灰裤让明暗层次更清楚。','黑与浅灰'],
  ['轻户外','外套','森林绿外搭 × 米白牛仔','深绿衬衫外套、米白牛仔裤、深棕靴','米白裤把森林绿衬得更浓，深棕靴给浅色下装一点重量。','森林绿与米白'],
  ['复古层次','上衣','酒红开衫 × 黑直筒裤','酒红针织开衫、黑直筒裤、黑乐福鞋','酒红集中在上半身，裤鞋用黑收住，颜色有重点。','酒红与黑'],
  ['城市通勤','上衣','象牙白衬衫 × 巧克力裤','象牙白衬衫、巧克力色长裤、棕麂皮鞋','暖白和深棕有明暗差，裤鞋同色让组合更完整。','暖白与深棕'],
  ['复古层次','外套','牛仔夹克 × 卡其裤','靛蓝牛仔夹克、白 T、卡其裤、白鞋','白 T 在深蓝和卡其之间留出一层亮色，白鞋再呼应一次。','靛蓝与卡其'],
  ['干净日常','上衣','石板灰针织 × 米白裤','石板灰针织、米白裤、灰色运动鞋','灰上衣和灰鞋形成首尾呼应，米白长裤把整体提亮。','石板灰与米白'],
  ['城市通勤','外套','米色风衣 × 藏蓝长裤','米色风衣、白 T、藏蓝长裤、黑乐福鞋','浅色风衣覆盖深色下装，内搭露出一小块白，视线自然上移。','沙米色与藏蓝'],
  ['复古层次','裤装','砖红长裤 × 黑色针织','砖红长裤、黑色圆领针织、黑鞋','上下只用两个大色块，黑色把砖红衬得更浓。','砖红与黑'],
  ['轻户外','裤装','橄榄工装裤 × 浅灰卫衣','橄榄绿工装裤、浅灰连帽卫衣、米白运动鞋','浅灰压低橄榄绿的厚重感，米白鞋让裤脚更轻。','橄榄绿与浅灰'],
  ['复古层次','外套','棕麂皮夹克 × 本白牛仔','棕色麂皮夹克、本白牛仔裤、棕靴','本白裤凸显麂皮纹理，棕靴把上身的暖调带到脚下。','麂皮棕与本白'],
  ['干净日常','上衣','白牛津衬衫 × 靛蓝牛仔','白牛津纺衬衫、深靛蓝牛仔裤、黑德比鞋','上亮下深，配色简单。用有纹理的牛津纺和丹宁增加层次。','白与靛蓝'],
  ['干净日常','上衣','鼠尾草绿衬衫 × 石色短裤','鼠尾草绿亚麻衬衫、石色短裤、白运动鞋','低饱和绿配浅石色，短裤和白鞋一起减轻视觉重量。','浅绿与石色'],
  ['城市通勤','上衣','奶油开衫 × 深蓝长裤','奶油色开衫、深蓝长裤、棕乐福鞋','奶油色上衣提亮，深蓝裤把柔软的开衫搭得更利落。','奶油白与深蓝'],
  ['轻户外','外套','深橄榄外套 × 黑牛仔','深橄榄野战夹克、灰 T、黑牛仔裤、黑靴','灰 T 留在领口和门襟之间，让两块深色有清晰边界。','深橄榄与黑'],
  ['干净日常','上衣','雾蓝针织 × 本白牛仔','雾蓝针织、本白牛仔裤、灰色运动鞋','雾蓝和本白保持同一明度，灰鞋让浅色组合更稳。','雾蓝与本白'],
  ['复古层次','外套','黑皮夹克 × 水洗蓝牛仔','黑色皮夹克、灰 T、水洗蓝牛仔裤、黑靴','浅牛仔拉开明暗，皮革的光泽和牛仔的哑光形成对比。','皮革黑与水洗蓝'],
  ['复古层次','外套','烟草色外搭 × 奶油长裤','烟草色衬衫外套、黑 T、奶油色长裤、棕鞋','烟草色和奶油色同属暖调，一深一浅，黑内搭补足对比。','烟草棕与奶油白'],
  ['干净日常','上衣','深蓝 Polo × 浅蓝牛仔','深蓝 Polo、浅蓝牛仔裤、米白运动鞋','用深浅两个蓝色形成层次，米白鞋让脚下留一点空白。','深蓝与浅蓝'],
  ['轻户外','裤装','橄榄工装裤 × 白色圆领 T','白色圆领 T、橄榄工装裤、白运动鞋','上衣塞一角露出腰线。白鞋呼应白 T，让工装口袋的量感集中在下半身。','橄榄绿与白'],
  ['城市通勤','裤装','象牙白衬衫 × 藏蓝西裤','象牙白衬衫、藏蓝西裤、黑乐福鞋','白衬衫把光线留在脸周，藏蓝西裤比纯黑柔和。办公室和下班聚餐都能沿用。','象牙白与藏蓝'],
  ['城市通勤','外套','炭灰西装 × 直筒牛仔','炭灰西装、米白内搭、直筒牛仔、黑平底鞋','用牛仔降低西装的正式感，米白内搭隔开深色外套和脸。','炭灰与水洗蓝'],
  ['复古层次','上衣','棕色开衫 × 奶油半裙','棕色开衫、奶油色中长裙、棕鞋','短开衫和长半裙把腰线提起来。鞋子重复开衫的棕色，连接上下身。','棕色与奶油白'],
  ['干净日常','外套','藏蓝夹克 × 米色长裤','藏蓝夹克、白 T、米色裤、白鞋','夹克和裤子形成明暗反差，白色内搭和鞋把两种颜色串在一起。','藏蓝与米色'],
  ['城市通勤','外套','奶油风衣 × 黑色长裤','奶油色风衣、黑裤、黑色平底鞋','浅风衣包住深裤。裤鞋同色延伸下半身，风衣打开穿还能露出纵向线条。','奶油白与黑'],
  ['干净日常','上衣','浅蓝棉衬衫 × 炭灰直筒裤','浅蓝棉衬衫、炭灰裤、灰鞋','浅蓝与炭灰同属冷色，靠亮度拉开层次。鞋沿用灰色，整套保留两个主色。','浅蓝与炭灰'],
  ['复古层次','上衣','红针织 × 蓝牛仔','红针织、蓝牛仔、白运动鞋','红色负责吸引视线，其他单品保留日常色。白鞋让红蓝对比更轻快。','红与蓝'],
  ['轻户外','裤装','白色短 T × 橄榄工装裤','白短 T、橄榄工装裤、白运动鞋','宽裤配合肩短 T，限制上身量感。鞋和 T 同色，保留一个主色。','白与橄榄'],
  ['干净日常','外套','浅蓝外搭 × 灰裤','浅蓝衬衫外搭、灰裤、白运动鞋','蓝和灰的饱和度都低，打开门襟能增加层次，白鞋再提一点亮度。','浅蓝与灰'],
  ['城市通勤','外套','藏蓝西装 × 灰西裤','藏蓝西装、白衬衫、灰西裤、黑乐福鞋','蓝灰配色比全身同色更容易拆开复用。白衬衫保留清晰领口。','藏蓝与浅灰'],
  ['轻户外','外套','深绿外搭 × 奶油裤','深绿衬衫外搭、奶油裤、棕鞋','深绿做主色，奶油裤提亮。棕鞋延续自然色系，避免加入第三个抢眼色块。','深绿与奶油白'],
  ['城市通勤','外套','驼色夹克 × 黑裤靴','驼色夹克、黑裤、黑靴','深裤深鞋连成一体，驼色自然成为焦点，适合从通勤穿到晚间聚会。','驼色与黑'],
  ['复古层次','上衣','炭灰针织 × 靛蓝牛仔','炭灰针织、深靛蓝牛仔、棕鞋','深色之间靠针织和丹宁纹理区分，棕鞋留一点暖色。','炭灰与靛蓝'],
  ['干净日常','上衣','鼠尾草绿衬衫 × 米色长裤','鼠尾草绿衬衫、米色长裤、白运动鞋','浅绿和米色明度接近，轻松显整齐。白鞋延续浅色调。','鼠尾草绿与米色'],
  ['城市通勤','外套','黑西装 × 奶油长裤','黑西装、奶油长裤、黑乐福鞋','黑白反差突出外套轮廓，黑鞋把上身深色带到全身。','黑与奶油白'],
]

const ages = [20, 25, 30, 35, 40, 45, 50, 25] as const
const scenes = ['校园', '通勤', '周末', '约会聚会', '旅行户外'] as const
const skills = ['明暗对比', '颜色呼应', '比例处理', '材质层次'] as const
const originalScenes = [4, 1, 2, 3, 1, 2, 1, 4, 3, 1, 0, 2, 1, 3, 4, 2, 1, 4, 1, 4, 2, 3, 2, 0]
const additionalScenes = [0, 1, 1, 3, 2, 1, 2, 3, 0, 2, 1, 4, 3, 2, 4, 1]
const skillIndexes = [1,0,0,0,1,3,1,0,0,1,1,1,0,0,0,3,3,2,0,0,1,3,0,0,2,0,0,2,1,2,0,0,2,3,0,1,0,3,1,0]

function profile(index: number) {
  return {
    person: index >= 24 && index < 32 ? '女装示范' : '男装示范',
    age: index >= 24 ? ages[(index - 24) % ages.length] : 25,
    scene: scenes[index < 24 ? originalScenes[index] : additionalScenes[index - 24]],
    skill: skills[skillIndexes[index]],
  }
}

function OutfitPhoto({ index, title }: { index: number; title: string }) {
  return <img className="inspiration-photo" src={`/inspiration/look-${index + 1}.jpg`} alt={title} loading={index > 3 ? 'lazy' : 'eager'} width="360" height="540" />
}

export function Inspiration({ onStyle }: { onStyle: (category: Category) => void }) {
  const [scene, setScene] = useState<typeof scenes[number] | '全部'>('全部')
  const [detail, setDetail] = useState<number | null>(null)
  const scroll = useRef(0)
  const order = ages.flatMap((_, index) => [24 + index, 32 + index, index * 3, index * 3 + 1, index * 3 + 2])
  const entries = order.map(index => ({ outfit: outfits[index], index, ...profile(index) }))
    .filter(entry => scene === '全部' || entry.scene === scene)

  if (detail !== null) {
    const [style, category, title, pieces, note, contrast] = outfits[detail]
    const example = profile(detail)
    return <article className="inspiration-detail">
      <button className="pill" onClick={() => {
        setDetail(null)
        requestAnimationFrame(() => {
          document.getElementById(`look-open-${detail}`)?.focus({ preventScroll: true })
          window.scrollTo(0, scroll.current)
        })
      }}>← 返回灵感</button>
      <OutfitPhoto index={detail} title={title} />
      <div className="inspiration-detail-copy">
        <p className="inspiration-meta">{example.person} · {example.age} 岁参考 · {example.scene}</p>
        <h1>{title}</h1>
        <h2>穿搭单品</h2><p>{pieces}</p>
        <h2>灵感来源 · {example.skill}</h2><p>{note}</p><p className="inspiration-meta">{style} · {contrast}</p>
        <p className="inspiration-meta">AI 穿搭示意</p>
        <button className="primary" onClick={() => onStyle(category)}>用我的同类单品搭</button>
      </div>
    </article>
  }

  return <>
    <div className="page-heading inspiration-heading"><h1>i衣柜</h1><p>找一套想穿的，学一个能复用的搭配方法。</p></div>
    <div className="inspiration-filters" role="group" aria-label="穿搭场景">
      {(['全部', ...scenes] as const).map(option => <button key={option} className="pill" aria-pressed={scene === option} onClick={() => setScene(option)}>{option}</button>)}
    </div>
    <div className="inspiration-grid">
      {entries.map(({ outfit: [, , title, , , contrast], index, scene, skill, age }) => (
        <button key={title} id={`look-open-${index}`} className="inspiration-card" onClick={() => {
          scroll.current = window.scrollY
          setDetail(index)
          window.scrollTo(0, 0)
        }}>
          <OutfitPhoto index={index} title={title} />
          <span className="inspiration-card-copy"><strong>{title}</strong><small>{scene} · {age} 岁参考</small><small>{skill} · {contrast}</small></span>
        </button>
      ))}
    </div>
  </>
}
