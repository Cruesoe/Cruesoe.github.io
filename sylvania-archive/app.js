const STATUS_LABEL = { current: "Current", discontinued: "Vintage", reissue: "Reissued" };
const STATUS_CLASS = { current: "", discontinued: "vintage", reissue: "reissue" };
const WARM = new Set(["Rabbit", "Squirrel", "Fox", "Bear"]);

const state = {
  data: null,
  query: "",
  era: "all",
  group: "all",
  role: "all",
  status: "all",
  sort: "year-desc",
  view: "figures",
  filtersOpen: false,
  selectedId: null,
};

const $ = (sel) => document.querySelector(sel);

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const family = hash.match(/^\/family\/([^/?]+)/);
  return family ? { page: "family", familyId: decodeURIComponent(family[1]) } : { page: "home" };
}

function go(path) {
  location.hash = path;
}

function matchesQuery(hay, query) {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const h = hay.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

function filterFigures() {
  const { figures, roleLabel } = state.data;
  const q = state.query.trim();
  let list = figures.filter((f) => {
    if (state.era !== "all" && f.era !== state.era) return false;
    if (state.group !== "all" && f.group !== state.group) return false;
    if (state.role !== "all" && f.role !== state.role) return false;
    if (state.status !== "all" && f.status !== state.status) return false;
    if (!q) return true;
    return matchesQuery(
      `${f.displayName} ${f.givenName} ${f.surname} ${f.familyName} ${f.species} ${f.group} ${roleLabel[f.role]} ${f.year} ${f.set ?? ""} ${f.notes ?? ""}`,
      q,
    );
  });
  list.sort(sortFn);
  return list;
}

function filterFamilies() {
  const { families, figures } = state.data;
  const q = state.query.trim();
  let list = families.filter((fam) => {
    if (state.era !== "all" && fam.era !== state.era) return false;
    if (state.group !== "all" && fam.group !== state.group) return false;
    if (state.status !== "all" && fam.status !== state.status) return false;
    if (state.role !== "all" && !figures.some((f) => f.familyId === fam.id && f.role === state.role)) return false;
    if (!q) return true;
    return matchesQuery(`${fam.name} ${fam.surname} ${fam.species} ${fam.group} ${fam.year} ${fam.notes ?? ""}`, q);
  });
  list.sort((a, b) => {
    if (state.sort === "year-asc") return a.year - b.year || a.name.localeCompare(b.name);
    if (state.sort === "year-desc") return b.year - a.year || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  return list;
}

function sortFn(a, b) {
  if (state.sort === "year-asc") return a.year - b.year || a.displayName.localeCompare(b.displayName);
  if (state.sort === "year-desc") return b.year - a.year || a.displayName.localeCompare(b.displayName);
  if (state.sort === "family") return a.familyName.localeCompare(b.familyName) || a.year - b.year;
  return a.displayName.localeCompare(b.displayName);
}

function mark(group, size) {
  const cls = `mark${WARM.has(group) ? " warm" : ""}${size === "lg" ? " lg" : ""}`;
  return `<span class="${cls}" aria-hidden="true">${pawSvg()}</span>`;
}

function pawSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>`;
}

function pill(status) {
  return `<span class="pill ${STATUS_CLASS[status] || ""}">${STATUS_LABEL[status]}</span>`;
}

function figureCard(f) {
  const role = state.data.roleLabel[f.role];
  const sub = f.named ? `${role} · ${f.surname}` : `${role} · ${f.familyName.replace(/ Family$/, "")}`;
  const setLine = f.set ? `<p class="meta setline">set ${esc(f.set)}</p>` : "";
  return `<li>
    <article class="card">
      <button type="button" data-open="${f.id}">
        <div class="row">${mark(f.group)}<span class="year">${f.year}</span></div>
        <h3>${esc(f.displayName)}</h3>
        <p class="meta">${esc(sub)}</p>
        ${setLine}
        <div class="foot">${pill(f.status)}<span class="year">${esc(f.species)}</span></div>
      </button>
      <a class="family-link" href="#/family/${encodeURIComponent(f.familyId)}">${esc(f.familyName)}</a>
    </article>
  </li>`;
}

function familyCard(fam) {
  return `<li>
    <a class="card" href="#/family/${encodeURIComponent(fam.id)}">
      <div class="row">${mark(fam.group)}<span class="year">${fam.year}</span></div>
      <h3>${esc(fam.name)}</h3>
      <p class="meta">${esc(fam.species)} · ${esc(fam.surname)}</p>
      <div class="foot">${pill(fam.status)}<span class="year">${fam.figureCount} figure${fam.figureCount === 1 ? "" : "s"}</span></div>
    </a>
  </li>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "\u0026amp;", "<": "\u0026lt;", ">": "\u0026gt;", '"': "\u0026quot;", "'": "\u0026#39;" })[ch],
  );
}

function emptyHtml() {
  return `<div class="empty">
    <h2>No figures match</h2>
    <p>${state.query ? `Nothing found for “${esc(state.query)}”. Try a family name, species or year.` : "Clear a filter to see the catalogue."}</p>
    <button type="button" data-reset>Reset catalogue</button>
  </div>`;
}

function renderHome() {
  const figures = filterFigures();
  const families = filterFamilies();
  const { stats, eras, groups, roles, roleLabel } = state.data;
  const active = [state.era, state.group, state.role, state.status].filter((v) => v !== "all").length;

  let body = "";
  if (state.view === "figures") {
    body = figures.length
      ? `<ul class="grid">${figures.map(figureCard).join("")}</ul>`
      : emptyHtml();
  } else if (state.view === "families") {
    body = families.length
      ? `<ul class="grid">${families.map(familyCard).join("")}</ul>`
      : emptyHtml();
  } else {
    const byYear = new Map();
    for (const fam of families) {
      const list = byYear.get(fam.year) ?? [];
      list.push(fam);
      byYear.set(fam.year, list);
    }
    const years = [...byYear.entries()].sort((a, b) => b[0] - a[0]);
    body = years.length
      ? `<ol class="timeline">${years
          .map(
            ([year, list]) => `<li>
              <p class="timeline-year">${year}</p>
              <div>
                <p class="count">${list.length} famil${list.length === 1 ? "y" : "ies"} first issued</p>
                <ul>${list
                  .map(
                    (fam) => `<li><a href="#/family/${encodeURIComponent(fam.id)}"><span>${esc(fam.name)}</span><span class="species">${esc(fam.species)}</span></a></li>`,
                  )
                  .join("")}</ul>
              </div>
            </li>`,
          )
          .join("")}</ol>`
      : emptyHtml();
  }

  const countLabel =
    state.view === "families"
      ? `${families.length} families`
      : state.view === "timeline"
        ? `${families.length} families by year`
        : `${figures.length} figures`;

  $("#app").innerHTML = `
    <div class="wrap">
      <header class="hero">
        <p class="kicker">1985 — ${stats.yearMax}</p>
        <h1>Sylvania Archive</h1>
        <p class="lede">A searchable catalogue of Sylvanian Families figures — who was manufactured, which family they belong to, and when they first appeared.</p>
        <dl class="stats">
          <div class="stat"><dt>Figures</dt><dd>${stats.figures}</dd></div>
          <div class="stat"><dt>Families</dt><dd>${stats.families}</dd></div>
          <div class="stat"><dt>Species</dt><dd>${stats.species}</dd></div>
        </dl>
      </header>
      <div class="sticky">
        <div class="search-row">
          <div class="search">
            <span class="icon">${searchSvg()}</span>
            <input id="q" type="search" placeholder="Search names, families, species, years…" aria-label="Search the catalogue" value="${esc(state.query)}" />
            ${state.query ? `<button class="clear" type="button" data-clear aria-label="Clear search">${xSvg()}</button>` : ""}
          </div>
          <button class="icon-btn ${state.filtersOpen || active ? "active" : ""}" type="button" data-filters aria-label="Toggle filters">${slidersSvg()}${active ? `<span class="badge-count">${active}</span>` : ""}</button>
        </div>
        <div class="chips">
          ${["all", ...eras].map((era) => `<button type="button" class="chip ${state.era === era ? "on" : ""}" data-era="${era}">${era === "all" ? "All years" : era}</button>`).join("")}
        </div>
        <div class="filters ${state.filtersOpen ? "open" : ""}">
          <label>Species
            <select data-group>
              <option value="all">All species</option>
              ${groups.map((g) => `<option value="${g}" ${state.group === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </label>
          <label>Role
            <select data-role>
              <option value="all">All roles</option>
              ${roles.map((r) => `<option value="${r}" ${state.role === r ? "selected" : ""}>${roleLabel[r]}</option>`).join("")}
            </select>
          </label>
          <label>Status
            <select data-status>
              <option value="all">All status</option>
              <option value="current" ${state.status === "current" ? "selected" : ""}>Current</option>
              <option value="reissue" ${state.status === "reissue" ? "selected" : ""}>Reissued</option>
              <option value="discontinued" ${state.status === "discontinued" ? "selected" : ""}>Vintage</option>
            </select>
          </label>
        </div>
        <div class="toolbar">
          <div class="tabs">
            ${["figures", "families", "timeline"]
              .map((v) => `<button type="button" class="${state.view === v ? "on" : ""}" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`)
              .join("")}
          </div>
          <div class="search-row">
            <p class="count">${countLabel}</p>
            ${
              state.view !== "timeline"
                ? `<select data-sort aria-label="Sort">
                    <option value="year-desc" ${state.sort === "year-desc" ? "selected" : ""}>Newest</option>
                    <option value="year-asc" ${state.sort === "year-asc" ? "selected" : ""}>Oldest</option>
                    <option value="name" ${state.sort === "name" ? "selected" : ""}>Name</option>
                    <option value="family" ${state.sort === "family" ? "selected" : ""}>Family</option>
                  </select>`
                : ""
            }
          </div>
        </div>
      </div>
      ${body}
      <footer class="site-footer">Compiled from public catalogues, collector lists and the Sylvanian Families wiki. Epoch has issued well over two thousand individual figures since 1985 — this archive covers manufactured family lines and their known members. Not affiliated with Epoch Co., Ltd.</footer>
    </div>
    ${sheetHtml()}
  `;
  bindHome();
  restoreSelected();
}

function renderFamily(familyId) {
  const fam = state.data.families.find((f) => f.id === familyId);
  if (!fam) {
    $("#app").innerHTML = `<div class="wrap"><a class="back" href="#/">Back to catalogue</a><h1 style="margin-top:2rem">Family not found</h1></div>`;
    return;
  }
  const members = state.data.figures
    .filter((f) => f.familyId === fam.id)
    .sort((a, b) => state.data.roles.indexOf(a.role) - state.data.roles.indexOf(b.role) || a.year - b.year);
  const yearLine = fam.yearUK && fam.yearUK !== fam.year ? `${fam.year} JP · ${fam.yearUK} UK` : String(fam.year);
  $("#app").innerHTML = `
    <div class="wrap" style="max-width:48rem">
      <a class="back" href="#/">${arrowSvg()} Back to catalogue</a>
      <header class="family-head">
        ${mark(fam.group, "lg")}
        <div>
          <p class="kicker">${fam.era}</p>
          <h1>${esc(fam.name)}</h1>
          <p class="meta" style="margin-top:.5rem;color:var(--muted);font-size:.875rem">${esc(fam.species)} · ${esc(fam.surname)}</p>
          <div class="foot" style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">${pill(fam.status)}<span class="year">${yearLine}</span></div>
        </div>
      </header>
      ${fam.notes ? `<p class="lede">${esc(fam.notes)}</p>` : ""}
      <h2 style="margin-top:2.5rem;font-size:1.25rem">${members.length} figure${members.length === 1 ? "" : "s"}</h2>
      <ul class="member-list">
        ${members
          .map(
            (f) => `<li><button type="button" data-open="${f.id}"><div><p>${esc(f.displayName)}</p><p class="role">${esc(state.data.roleLabel[f.role])}</p></div><div class="year">${f.year}${f.set ? `<div>${esc(f.set)}</div>` : ""}</div></button></li>`,
          )
          .join("")}
      </ul>
    </div>
    ${sheetHtml()}
  `;
  bindSheet();
  document.querySelectorAll("[data-open]").forEach((btn) =>
    btn.addEventListener("click", () => openFigure(btn.getAttribute("data-open"))),
  );
  restoreSelected();
}

function sheetHtml() {
  return `<div id="sheet-root"></div>`;
}

function openFigure(id) {
  state.selectedId = id;
  paintSheet();
}

function closeSheet() {
  state.selectedId = null;
  paintSheet();
}

function restoreSelected() {
  if (state.selectedId) paintSheet();
}

function paintSheet() {
  const root = $("#sheet-root");
  if (!root) return;
  const f = state.data.figures.find((x) => x.id === state.selectedId);
  if (!f) {
    root.innerHTML = "";
    return;
  }
  const fam = state.data.families.find((x) => x.id === f.familyId);
  const notes = f.notes || fam?.notes;
  const relatives = state.data.figures.filter((x) => x.familyId === f.familyId && x.id !== f.id);
  root.innerHTML = `
    <div class="sheet-backdrop" data-close></div>
    <aside class="sheet" role="dialog" aria-labelledby="sheet-title">
      <button class="close" type="button" data-close aria-label="Close">${xSvg()}</button>
      ${mark(f.group, "lg")}
      <h2 id="sheet-title" style="margin-top:1rem">${esc(f.displayName)}</h2>
      <p class="meta" style="margin-top:.4rem;color:var(--muted)">${esc(state.data.roleLabel[f.role])} of the ${esc(f.familyName)}</p>
      <dl>
        <div><dt>First issued</dt><dd>${f.year}</dd></div>
        <div><dt>${f.yearUK && f.yearUK !== f.year ? "UK / West" : "Era"}</dt><dd>${f.yearUK && f.yearUK !== f.year ? f.yearUK : f.era}</dd></div>
        <div><dt>Species</dt><dd>${esc(f.species)}</dd></div>
        <div><dt>Status</dt><dd>${pill(f.status)}</dd></div>
        <div><dt>Role</dt><dd>${esc(state.data.roleLabel[f.role])}</dd></div>
        ${`<div><dt>Set</dt><dd style="font-family:var(--font-mono)">${esc(f.set || "—")}</dd></div>`}
      </dl>
      ${notes ? `<p class="notes">${esc(notes)}</p>` : ""}
      <a class="cta" href="#/family/${encodeURIComponent(f.familyId)}" data-close>View ${esc(f.familyName)}</a>
      ${
        relatives.length
          ? `<div class="relatives"><h4>Also in this family</h4><ul>${relatives
              .map(
                (r) => `<li><span>${esc(r.displayName)}</span><span class="year">${esc(state.data.roleLabel[r.role])} · ${r.year}</span></li>`,
              )
              .join("")}</ul></div>`
          : ""
      }
    </aside>
  `;
  bindSheet();
}

function bindSheet() {
  document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeSheet));
}

function bindHome() {
  const input = $("#q");
  input?.addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
    $("#q")?.focus();
    const q = $("#q");
    if (q) q.setSelectionRange(state.query.length, state.query.length);
  });
  document.querySelector("[data-clear]")?.addEventListener("click", () => {
    state.query = "";
    render();
    $("#q")?.focus();
  });
  document.querySelector("[data-filters]")?.addEventListener("click", () => {
    state.filtersOpen = !state.filtersOpen;
    render();
  });
  document.querySelectorAll("[data-era]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.era = btn.getAttribute("data-era");
      render();
    }),
  );
  document.querySelectorAll("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.view = btn.getAttribute("data-view");
      render();
    }),
  );
  document.querySelector("[data-group]")?.addEventListener("change", (e) => {
    state.group = e.target.value;
    render();
  });
  document.querySelector("[data-role]")?.addEventListener("change", (e) => {
    state.role = e.target.value;
    render();
  });
  document.querySelector("[data-status]")?.addEventListener("change", (e) => {
    state.status = e.target.value;
    render();
  });
  document.querySelector("[data-sort]")?.addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });
  document.querySelector("[data-reset]")?.addEventListener("click", () => {
    state.query = "";
    state.era = "all";
    state.group = "all";
    state.role = "all";
    state.status = "all";
    render();
  });
  document.querySelectorAll("[data-open]").forEach((btn) =>
    btn.addEventListener("click", () => openFigure(btn.getAttribute("data-open"))),
  );
  bindSheet();
}

function searchSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
}
function xSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
}
function slidersSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14M5 16h14"/><circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>`;
}
function arrowSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
}

function render() {
  const route = parseHash();
  if (route.page === "family") renderFamily(route.familyId);
  else renderHome();
}

async function main() {
  const res = await fetch(new URL("catalog.json", import.meta.url));
  state.data = await res.json();
  window.addEventListener("hashchange", render);
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      go("#/");
      render();
      $("#q")?.focus();
    }
    if (e.key === "Escape") closeSheet();
  });
  render();
}

main().catch((err) => {
  document.getElementById("app").innerHTML = `<div class="wrap"><h1>Could not load the catalogue</h1><p class="lede">${esc(err.message)}</p></div>`;
});
