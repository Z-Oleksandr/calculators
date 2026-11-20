# eggs# — everyday calculators

A small Express site with fun, privacy-friendly calculators, in English, German and Ukrainian (`/`, `/de`, `/uk`).

| Page           | Path         | What it does                                                                           |
| -------------- | ------------ | -------------------------------------------------------------------------------------- |
| Eggs           | `/`          | Eggs eaten in a period, plus weight, protein, cost, hens needed and a lifetime outlook |
| Working days   | `/workCalc`  | Working days and hours minus public holidays and days off, with pay and eggs eaten     |
| Egg timer      | `/egg-timer` | Boiling time from egg size, starting temperature and altitude, with an alarm           |
| Age            | `/age`       | Age in days, hours and heartbeats, and the next round-number day                       |
| Countdown      | `/countdown` | Days, weeks and working days until a date                                              |
| Pizza          | `/pizza`     | Price per area comparison                                                              |
| Split the bill | `/split`     | Tip and per-person share, optionally rounded up                                        |

All calculations run in the browser. Inputs are kept in the URL (shareable links) and in
`localStorage`. Public holidays come from [Nager.Date](https://date.nager.at) through a cached,
rate-limited proxy at `/api/holidays/...`, so visitors never contact the third party directly.

## Development

Requires Node.js 24.

```sh
npm ci
npm run build_dev   # webpack in watch mode
npm run dev         # server with --watch, reads .env if present
npm run check       # lint, formatting and tests
```

## Configuration

| Variable   | Default | Purpose                                                                                                         |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `PORT`     | `3030`  | HTTP port (`3032` in the container)                                                                             |
| `NODE_ENV` |         | `production` enables view caching and long-lived static caching                                                 |
| `SITE_URL` |         | Public origin, e.g. `https://eggs.example.com`. Enables canonical/hreflang links, `og:image` and `/sitemap.xml` |

## Deployment

```sh
docker compose up -d --build
```

The image is a multi-stage build that runs as a non-root user without npm. The compose file runs it
with a read-only filesystem, no capabilities and resource limits. The container needs outbound
HTTPS to `date.nager.at` for public holidays; without it the calculators still work and say that
holidays could not be loaded.
