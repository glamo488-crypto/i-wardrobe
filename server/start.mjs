import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, extname, sep } from 'node:path'
import { accounts } from './accounts.mjs'
import { recognize } from './recognition.ts'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const port = Number(process.env.PORT || 4173)
const host = process.env.HOST || '127.0.0.1'
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

if (!existsSync(resolve(root, 'index.html'))) {
  console.error('请先执行 npm run build。')
  process.exit(1)
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'same-origin')
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (await accounts(request, response, pathname)) return
    if (pathname === '/api/health') {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ status: 'ok', recognition: existsSync(fileURLToPath(new URL('./recognize', import.meta.url))) }))
      return
    }
    if (pathname === '/api/wardrobe/recognize') {
      await recognize(request, response)
      return
    }
    if (pathname.startsWith('/api/')) {
      response.writeHead(404).end()
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end()
      return
    }
    const requested = resolve(root, '.' + pathname)
    if (!requested.startsWith(root + sep) && requested !== root) {
      response.writeHead(403).end()
      return
    }
    let file = requested
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, 'index.html')
    } catch {
      if (extname(pathname)) {
        response.writeHead(404).end()
        return
      }
      file = resolve(root, 'index.html')
    }
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
    response.setHeader('Cache-Control', file.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache')
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    const stream = createReadStream(file)
    stream.on('error', () => response.destroy())
    stream.pipe(response)
  } catch {
    if (!response.headersSent) response.writeHead(400)
    response.end()
  }
})
server.requestTimeout = 30000
server.listen(port, host, () => console.log(`衣库 http://${host}:${port}`))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 5000).unref()
  })
}
