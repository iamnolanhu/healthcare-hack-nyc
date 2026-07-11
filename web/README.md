# Clara — web

Judge-facing web app for Clara, a voice AI care line grounded in the care API.

- `/` — landing page: Clara's call-in number and why she's safe to call.
- `/live` — live call dashboard for the demo. Presenter keys: **Space / →** next beat, **R** reset, **1–3** jump between calls; clicking anywhere also advances.

```bash
bun install
bun dev
```

The call-in number on the landing page can be overridden with `NEXT_PUBLIC_CLARA_PHONE` (inlined at build time — rebuild after changing it).
