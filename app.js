import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";

const DID = "did:plc:bnqkww7bjxaacajzvu5gswdf";
const PDS = "https://pds.shreyanjain.net";

marked.setOptions({ gfm: true, breaks: false });

// ---------- catalog.md ----------

async function renderCatalog() {
  const intro = document.getElementById("intro");
  const catalog = document.getElementById("catalog");

  let text;
  try {
    const res = await fetch("catalog.md", { cache: "no-cache" });
    if (!res.ok) throw new Error(`catalog.md returned ${res.status}`);
    text = await res.text();
  } catch (err) {
    intro.innerHTML = `<p class="error">Couldn't load catalog.md — ${err.message}</p>`;
    return;
  }

  const chunks = text.split(/\n---+\n/);
  const [introChunk, ...entryChunks] = chunks;

  intro.innerHTML = marked.parse(introChunk.trim());

  catalog.innerHTML = entryChunks
    .map((chunk) => `<article class="entry">${marked.parse(chunk.trim())}</article>`)
    .join("");
}

// ---------- semble (atproto) ----------

async function listAll(collection) {
  const records = [];
  let cursor;
  do {
    const url = new URL(`${PDS}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.set("repo", DID);
    url.searchParams.set("collection", collection);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${collection} ${res.status}`);
    const data = await res.json();
    records.push(...data.records);
    cursor = data.cursor && data.records.length ? data.cursor : undefined;
  } while (cursor);
  return records;
}

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return ""; }
}

function renderUrlCard(card, notes) {
  const c = card.value.content || {};
  const meta = c.metadata || {};
  const url = c.url || "";
  const title = meta.title || url;
  const desc = meta.description || "";
  const noteHtml = notes
    .map((n) => `<p class="card-note">${escapeHtml(n.value?.content?.text || "")}</p>`)
    .join("");
  return `
    <div class="card">
      <span class="card-host">${escapeHtml(hostOf(url))}</span>
      <p class="card-title"><a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></p>
      ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : ""}
      ${noteHtml}
    </div>
  `;
}

function renderStandaloneNote(note) {
  const text = note.value?.content?.text || "";
  return `<div class="card"><p class="card-note" style="border-left-color: var(--accent)">${escapeHtml(text)}</p></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }

async function renderSemble() {
  const body = document.getElementById("semble-body");
  try {
    const [collections, links, cards] = await Promise.all([
      listAll("network.cosmik.collection"),
      listAll("network.cosmik.collectionLink"),
      listAll("network.cosmik.card"),
    ]);

    const cardByUri = new Map(cards.map((c) => [c.uri, c]));

    // notes whose parentCard is another card => annotations
    const notesByParent = new Map();
    for (const c of cards) {
      if (c.value?.type === "NOTE" && c.value?.parentCard?.uri) {
        const parent = c.value.parentCard.uri;
        if (!notesByParent.has(parent)) notesByParent.set(parent, []);
        notesByParent.get(parent).push(c);
      }
    }

    // group collectionLinks by collection uri
    const linksByCollection = new Map();
    for (const l of links) {
      const colUri = l.value?.collection?.uri;
      if (!colUri) continue;
      if (!linksByCollection.has(colUri)) linksByCollection.set(colUri, []);
      linksByCollection.get(colUri).push(l);
    }

    if (collections.length === 0) {
      body.innerHTML = `<p class="muted">No collections yet.</p>`;
      return;
    }

    // newest-first by collection createdAt
    collections.sort((a, b) => (b.value.createdAt || "").localeCompare(a.value.createdAt || ""));

    body.innerHTML = collections
      .map((col) => {
        const colLinks = linksByCollection.get(col.uri) || [];
        // newest-first within collection
        colLinks.sort((a, b) => (b.value.addedAt || "").localeCompare(a.value.addedAt || ""));

        const cardsHtml = colLinks
          .map((link) => {
            const card = cardByUri.get(link.value?.card?.uri);
            if (!card) return "";
            if (card.value?.type === "URL") {
              const notes = notesByParent.get(card.uri) || [];
              return renderUrlCard(card, notes);
            }
            if (card.value?.type === "NOTE" && !card.value?.parentCard) {
              return renderStandaloneNote(card);
            }
            return "";
          })
          .filter(Boolean)
          .join("");

        const desc = col.value.description
          ? `<p class="desc">${escapeHtml(col.value.description)}</p>`
          : "";
        const access = col.value.accessType === "CLOSED" ? " · private" : "";

        return `
          <section class="collection">
            <header class="collection-header">
              <h3>${escapeHtml(col.value.name || "Untitled")}</h3>
              ${desc}
              <p class="count">${colLinks.length} item${colLinks.length === 1 ? "" : "s"}${access}</p>
            </header>
            <div class="cards">${cardsHtml || `<p class="muted">No items.</p>`}</div>
          </section>
        `;
      })
      .join("");
  } catch (err) {
    body.innerHTML = `<p class="error">Couldn't load Semble — ${escapeHtml(err.message)}</p>`;
  }
}

renderCatalog();
renderSemble();
