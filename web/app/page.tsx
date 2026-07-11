const proofs = [
  {
    label: "Grounded",
    detail: "Real prices, real clinics",
    chip: "bg-band-primary-soft",
    dot: "bg-band-primary",
  },
  {
    label: "Guarded",
    detail: "911/988 before any AI",
    chip: "bg-band-crisis-soft",
    dot: "bg-band-crisis",
  },
  {
    label: "Personal",
    detail: "Remembers you, call to call",
    chip: "bg-band-self-care-soft",
    dot: "bg-band-self-care",
  },
] as const;

// Clara's public call-in line — the Vapi toll-free number, checked in as the
// default so a placeholder can never render. NEXT_PUBLIC_CLARA_PHONE overrides
// it, but is inlined at build time: changing it requires a rebuild.
const phone = process.env.NEXT_PUBLIC_CLARA_PHONE ?? "+1 (848) 249-1409";
const tel = phone.replace(/[^+\d]/g, "");

export default function Home() {
  return (
    <main className="flex flex-1 items-center bg-shell px-6 py-16 sm:px-12">
      <div className="mx-auto w-full max-w-2xl space-y-12">
        <header className="space-y-5">
          <p className="text-sm font-medium tracking-wide text-accent">
            Clara — a voice AI care line
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            The care line that keeps you safe first.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink-muted">
            Clara listens, checks for danger before anything else, and grounds
            every suggestion in real prices and real clinics near you.
          </p>
        </header>

        <section aria-label="Call Clara">
          <p className="mb-2 text-sm text-ink-muted">Call now</p>
          <a
            href={`tel:${tel}`}
            className="inline-block rounded-lg py-2 font-mono text-3xl font-medium tabular-nums text-accent underline decoration-2 underline-offset-8 transition-opacity duration-150 ease-out hover:opacity-80 sm:text-4xl"
          >
            {phone}
          </a>
        </section>

        <ul className="flex flex-wrap gap-3" aria-label="Why Clara">
          {proofs.map((p) => (
            <li
              key={p.label}
              className={`inline-flex items-center gap-2.5 rounded-full py-2 pl-3 pr-4 ${p.chip}`}
            >
              <span aria-hidden className={`size-2 rounded-full ${p.dot}`} />
              <span className="text-sm font-medium text-ink">{p.label}</span>
              <span className="text-sm text-ink-muted">{p.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
