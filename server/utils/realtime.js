const clients = new Set()

export function addRealtimeClient(client) {
  clients.add(client)
  return () => clients.delete(client)
}

export function broadcastRealtime(event, payload = {}) {
  const message = `data: ${JSON.stringify({ event, payload, ts: Date.now() })}\n\n`
  for (const client of clients) {
    try {
      client.write(message)
    } catch {
      clients.delete(client)
    }
  }
}
