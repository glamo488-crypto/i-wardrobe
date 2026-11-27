import { useEffect, useState, type FormEvent } from 'react'
export type User = {id:string;email:string;name:string;role:string;verified:boolean}
export async function api(path:string, method='GET', data?:unknown) {
 const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)})
 const result=await response.json()
 if(!response.ok)throw Error(result.error || '请求失败')
 return result
}
export function Account({ user, onUser, onSave, message }: {
 user:User|null;onUser:(user:User|null)=>Promise<void>;onSave:()=>Promise<void>;message:string
}) {
 const [forgot,setForgot]=useState(false)
 const [register,setRegister]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('')
  try{
   if(forgot){
    const result=await api('/api/account/forgot','POST',{email:form.get('email')})
    setError(result.message);return
   }
   const result=await api('/api/account/'+(register?'register':'login'),'POST',{email:form.get('email'),password:form.get('password'),name:form.get('name'),consent:form.get('consent')==='on'})
   await onUser(result.user)
  }catch(error){setError((error as Error).message)}finally{setBusy(false)}
 }
 return <section className="account-panel">
 {user?<>
  <strong>{user.name}</strong><p>{user.email} · {user.verified?'邮箱已验证':'邮箱待验证'}</p>
  {!user.verified&&<button className="pill" disabled={busy} onClick={async()=>{
    setBusy(true);try{const result=await api('/api/account/resend','POST',{email:user.email});setError(result.message)}catch(error){setError((error as Error).message)}finally{setBusy(false)}
  }}>重新发送验证邮件</button>}
  <div className="options"><button className="pill" disabled={busy||!user.verified} onClick={async()=>{setBusy(true);try{await onSave()}finally{setBusy(false)}}}>保存到账号</button>
  <button className="pill" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/account/logout','POST');await onUser(null)}catch(error){setError((error as Error).message)}finally{setBusy(false)}}}>退出登录</button>
  {user.role==='admin'&&<a className="pill" href="/admin">管理后台</a>}</div>
 </>:<>
 <h2>{forgot?'找回密码':'登录我的衣库'}</h2><p>保存资料、衣物和收藏，方便下次继续使用。</p>
 <form onSubmit={submit}>
 <fieldset disabled={busy}>
 {register&&!forgot&&<label>昵称<input name="name" required maxLength={40}/></label>}
 <label>邮箱<input name="email" type="email" required autoComplete="email"/></label>
 {!forgot&&<label>密码<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={register?'new-password':'current-password'}/></label>}
 {register&&!forgot&&<label><input name="consent" type="checkbox" required/>同意保存账号资料、衣物与收藏，并由管理员查看和审核上传内容。</label>}
 <button className="primary">{busy?'处理中…':forgot?'发送重置邮件':register?'注册账号':'登录'}</button>
 </fieldset>
 </form>
 <button className="pill" onClick={()=>{setRegister(!register);setForgot(false);setError('')}}>{register?'已有账号，去登录':'创建账号'}</button>
 <button className="pill" onClick={()=>{setForgot(!forgot);setRegister(false);setError('')}}>{forgot?'返回登录':'忘记密码'}</button>
 </>}
 <p role="status">{error||message}</p>
 </section>
}
export function Admin(){
 const [users,setUsers]=useState<User[]>([]),[detail,setDetail]=useState<any>(null),[error,setError]=useState('')
 useEffect(()=>{api('/api/admin/users').then(result=>setUsers(result.users)).catch(error=>setError(error.message))},[])
 async function open(id:string){try{setDetail(await api('/api/admin/users/'+id));setError('')}catch(error){setError((error as Error).message)}}
 return <main className="admin-page"><h1>衣库管理后台</h1><a href="/">返回衣库</a><p role="status">{error}</p>
 <h2>用户 · {users.length}</h2>
 <div className="options">{users.map(user=><button className="pill" key={user.id} onClick={()=>open(user.id)}>{user.name} · {user.email}</button>)}</div>
 {detail&&<section><h2>{detail.user.name}的上传</h2><p>{detail.user.email} · 衣物 {detail.data.clothes.length} · 收藏 {detail.data.looks.length}</p>
 <div className="garments">{detail.data.clothes.map((item:any)=><article className="account-panel" key={item.id}>
 {item.photo&&<img className="uploaded-photo" src={item.photo} alt={item.name||item.category}/>}
 <h3>{item.name||item.category}</h3><p>{item.category} · {item.status||'可穿'}</p>
 <p>{Object.values(item.tags||{}).join(' · ')}</p>
 <form onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);try{await api('/api/admin/review','POST',{userId:detail.user.id,itemId:item.id,status:form.get('status'),note:form.get('note')});await open(detail.user.id)}catch(error){setError((error as Error).message)}}}>
 <label>审核状态<select name="status" defaultValue={detail.reviews.find((r:any)=>r.itemId===item.id)?.status||'待审核'}>{['待审核','通过','需修改'].map(value=><option key={value}>{value}</option>)}</select></label>
 <label>审核备注<input name="note" maxLength={500} defaultValue={detail.reviews.find((r:any)=>r.itemId===item.id)?.note||''}/></label>
 <button className="pill">保存审核</button></form></article>)}</div>
 <h2>收藏 Look</h2>{detail.data.looks.map((look:any)=><article className="account-panel" key={look.id}><h3>{look.name||look.title}</h3><p>{look.items.map((item:any)=>item.name||item.category).join(' ＋ ')}</p></article>)}
 </section>}</main>
}

export function EmailAction() {
 const [params] = useState(() => new URLSearchParams(location.hash.slice(1)))
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 useEffect(()=>{history.replaceState(null,'',location.pathname)},[])
 const reset=params.get('action')==='reset'
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault()
  const form=new FormData(event.currentTarget)
  if(reset && form.get('password')!==form.get('confirm')){setMessage('两次密码不一致');return}
  setBusy(true)
  try{
   const result=await api('/api/account/'+(reset?'reset':'verify'),'POST',{token:params.get('token'),password:form.get('password')})
   setMessage(result.message)
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }
 return <main><section className="account-panel"><h1>{reset?'设置新密码':'验证邮箱'}</h1>
 <form onSubmit={submit}><fieldset disabled={busy}>
 {reset&&<><label>新密码<input name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password"/></label>
 <label>确认新密码<input name="confirm" type="password" minLength={10} maxLength={128} required autoComplete="new-password"/></label></>}
 <button className="primary">{busy?'处理中…':reset?'重置密码':'确认验证邮箱'}</button>
 </fieldset></form><p role="status">{message}</p><a className="pill" href="/">返回衣库登录</a></section></main>
}
