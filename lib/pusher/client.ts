import PusherJs from 'pusher-js'

/**
 * Lazy-initialized Pusher browser client.
 *
 * The constructor `new PusherJs(...)` is deferred until the first property
 * access on `pusherClient`. This avoids the Turbopack/SSR crash where
 * `pusher-js` resolves to its Node.js build (dist/node/pusher.js) whose
 * default export is not a constructor.
 *
 * All consumers access `pusherClient` inside useEffect / event handlers
 * (client-only), so the lazy init always runs in the browser where the
 * web build is used.
 */
let _client: PusherJs | null = null

function getClient(): PusherJs {
  if (!_client) {
    _client = new PusherJs(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      },
    )
  }
  return _client
}

export const pusherClient = new Proxy({} as PusherJs, {
  get(_target, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})