import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const sharedSavePath = path.join(os.tmpdir(), 'ratinhos-dev-shared-save.json')
let sharedWriteQueue = Promise.resolve()

async function readSharedSave() {
  try {
    const raw = await fs.readFile(sharedSavePath, 'utf8')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function writeSharedSave(value: unknown) {
  await fs.mkdir(path.dirname(sharedSavePath), { recursive: true })
  await fs.writeFile(sharedSavePath, JSON.stringify(value, null, 2), 'utf8')
}

function updateSharedSave(mutator: (current: Record<string, unknown>) => void) {
  const operation = sharedWriteQueue.then(async () => {
    const current = await readSharedSave()
    mutator(current)
    await writeSharedSave(current)
  })
  sharedWriteQueue = operation.catch(() => undefined)
  return operation
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'shared-save-store',
      configureServer(server) {
        server.middlewares.use('/__local-save', async (req, res, next) => {
          if (req.method === 'GET') {
            const data = await readSharedSave()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = []
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            req.on('end', async () => {
              try {
                const body = Buffer.concat(chunks).toString('utf8')
                const parsed = body ? JSON.parse(body) : {}
                await writeSharedSave(parsed)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch (error) {
                res.statusCode = 400
                res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' }))
              }
            })
            return
          }

          if (req.method === 'PATCH') {
            const chunks: Buffer[] = []
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { key: string; value?: unknown; remove?: boolean }
                await updateSharedSave((store) => {
                  if (body.remove) delete store[body.key]
                  else store[body.key] = body.value
                })
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch (error) {
                res.statusCode = 400
                res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'invalid patch' }))
              }
            })
            return
          }

          next()
        })
      },
    },
  ],
  server: {
    proxy: {
      '/tmdb-img': {
        target: 'https://image.tmdb.org/t/p',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmdb-img/, ''),
      },
    },
  },
})
