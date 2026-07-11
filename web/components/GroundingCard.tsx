import type { ToolData, ToolKind } from "@/lib/events";

/**
 * GroundingCard — the proof column (~40% width) on the live dashboard.
 * Renders one card per tool interaction, oldest first: new cards append at
 * the bottom (the aside pins its scroll there), so both columns read as one
 * system — new information always arrives at the bottom edge, and nothing is
 * displaced when a card enters. A `tool_call` without its `tool_result` yet
 * renders as a pending card (kind label + static skeleton lines —
 * deliberately shimmer-free). Every number is Geist Mono with tabular-nums:
 * mono is the credibility signal, never decorative.
 */

export interface GroundingResult {
  kind: ToolKind;
  /** Absent while the tool_call is still in flight → pending state. */
  data?: ToolData;
}

export interface GroundingCardProps {
  /** Oldest-first as events land; rendered in arrival order. */
  results: GroundingResult[];
}

const KIND_LABEL: Record<ToolKind, string> = {
  find_clinics: "Nearby clinic",
  med_price: "Med price",
  care_info: "Care info",
  housing_check: "Housing check",
};

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function KindLabel({ kind }: { kind: ToolKind }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
      {KIND_LABEL[kind]}
      {kind === "med_price" && (
        <span className="normal-case tracking-normal">
          {" "}
          — cash prices via care API
        </span>
      )}
    </p>
  );
}

function ResultBody({ data }: { data: ToolData }) {
  switch (data.kind) {
    case "find_clinics":
      return (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[15px] font-medium leading-snug">
              {data.name}
            </h3>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink-muted">
              {data.distanceMi.toFixed(1)} mi
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-snug text-ink-muted">
            {data.address}
          </p>
          {data.slidingScale && (
            <span className="mt-2.5 inline-flex items-center rounded-full bg-accent px-2 py-1 text-[11px] font-medium leading-none text-white">
              sliding scale
            </span>
          )}
        </div>
      );

    case "med_price":
      return (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[15px] font-medium leading-snug">
              {data.name}
            </h3>
            {data.rxcui && (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                RXCUI {data.rxcui}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-medium tabular-nums">
                {usd(data.cashPrice)}
              </span>
              <span className="text-xs text-ink-muted">cash</span>
            </span>
            {data.goodRxPrice !== undefined && (
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm tabular-nums text-ink-muted">
                  {usd(data.goodRxPrice)}
                </span>
                <span className="text-xs text-ink-muted">GoodRx</span>
              </span>
            )}
          </div>
        </div>
      );

    case "care_info":
      return (
        <div>
          <h3 className="text-[15px] font-medium leading-snug">{data.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-muted">
            {data.summary}
          </p>
        </div>
      );

    case "housing_check":
      return (
        <p className="text-sm leading-snug text-ink-muted">{data.summary}</p>
      );
  }
}

function PendingBody() {
  return (
    <div>
      <div aria-hidden="true" className="space-y-2">
        <div className="h-3 w-3/5 rounded-full bg-line" />
        <div className="h-3 w-2/5 rounded-full bg-line" />
      </div>
      <span className="sr-only">Checking the care API…</span>
    </div>
  );
}

function Card({ kind, data }: GroundingResult) {
  return (
    <article
      aria-busy={data === undefined}
      className="rounded-xl border border-line bg-surface p-4 animate-[gc-rise_200ms_var(--ease-out)_both] motion-reduce:animate-none"
    >
      <KindLabel kind={data?.kind ?? kind} />
      <div className="mt-2">
        {data ? <ResultBody data={data} /> : <PendingBody />}
      </div>
    </article>
  );
}

export function GroundingCard({ results }: GroundingCardProps) {
  return (
    <section aria-label="Grounded results" className="flex flex-col gap-3">
      <style>{`@keyframes gc-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {results.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Grounded results appear here as Clara checks the care API.
        </p>
      ) : (
        // Stable keys (index — the stream is append-only within a call) so
        // existing cards keep their DOM nodes when a new one lands at the
        // bottom — only the newest card plays the entrance.
        results.map((r, i) => <Card key={i} kind={r.kind} data={r.data} />)
      )}
    </section>
  );
}

export default GroundingCard;
