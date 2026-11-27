import { mkdirSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export async function sendAccountMail(email, purpose, token) {
 const base = process.env.PUBLIC_URL || 'http://127.0.0.1:4180'
 const url = new URL('/', base)
 url.hash = new URLSearchParams({ action: purpose, token }).toString()
 const subject = purpose === 'verify' ? '验证衣库邮箱' : '重置衣库密码'
 const text = `${subject}\n\n请打开链接继续：\n${url.href}\n\n链接30分钟内有效，只能使用一次。如非本人操作，可忽略本邮件。`
 if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
  const response = await fetch('https://api.resend.com/emails', {
   method:'POST',
   headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject,text}),
   signal:AbortSignal.timeout(15000),
  })
  if(!response.ok)throw Error('邮件发送失败，请稍后重试')
  return 'email'
 }
 if (process.env.NODE_ENV === 'production' || !['127.0.0.1','localhost'].includes(new URL(base).hostname)) {
  throw Error('邮件服务尚未配置，请联系管理员')
 }
 const folder=fileURLToPath(new URL('./data/mail-outbox/',import.meta.url))
 mkdirSync(folder,{recursive:true,mode:0o700})
 writeFileSync(folder+Date.now()+'-'+randomBytes(6).toString('hex')+'.json',
  JSON.stringify({to:email,purpose,url:url.href,text},null,2),{mode:0o600})
 return 'local'
}
