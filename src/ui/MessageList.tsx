import type { GameMessage } from '../game'

export type MessageListProps = Readonly<{
  messages: ReadonlyArray<GameMessage>
}>

const kindColor: Record<GameMessage['kind'], string> = {
  info: '#e5e7eb',
  error: '#fca5a5',
  hit: '#fecaca',
  miss: '#bfdbfe',
  sunk: '#fde68a',
  win: '#86efac',
  lose: '#fca5a5',
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Messages</h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minHeight: 80,
          padding: 10,
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: '#0b1020',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>No messages yet.</div>
        ) : (
          messages.slice(-8).map((m, idx) => (
            <div
              key={idx}
              style={{
                color: kindColor[m.kind],
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              {m.text}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
