import { spawn } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

const executable = fileURLToPath(new URL('./recognize', import.meta.url))

export async function recognize(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json')
  function reply(code: number, value: string) {
    res.statusCode = code
    res.end(value)
  }
  if (req.method !== 'POST') return reply(405, '{}')
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` &&
      req.headers.origin !== `https://${req.headers.host}`) return reply(403, '{}')
  if (req.headers['content-type'] !== 'image/jpeg') return reply(415, '{}')

  const chunks: Buffer[] = []
  let size = 0
  try {
    for await (const chunk of req) {
      size += chunk.length
      if (size > 512 * 1024) return reply(413, '{}')
      chunks.push(chunk)
    }
    const output = await new Promise<string>((resolve, reject) => {
      const process = spawn(executable, [], { timeout: 20000 })
      let json = ''
      process.stdout.setEncoding('utf8').on('data', chunk => { json += chunk })
      process.on('error', reject)
      process.stdin.on('error', reject)
      process.on('close', code => code === 0 ? resolve(json) : reject(Error('Recognition failed')))
      process.stdin.end(Buffer.concat(chunks))
    })
    reply(200, output)
  } catch {
    reply(503, '{}')
  }
}
