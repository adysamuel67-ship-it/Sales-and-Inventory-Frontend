import fs from 'fs'
import path from 'path'

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')

describe('installable offline shell', () => {
  it('ships a standalone manifest with installable icons', () => {
    const manifest = JSON.parse(read('public/manifest.json'))
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons?.some((icon: any) => icon.sizes === '192x192')).toBe(true)
    expect(manifest.icons?.some((icon: any) => icon.sizes === '512x512')).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'public/icon-192.png'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'public/icon-512.png'))).toBe(true)
  })

  it('precaches the app shell and keeps previously visited pages available offline', () => {
    const sw = read('public/sw.js')
    expect(sw).toContain("'/offline.html'")
    expect(sw).toContain("'/manifest.json'")
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).toContain("caches.match(OFFLINE_URL)")
    expect(sw).toContain("/_next/static/")
    expect(sw).toContain("'bbgh-outbox'")
    expect(sw).toContain("BBGH_CLEAR_CACHES")
  })

  it('registers the service worker and links the manifest from the app layout', () => {
    expect(read('src/components/ServiceWorkerRegister.tsx')).toContain("register('/sw.js'")
    const layout = read('src/app/layout.tsx')
    expect(layout).toContain('/manifest.json')
    expect(layout).toContain('<OfflineBanner />')
    expect(layout).toContain('<OfflineSyncProvider />')
  })
})
