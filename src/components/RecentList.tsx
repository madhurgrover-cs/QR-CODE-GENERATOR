import { QR_TYPES } from '../lib/qrData'
import type { RecentQR } from '../lib/storage'

interface Props {
  items: RecentQR[]
  onUse: (item: RecentQR) => void
  onRemove: (id: string) => void
  onClear: () => void
}

const typeLabel = (t: RecentQR['type']) => QR_TYPES.find((q) => q.id === t)?.label ?? t

export function RecentList({ items, onUse, onRemove, onClear }: Props) {
  return (
    <section className="card recent" aria-labelledby="recent-h">
      <div className="recent-head">
        <h2 id="recent-h">Recent QR codes</h2>
        {items.length > 0 && (
          <button type="button" className="link" onClick={onClear}>Clear all</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="hint">Codes you download, copy or save appear here and are kept on this device.</p>
      ) : (
        <ul className="recent-list">
          {items.map((r) => (
            <li key={r.id}>
              <button type="button" className="recent-item" onClick={() => onUse(r)} title="Load this QR code">
                <img src={r.thumbnail} alt="" width={56} height={56} />
                <span className="recent-text">
                  <span className="tag">{typeLabel(r.type)}</span>
                  <span className="recent-label">{r.label}</span>
                  <time dateTime={new Date(r.createdAt).toISOString()}>{new Date(r.createdAt).toLocaleString()}</time>
                </span>
              </button>
              <button type="button" className="icon-btn" aria-label={`Remove ${r.label}`} onClick={() => onRemove(r.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
