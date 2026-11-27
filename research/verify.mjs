import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createLooks, reviseLook, seed } from '../src/wardrobe.ts'

const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)))
assert.ok(cases.length >= 500)
assert.equal(new Set(cases.map(entry => entry.url)).size, cases.length)
assert.ok(cases.every(entry => entry.title && entry.summary && entry.url.startsWith('https://style2bloom.com/look/')))
const shell = { id: 'shell', name: '紫色冲锋衣', category: '外套', color: '#605064' }
const straight = { id: 'straight', name: '灰色直筒裤', category: '裤装', color: '#666666' }
const clothes = [...seed, shell, straight]
const looks = createLooks(shell, clothes)
assert.ok(looks.length)
assert.ok(looks.every(look => look.items.some(item => item.id === shell.id)))
assert.ok(looks[0].items.some(item => item.id === straight.id))
assert.ok(looks[0].items.some(item => item.id === 'sneakers'))
assert.deepEqual(createLooks(shell, clothes.map(item => ({ ...item, status: '归档' }))), [])
assert.ok(createLooks(shell, clothes, 0, [seed[5]]).every(look => look.items.some(item => item.id === seed[5].id)))
assert.deepEqual(createLooks(shell, clothes.filter(item => item.category !== '上衣')), [])
console.log('独立来源、字段完整性、功能外套排序、锚点及锁定、状态和缺件通过')

const changed = reviseLook(looks[0], looks[0].items.map(item => item.category === '鞋履' ? seed[5] : item))
assert.ok(changed.note.includes('乐福鞋'))
assert.ok(!changed.note.includes('运动鞋'))
assert.ok(changed.title.includes('直筒裤'))
console.log('换鞋后搭配解释更新通过')
