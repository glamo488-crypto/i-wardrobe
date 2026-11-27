import { sendAccountMail } from './mail.mjs'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const folder = fileURLToPath(new URL('./data/', import.meta.url))
mkdirSync(folder, { recursive: true, mode: 0o700 })
const db = new DatabaseSync(folder + 'yiku.sqlite')
db.exec(`
 PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT,role TEXT,created TEXT);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS wardrobe(userId TEXT PRIMARY KEY,data TEXT,version INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS reviews(userId TEXT,itemId TEXT,status TEXT,note TEXT,reviewer TEXT,updated TEXT,PRIMARY KEY(userId,itemId));
`)
if (!db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'verified')) {
 db.exec('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0')
 db.exec("UPDATE users SET verified=1 WHERE role='admin'")
}
db.exec('CREATE TABLE IF NOT EXISTS account_tokens(token TEXT PRIMARY KEY,userId TEXT,purpose TEXT,expires INTEGER,used INTEGER DEFAULT 0)')
async function issueToken(account,purpose) {
 const token=randomBytes(32).toString('hex')
 db.prepare('INSERT INTO account_tokens(token,userId,purpose,expires) VALUES(?,?,?,?)').run(hash(token),account.id,purpose,Date.now()+1800000)
 try { return await sendAccountMail(account.email,purpose,token) }
 catch(error){db.prepare('DELETE FROM account_tokens WHERE token=?').run(hash(token));throw error}
}
const hash = value => createHash('sha256').update(value).digest('hex')
function password(value, salt = randomBytes(16).toString('hex')) {
 return salt + ':' + scryptSync(value, salt, 64).toString('hex')
}
if (!db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
 const initialPassword = randomBytes(18).toString('base64url')
 const email = 'admin@yiku.local'
 db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)').run(randomBytes(16).toString('hex'),email,'衣库管理员',password(initialPassword),'admin',new Date().toISOString())
 writeFileSync(folder+'admin-login.txt', '管理员邮箱 '+email+'\n初始密码 '+initialPassword+'\n', { mode:0o600 })
}
db.exec("UPDATE users SET verified=1 WHERE role='admin'")
chmodSync(folder+'yiku.sqlite',0o600)
function publicUser(user) {
 return { id:user.id,email:user.email,name:user.name,role:user.role,created:user.created,verified:Boolean(user.verified) }
}
export function session(req) {
 const token = /(?:^|;\s*)yiku_session=([^;]+)/.exec(req.headers.cookie || '')?.[1]
 if (!token) return null
 return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.userId WHERE token=? AND expires>?').get(hash(token), Date.now()) || null
}
async function body(req) {
 let size=0, chunks=[]
 for await (const chunk of req) {
  size+=chunk.length
  if(size>16*1024*1024) throw Error('请求过大')
  chunks.push(chunk)
 }
 return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}
const attempts = new Map()
export async function accounts(req,res,path) {
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 if (!path.startsWith('/api/account') && !path.startsWith('/api/admin')) return false
 const user=session(req)
 if(req.method!=='GET' && req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) {
  send(403,{error:'请求来源不匹配'});return true
 }
 try {
  if(path==='/api/account/me' && req.method==='GET') {send(200,{user:user?publicUser(user):null});return true}
  if(['/api/account/forgot','/api/account/resend','/api/account/verify','/api/account/reset'].includes(path) && req.method==='POST') {
   const key='email:'+req.socket.remoteAddress
   const attempt=attempts.get(key) || {count:0,until:Date.now()+600000}
   if(attempt.until<Date.now()){attempt.count=0;attempt.until=Date.now()+600000}
   if(++attempt.count>20){send(429,{error:'请求过于频繁，请稍后重试'});return true}
   attempts.set(key,attempt)
   const data=await body(req)
   if(path.endsWith('forgot') || path.endsWith('resend')){
    const email=String(data.email||'').trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('请输入有效邮箱')
    const account=db.prepare('SELECT * FROM users WHERE email=?').get(email)
    if(account && (path.endsWith('forgot') || !account.verified)) await issueToken(account,path.endsWith('forgot')?'reset':'verify')
    send(200,{message:'如果邮箱符合条件，邮件已发送。本机开发邮件请在服务端发件目录查看。'});return true
   }
   const purpose=path.endsWith('verify')?'verify':'reset'
   const token=String(data.token||'')
   if(!/^[a-f0-9]{64}$/.test(token))throw Error('链接无效或已过期')
   const row=db.prepare('SELECT * FROM account_tokens WHERE token=? AND purpose=? AND used=0 AND expires>?').get(hash(token),purpose,Date.now())
   if(!row)throw Error('链接无效或已过期')
   let nextPassword
   if(purpose==='reset'){
    const pass=String(data.password||'')
    if(pass.length<10 || pass.length>128)throw Error('密码需为10至128位')
    nextPassword=password(pass)
   }
   db.exec('BEGIN IMMEDIATE')
   try{
    const consumed=db.prepare('UPDATE account_tokens SET used=1 WHERE token=? AND used=0').run(hash(token))
    if(!consumed.changes)throw Error('链接已使用')
    if(purpose==='verify')db.prepare('UPDATE users SET verified=1 WHERE id=?').run(row.userId)
    else{
     db.prepare('UPDATE users SET password=?,verified=1 WHERE id=?').run(nextPassword,row.userId)
     db.prepare('DELETE FROM sessions WHERE userId=?').run(row.userId)
    }
    db.prepare('UPDATE account_tokens SET used=1 WHERE userId=? AND purpose=?').run(row.userId,purpose)
    db.exec('COMMIT')
   }catch(error){db.exec('ROLLBACK');throw error}
   send(200,{message:purpose==='verify'?'邮箱验证成功，请返回衣库。':'密码已重置，请用新密码登录。'});return true
  }
  if(['/api/account/register','/api/account/login'].includes(path) && req.method==='POST') {
   const key=req.socket.remoteAddress
   const attempt=attempts.get(key) || {count:0,until:Date.now()+600000}
   if(attempt.until<Date.now()){attempt.count=0;attempt.until=Date.now()+600000}
   if(++attempt.count>30){send(429,{error:'操作频繁，请十分钟后重试'});return true}
   attempts.set(key,attempt)
   const data=await body(req),email=String(data.email||'').trim().toLowerCase(), pass=String(data.password||'')
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || pass.length<10 || pass.length>128) throw Error('请输入有效邮箱及10至128位密码')
   let account
   if(path.endsWith('register')) {
    if(data.consent!==true) throw Error('请确认资料与衣物用于保存及管理员审核')
    if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw Error('该邮箱已注册')
    const id=randomBytes(16).toString('hex')
    const role='user'
    db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)').run(id,email,String(data.name||'衣库用户').slice(0,40),password(pass),role,new Date().toISOString())
    account=db.prepare('SELECT * FROM users WHERE id=?').get(id)
   } else {
    account=db.prepare('SELECT * FROM users WHERE email=?').get(email)
    const salt=account?.password.split(':')[0] || 'missing'
    const computed=password(pass,salt)
    if(!account || computed.length!==account.password.length || !timingSafeEqual(Buffer.from(computed),Buffer.from(account.password))) throw Error('邮箱或密码错误')
   }
   if(path.endsWith('register')) await issueToken(account,'verify')
   const token=randomBytes(32).toString('hex')
   db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),account.id,Date.now()+7*86400000)
   res.setHeader('Set-Cookie',`yiku_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`)
   send(200,{user:publicUser(account)});return true
  }
  if(!user){send(401,{error:'请先登录'});return true}
  if(path==='/api/account/logout' && req.method==='POST') {
   const token=/(?:^|;\s*)yiku_session=([^;]+)/.exec(req.headers.cookie||'')?.[1]
   if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token))
   res.setHeader('Set-Cookie','yiku_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
   send(200,{ok:true});return true
  }
  if(path==='/api/account/wardrobe') {
   if(req.method==='GET') {
    const row=db.prepare('SELECT * FROM wardrobe WHERE userId=?').get(user.id)
    send(200,{data:row?JSON.parse(row.data):{clothes:[],looks:[]},version:row?.version??0});return true
   }
   if(req.method==='PUT') {
    if(!user.verified){send(403,{error:'请先验证邮箱，再保存衣物到账号'});return true}
    const input=await body(req)
    if(!Array.isArray(input.data?.clothes)||!Array.isArray(input.data?.looks)||input.data.clothes.length>1000||input.data.looks.length>1000) throw Error('衣库数据格式无效')
    for(const item of input.data.clothes) {
     if(typeof item.id!=='string'||typeof item.name!=='string'||typeof item.category!=='string') throw Error('衣物信息不完整')
     if(item.photo && !/^data:image\/(webp|jpeg|png);base64,[a-zA-Z0-9+/=]+$/.test(item.photo)) throw Error('图片格式无效')
    }
    const result=db.prepare('INSERT INTO wardrobe(userId,data,version) VALUES(?,?,1) ON CONFLICT(userId) DO UPDATE SET data=excluded.data,version=wardrobe.version+1 WHERE wardrobe.version=? RETURNING version').get(user.id,JSON.stringify(input.data),input.version)
    if(!result){send(409,{error:'衣库已在其他页面更新，请刷新后继续'});return true}
    send(200,{version:result.version});return true
   }
  }
  if(path.startsWith('/api/admin')) {
   if(user.role!=='admin'){send(403,{error:'仅管理员可访问'});return true}
   if(path==='/api/admin/users' && req.method==='GET') {
    const users=db.prepare('SELECT id,email,name,role,created FROM users ORDER BY created DESC').all()
    send(200,{users});return true
   }
   const match=/^\/api\/admin\/users\/([a-f0-9]+)$/.exec(path)
   if(match && req.method==='GET') {
    const account=db.prepare('SELECT * FROM users WHERE id=?').get(match[1])
    if(!account){send(404,{error:'用户不存在'});return true}
    const row=db.prepare('SELECT data FROM wardrobe WHERE userId=?').get(account.id)
    send(200,{user:publicUser(account),data:row?JSON.parse(row.data):{clothes:[],looks:[]},reviews:db.prepare('SELECT * FROM reviews WHERE userId=?').all(account.id)});return true
   }
   if(path==='/api/admin/review' && req.method==='POST') {
    const data=await body(req)
    if(!['待审核','通过','需修改'].includes(data.status))throw Error('审核状态无效')
    const row=db.prepare('SELECT data FROM wardrobe WHERE userId=?').get(data.userId)
    if(!row||!JSON.parse(row.data).clothes.some(item=>item.id===data.itemId))throw Error('衣物不存在')
    db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?,?) ON CONFLICT(userId,itemId) DO UPDATE SET status=excluded.status,note=excluded.note,reviewer=excluded.reviewer,updated=excluded.updated').run(data.userId,data.itemId,data.status,String(data.note||'').slice(0,500),user.id,new Date().toISOString())
    send(200,{ok:true});return true
   }
  }
  send(404,{error:'接口不存在'})
 } catch(error) {send(400,{error:error.message || '操作失败'})}
 return true
}
