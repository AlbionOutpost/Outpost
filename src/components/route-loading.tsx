import styles from "./route-loading.module.css";

/**
 * Personal and live routes while they stream: an empty masthead in the real one's place, then
 * three quiet wells. Their loading.tsx re-exports it. Content pages (the landing, guides, tools,
 * the build and comp libraries, items, market data help) have no loading boundary, so their text
 * is in the first HTML and paints with it; React reveals a streamed boundary at least 300 ms after
 * the first paint, and crawlers would only see this skeleton. tests/route-loading.test.ts keeps
 * the split.
 */
export default function RouteLoading() {
  return (
    <div role="status" className={styles.loading}>
      <div className="workspace-identity" data-scene="page" aria-hidden="true">
        <div className="workspace-identity-copy">
          <div className="workspace-identity-head">
            <span className={`workspace-emblem ${styles.emblem}`} />
            <div className={styles.copy}>
              <span className={styles.title} />
              <span className={styles.line} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.grid} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.block} />
        ))}
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
