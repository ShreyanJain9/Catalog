# Catalog

A small, text-edited HTML site curating things in the orbit of malleable
computing, end-user programming, and interactive media.

## How to edit

- **Curated entries** — edit `catalog.md`. Entries are separated by `---`. The
  first section is the intro; everything after is a card. Markdown is rendered
  with `marked`.
- **Style** — edit `style.css`.
- **Behavior** — edit `app.js` (fetches `catalog.md` and pulls live
  collections from Semble via ATProto).
- **Structure** — edit `index.html`.

## Semble integration

Live collections are fetched directly from the user's PDS via
`com.atproto.repo.listRecords`. The DID is hardcoded in `app.js` so it's
robust to handle changes. Lexicons used:

- `network.cosmik.collection`
- `network.cosmik.collectionLink`
- `network.cosmik.card`

## Running locally

Any static file server works. From this directory:

    python3 -m http.server 8000

then open <http://localhost:8000>.
