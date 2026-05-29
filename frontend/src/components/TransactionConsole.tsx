import type { ActivityItem } from "../types/task";
import { blockExplorer, shortHash } from "../lib/format";

export function TransactionConsole({ items }: { items: ActivityItem[] }) {
  return (
    <aside className="console-panel">
      <div className="console-topline">
        <span>transaction wire</span>
        <i />
      </div>
      <div className="console-feed">
        {items.length === 0 ? (
          <p className="console-empty">No filings yet. Submit a transaction and the wire will wake up.</p>
        ) : items.map((item) => (
          <div key={item.id} className={`console-item console-item--${item.tone ?? "neutral"}`}>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
            {item.hash ? <a href={blockExplorer(item.hash)} target="_blank" rel="noreferrer">{shortHash(item.hash)}</a> : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
