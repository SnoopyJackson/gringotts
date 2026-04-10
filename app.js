// ── Constants ─────────────────────────────────────────────────────────────────
const COLOR_POOL = [
  { color: "#C8A97E", bg: "#2A1F14" },
  { color: "#7EB8C8", bg: "#142028" },
  { color: "#A8C87E", bg: "#1A2814" },
  { color: "#C87E9A", bg: "#281420" },
  { color: "#C8C07E", bg: "#28261A" },
  { color: "#9E7EC8", bg: "#1E1428" },
  { color: "#7EC8B0", bg: "#142820" },
  { color: "#C89E7E", bg: "#281E14" },
  { color: "#7E9EC8", bg: "#141E28" },
  { color: "#C87E7E", bg: "#281414" },
];

const ICON_OPTIONS = ["🛡️","🏦","💳","🌿","⚡","🏠","📈","💎","🎯","🌍","🚀","🔒","💰","🏗️","🌾"];

const DEFAULT_CATS = [
  { id: "assurance_vie", label: "Assurance Vie", icon: "🛡️", color: "#C8A97E", bg: "#2A1F14" },
  { id: "livret_a",      label: "Livret A",      icon: "🏦", color: "#7EB8C8", bg: "#142028" },
  { id: "compte",        label: "Compte",         icon: "💳", color: "#A8C87E", bg: "#1A2814" },
  { id: "ldds",          label: "LDDS",           icon: "🌿", color: "#C87E9A", bg: "#281420" },
  { id: "crypto",        label: "Crypto",         icon: "⚡", color: "#C8C07E", bg: "#28261A" },
];

const DEFAULT_SAVINGS = {
  assurance_vie: [{ id: 1, label: "AV Generali",   amount: 15000, date: "2024-01" }],
  livret_a:      [{ id: 1, label: "Livret A CE",    amount: 22950, date: "2024-01" }],
  compte:        [{ id: 1, label: "Compte courant", amount: 3200,  date: "2024-01" }],
  ldds:          [{ id: 1, label: "LDDS CA",        amount: 12000, date: "2024-01" }],
  crypto:        [{ id: 1, label: "Bitcoin",        amount: 8500,  date: "2024-01" }],
};

const DEFAULT_SNAPSHOTS = [
  { month: "2023-09", totals: { assurance_vie: 12000, livret_a: 20000, compte: 2800, ldds: 10000, crypto: 5000 } },
  { month: "2023-10", totals: { assurance_vie: 12500, livret_a: 20500, compte: 2900, ldds: 10200, crypto: 6200 } },
  { month: "2023-11", totals: { assurance_vie: 13000, livret_a: 21000, compte: 3000, ldds: 10500, crypto: 5800 } },
  { month: "2023-12", totals: { assurance_vie: 13500, livret_a: 21500, compte: 3100, ldds: 11000, crypto: 7200 } },
  { month: "2024-01", totals: { assurance_vie: 15000, livret_a: 22950, compte: 3200, ldds: 12000, crypto: 8500 } },
];

const STORAGE_KEY = "savings-v2";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDiff = (n) => (n >= 0 ? "+" : "") + fmt(n);
const pct = (part, total) => (total === 0 ? 0 : ((part / total) * 100).toFixed(1));

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { categories: DEFAULT_CATS, savings: DEFAULT_SAVINGS, snapshots: DEFAULT_SNAPSHOTS };
}

function saveAll(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
let data = loadAll();
let currentTab = "portfolio";
let openCat = null;
let nextId = 9000;

// ── SVG Helpers ──────────────────────────────────────────────────────────────
const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  return el;
}

// ── Arc Chart ─────────────────────────────────────────────────────────────────
function renderArcChart(container) {
  container.innerHTML = "";
  const { categories, savings } = data;
  const total = categories.reduce((s, cat) =>
    s + (savings[cat.id] || []).reduce((a, e) => a + Number(e.amount || 0), 0), 0);
  const size = 210, cx = size / 2, cy = size / 2, r = 76, sw = 26;
  let cum = 0;
  const segs = categories.map((cat) => {
    const val = (savings[cat.id] || []).reduce((a, e) => a + Number(e.amount || 0), 0);
    const p = total === 0 ? 0 : val / total;
    const start = cum; cum += p;
    return { ...cat, val, p, start };
  }).filter((s) => s.p > 0);

  const pol = (f, rad) => {
    const a = f * 2 * Math.PI - Math.PI / 2;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arc = (s, e, rad) => {
    if (e - s >= 1) return `M ${cx} ${cy - rad} A ${rad} ${rad} 0 1 1 ${cx - 0.001} ${cy - rad}`;
    const [sx, sy] = pol(s, rad), [ex, ey] = pol(e, rad);
    return `M ${sx} ${sy} A ${rad} ${rad} 0 ${e - s > 0.5 ? 1 : 0} 1 ${ex} ${ey}`;
  };

  const svg = svgEl("svg", { width: size, height: size, style: "overflow:visible;flex-shrink:0" });
  svg.appendChild(svgEl("circle", { cx, cy, r, fill: "none", stroke: "#181818", "stroke-width": sw }));
  segs.forEach((seg) => {
    svg.appendChild(svgEl("path", {
      d: arc(seg.start, seg.start + seg.p, r),
      fill: "none", stroke: seg.color, "stroke-width": sw,
      "stroke-linecap": "round", opacity: "0.88",
    }));
  });
  const t1 = svgEl("text", { x: cx, y: cy - 9, "text-anchor": "middle", fill: "#f5f0e8",
    "font-size": "10", "font-family": "'Cormorant Garamond', serif", opacity: "0.4", "letter-spacing": "2" });
  t1.textContent = "TOTAL";
  svg.appendChild(t1);
  const t2 = svgEl("text", { x: cx, y: cy + 13, "text-anchor": "middle", fill: "#f5f0e8",
    "font-size": "15", "font-family": "'Cormorant Garamond', serif", "font-weight": "600" });
  t2.textContent = fmt(total);
  svg.appendChild(t2);
  container.appendChild(svg);
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function renderSparkline(container, vals, color, width = 180, height = 36) {
  container.innerHTML = "";
  if (!vals || vals.length < 2) {
    const d = document.createElement("div");
    d.style.cssText = `height:${height}px;display:flex;align-items:center;opacity:0.2;font-size:10px`;
    d.textContent = "Pas assez de données";
    container.appendChild(d);
    return;
  }
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * width,
    height - ((v - min) / range) * (height - 6) - 3,
  ]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const fill = [...pts, [width, height], [0, height]].map((p) => p.join(",")).join(" ");

  const svg = svgEl("svg", { width, height, style: "overflow:visible" });
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: `sg${color.replace("#","")}`, x1: "0", y1: "0", x2: "0", y2: "1" });
  const s1 = svgEl("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.2" });
  const s2 = svgEl("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" });
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad); svg.appendChild(defs);

  svg.appendChild(svgEl("polygon", { points: fill, fill: `url(#sg${color.replace("#","")})` }));
  svg.appendChild(svgEl("path", { d: line, fill: "none", stroke: color, "stroke-width": "1.5", "stroke-linejoin": "round" }));
  svg.appendChild(svgEl("circle", {
    cx: pts[pts.length-1][0], cy: pts[pts.length-1][1], r: "2.5", fill: color, opacity: "0.9",
  }));
  container.appendChild(svg);
}

// ── Trend Chart ───────────────────────────────────────────────────────────────
function renderTrendChart(container) {
  container.innerHTML = "";
  const { snapshots, categories } = data;
  if (snapshots.length < 2) {
    const d = document.createElement("div");
    d.style.cssText = "text-align:center;padding:40px 0;opacity:0.3;font-size:13px";
    d.textContent = "Enregistrez au moins 2 snapshots mensuels pour voir les tendances.";
    container.appendChild(d);
    return;
  }
  const W = 620, H = 220, PAD = { t: 16, r: 16, b: 36, l: 66 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const allTotals = snapshots.map((s) =>
    categories.reduce((sum, cat) => sum + (s.totals[cat.id] || 0), 0));
  const maxVal = Math.max(...allTotals) * 1.08;
  const minVal = Math.min(...allTotals) * 0.92;
  const range = maxVal - minVal || 1;
  const xOf = (i) => PAD.l + (i / (snapshots.length - 1)) * iW;
  const yOf = (v) => PAD.t + iH - ((v - minVal) / range) * iH;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => minVal + range * f);

  const svg = svgEl("svg", { width: "100%", viewBox: `0 0 ${W} ${H}`, style: "overflow:visible" });

  // Grid lines + labels
  gridVals.forEach((v) => {
    svg.appendChild(svgEl("line", { x1: PAD.l, y1: yOf(v), x2: W - PAD.r, y2: yOf(v), stroke: "#1c1c1c", "stroke-width": "1" }));
    const txt = svgEl("text", { x: PAD.l - 8, y: yOf(v) + 4, "text-anchor": "end", fill: "#f5f0e8",
      "font-size": "9", opacity: "0.3", "font-family": "'DM Mono', monospace" });
    txt.textContent = fmt(v);
    svg.appendChild(txt);
  });

  // X-axis labels
  snapshots.forEach((s, i) => {
    const txt = svgEl("text", { x: xOf(i), y: H - 6, "text-anchor": "middle", fill: "#f5f0e8",
      "font-size": "9", opacity: "0.3", "font-family": "'DM Mono', monospace" });
    txt.textContent = s.month.slice(2);
    svg.appendChild(txt);
  });

  // Category dashed lines
  const cMin = Math.min(...allTotals) * 0.92;
  const cMax = Math.max(...allTotals) * 1.08;
  const cRange = cMax - cMin || 1;
  categories.forEach((cat) => {
    const vals = snapshots.map((s) => s.totals[cat.id] || 0);
    const pts = vals.map((v, i) => `${xOf(i)},${PAD.t + iH - ((v - cMin) / cRange) * iH}`).join(" ");
    svg.appendChild(svgEl("polyline", {
      points: pts, fill: "none", stroke: cat.color, "stroke-width": "1",
      opacity: "0.3", "stroke-linejoin": "round", "stroke-dasharray": "4 3",
    }));
  });

  // Area fill
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: "totalGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#f5f0e8", "stop-opacity": "0.06" }));
  grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#f5f0e8", "stop-opacity": "0" }));
  defs.appendChild(grad); svg.appendChild(defs);

  const totalPts = allTotals.map((v, i) => `${xOf(i)},${yOf(v)}`);
  const areaPoints = [...totalPts, `${xOf(snapshots.length-1)},${PAD.t+iH}`, `${xOf(0)},${PAD.t+iH}`].join(" ");
  svg.appendChild(svgEl("polygon", { points: areaPoints, fill: "url(#totalGrad)" }));

  // Total line
  svg.appendChild(svgEl("polyline", {
    points: totalPts.join(" "), fill: "none", stroke: "#f5f0e8",
    "stroke-width": "2", opacity: "0.85", "stroke-linejoin": "round",
  }));

  // Dots
  totalPts.forEach((pt) => {
    const [x, y] = pt.split(",");
    svg.appendChild(svgEl("circle", { cx: x, cy: y, r: "3", fill: "#0a0a0a", stroke: "#f5f0e8", "stroke-width": "1.5", opacity: "0.9" }));
  });

  container.appendChild(svg);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

// ── Computed values ───────────────────────────────────────────────────────────
function getTotal() {
  return data.categories.reduce((s, cat) =>
    s + (data.savings[cat.id] || []).reduce((a, e) => a + Number(e.amount || 0), 0), 0);
}

function snapTotal(snap) {
  return snap ? data.categories.reduce((s, cat) => s + (snap.totals[cat.id] || 0), 0) : 0;
}

function getMonthDiff() {
  const { snapshots } = data;
  const lastSnap = snapshots[snapshots.length - 1];
  const prevSnap = snapshots[snapshots.length - 2];
  return lastSnap && prevSnap ? snapTotal(lastSnap) - snapTotal(prevSnap) : null;
}

// ── Actions ───────────────────────────────────────────────────────────────────
function addCategory(cat) {
  data.categories = [...data.categories, cat];
  data.savings[cat.id] = [];
  saveAll(data);
  closeModal();
  toast("Catégorie créée !");
  render();
}

function deleteCategory(catId) {
  if (!confirm("Supprimer cette catégorie et toutes ses entrées ?")) return;
  data.categories = data.categories.filter((c) => c.id !== catId);
  delete data.savings[catId];
  if (openCat === catId) openCat = null;
  saveAll(data);
  render();
}

function addEntry(catId) {
  const today = new Date().toISOString().slice(0, 7);
  if (!data.savings[catId]) data.savings[catId] = [];
  data.savings[catId].push({ id: nextId++, label: "", amount: 0, date: today });
  saveAll(data);
  render();
}

function updateEntry(catId, entryId, field, value) {
  const entries = data.savings[catId] || [];
  const entry = entries.find((e) => e.id === entryId);
  if (entry) {
    entry[field] = value;
    saveAll(data);
    // Don't re-render on every keystroke (keeps focus / mobile keyboard open)
    if (field !== "label" && field !== "amount") render();
  }
}

function deleteEntry(catId, entryId) {
  data.savings[catId] = (data.savings[catId] || []).filter((e) => e.id !== entryId);
  saveAll(data);
  render();
}

function takeSnapshot() {
  const month = new Date().toISOString().slice(0, 7);
  const totals = {};
  data.categories.forEach((cat) => {
    totals[cat.id] = (data.savings[cat.id] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  });
  const idx = data.snapshots.findIndex((s) => s.month === month);
  if (idx >= 0) {
    data.snapshots[idx] = { month, totals };
  } else {
    data.snapshots.push({ month, totals });
    data.snapshots.sort((a, b) => a.month.localeCompare(b.month));
  }
  saveAll(data);
  toast("Snapshot du mois enregistré !");
  render();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let modalIcon = "💰";

function openModal() {
  modalIcon = "💰";
  document.getElementById("modal-overlay").classList.remove("hidden");
  const input = document.getElementById("modal-name");
  if (input) { input.value = ""; input.focus(); }
  renderIconGrid();
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.getElementById("modal-overlay").classList.add("hidden");
}

function renderIconGrid() {
  const grid = document.getElementById("icon-grid");
  if (!grid) return;
  grid.innerHTML = "";
  ICON_OPTIONS.forEach((ic) => {
    const span = document.createElement("span");
    span.className = "icon-option" + (ic === modalIcon ? " selected" : "");
    span.textContent = ic;
    span.onclick = () => { modalIcon = ic; renderIconGrid(); };
    grid.appendChild(span);
  });
}

function handleModalCreate() {
  const label = document.getElementById("modal-name").value.trim();
  if (!label) return;
  const usedColors = data.categories.map((c) => c.color);
  const nextColor = COLOR_POOL.find((c) => !usedColors.includes(c.color)) || COLOR_POOL[0];
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
  addCategory({ id, label, icon: modalIcon, color: nextColor.color, bg: nextColor.bg });
}

function updateModalColorDot() {
  const dot = document.getElementById("modal-color-dot");
  if (!dot) return;
  const usedColors = data.categories.map((c) => c.color);
  const nextColor = COLOR_POOL.find((c) => !usedColors.includes(c.color)) || COLOR_POOL[0];
  dot.style.background = nextColor.color;
}

// ── Render: Header ────────────────────────────────────────────────────────────
function renderHeader() {
  const total = getTotal();
  const monthDiff = getMonthDiff();
  document.getElementById("header-total-value").textContent = fmt(total);

  const diffEl = document.getElementById("header-diff");
  if (monthDiff !== null) {
    diffEl.innerHTML = `<span class="${monthDiff >= 0 ? "positive" : "negative"}">${fmtDiff(monthDiff)}</span> <span class="label">vs mois préc.</span>`;
    diffEl.style.display = "";
  } else {
    diffEl.style.display = "none";
  }

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === currentTab);
  });
}

// ── Render: Portfolio Tab ─────────────────────────────────────────────────────
function renderPortfolio() {
  const container = document.getElementById("tab-portfolio");
  container.innerHTML = "";
  container.style.display = currentTab === "portfolio" ? "" : "none";
  if (currentTab !== "portfolio") return;

  const { categories, savings } = data;
  const total = getTotal();

  // Chart + breakdown
  const chartSection = document.createElement("div");
  chartSection.className = "chart-section";

  const chartDiv = document.createElement("div");
  renderArcChart(chartDiv);
  chartSection.appendChild(chartDiv);

  const breakdown = document.createElement("div");
  breakdown.className = "breakdown";
  categories.forEach((cat) => {
    const val = (savings[cat.id] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
    const p = pct(val, total);
    const row = document.createElement("div");
    row.className = "breakdown-row";
    row.innerHTML = `
      <div class="breakdown-row-top">
        <span class="breakdown-label">${cat.icon} ${cat.label}</span>
        <span class="breakdown-value">${fmt(val)} <span class="breakdown-pct">${p}%</span></span>
      </div>
      <div class="breakdown-bar">
        <div class="breakdown-bar-fill" style="width:${p}%;background:${cat.color}"></div>
      </div>`;
    breakdown.appendChild(row);
  });
  chartSection.appendChild(breakdown);
  container.appendChild(chartSection);

  // Category cards
  const catContainer = document.createElement("div");
  catContainer.className = "categories";
  categories.forEach((cat) => {
    const entries = savings[cat.id] || [];
    const catTotal = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const isOpen = openCat === cat.id;

    const card = document.createElement("div");
    card.className = "cat-card" + (isOpen ? " open" : "");
    if (isOpen) card.style.borderColor = cat.color + "30";

    // Header
    const header = document.createElement("div");
    header.className = "cat-header";
    if (isOpen) header.style.background = cat.bg;
    header.innerHTML = `
      <div class="cat-header-left">
        <span class="cat-icon">${cat.icon}</span>
        <div>
          <div class="cat-label">${cat.label}</div>
          <div class="cat-count">${entries.length} compte${entries.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <div class="cat-header-right">
        <span class="cat-total" style="color:${cat.color}">${fmt(catTotal)}</span>
        <span class="cat-arrow${isOpen ? " open" : ""}">▼</span>
      </div>`;
    header.onclick = () => { openCat = isOpen ? null : cat.id; render(); };
    card.appendChild(header);

    // Detail
    if (isOpen) {
      const detail = document.createElement("div");
      detail.className = "cat-detail";
      detail.style.borderTop = `1px solid ${cat.color}15`;

      const headers = document.createElement("div");
      headers.className = "cat-detail-headers";
      ["Nom","Montant (€)","Mois"].forEach((h, i) => {
        const s = document.createElement("span");
        s.style.flex = [2, 1.2, 1][i];
        s.textContent = h;
        headers.appendChild(s);
      });
      const spacer = document.createElement("span");
      spacer.style.width = "28px";
      headers.appendChild(spacer);
      detail.appendChild(headers);

      entries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "entry-row";

        const nameInput = document.createElement("input");
        nameInput.className = "entry-input name";
        nameInput.value = entry.label;
        nameInput.placeholder = "Nom";
        nameInput.oninput = (e) => updateEntry(cat.id, entry.id, "label", e.target.value);
        nameInput.onblur = () => render();

        const amtInput = document.createElement("input");
        amtInput.className = "entry-input amount";
        amtInput.type = "number";
        amtInput.value = entry.amount;
        amtInput.placeholder = "Montant";
        amtInput.oninput = (e) => updateEntry(cat.id, entry.id, "amount", e.target.value);
        amtInput.onblur = () => render();

        const dateInput = document.createElement("input");
        dateInput.className = "entry-input date";
        dateInput.type = "month";
        dateInput.value = entry.date;
        dateInput.onchange = (e) => updateEntry(cat.id, entry.id, "date", e.target.value);

        const delBtn = document.createElement("button");
        delBtn.className = "entry-delete";
        delBtn.textContent = "×";
        delBtn.onclick = () => deleteEntry(cat.id, entry.id);

        row.append(nameInput, amtInput, dateInput, delBtn);
        detail.appendChild(row);
      });

      const actions = document.createElement("div");
      actions.className = "cat-actions";

      const addBtn = document.createElement("button");
      addBtn.className = "btn-add-entry";
      addBtn.style.borderColor = cat.color + "40";
      addBtn.style.color = cat.color;
      addBtn.textContent = "+ Ajouter un compte";
      addBtn.onclick = () => addEntry(cat.id);

      const delCatBtn = document.createElement("button");
      delCatBtn.className = "btn-delete-cat";
      delCatBtn.textContent = "Supprimer catégorie";
      delCatBtn.onclick = () => deleteCategory(cat.id);

      actions.append(addBtn, delCatBtn);
      detail.appendChild(actions);
      card.appendChild(detail);
    }

    catContainer.appendChild(card);
  });
  container.appendChild(catContainer);

  // Bottom actions
  const bottom = document.createElement("div");
  bottom.className = "bottom-actions";

  const newCatBtn = document.createElement("button");
  newCatBtn.className = "btn-new-cat";
  newCatBtn.textContent = "+ Nouvelle catégorie";
  newCatBtn.onclick = openModal;

  const snapBtn = document.createElement("button");
  snapBtn.className = "btn-snapshot";
  snapBtn.textContent = "📸 Snapshot mensuel";
  snapBtn.onclick = takeSnapshot;

  bottom.append(newCatBtn, snapBtn);
  container.appendChild(bottom);

  const note = document.createElement("div");
  note.className = "local-note";
  note.textContent = "Données enregistrées localement dans votre navigateur";
  container.appendChild(note);
}

// ── Render: Stats Tab ─────────────────────────────────────────────────────────
function renderStats() {
  const container = document.getElementById("tab-stats");
  container.innerHTML = "";
  container.style.display = currentTab === "stats" ? "" : "none";
  if (currentTab !== "stats") return;

  const { categories, savings, snapshots } = data;
  const total = getTotal();
  const monthDiff = getMonthDiff();

  // KPI cards
  const kpiRow = document.createElement("div");
  kpiRow.className = "kpi-row";
  const kpis = [
    { label: "Total actuel", value: fmt(total), sub: null },
    { label: "Snapshots", value: snapshots.length, sub: "enregistrés" },
    { label: "Évol. mensuelle",
      value: monthDiff !== null ? fmtDiff(monthDiff) : "—",
      sub: monthDiff !== null ? "vs snapshot préc." : "enregistrez 2 snapshots",
      col: monthDiff !== null ? (monthDiff >= 0 ? "#A8C87E" : "#C87E7E") : "#f5f0e8" },
    { label: "Catégories", value: categories.length, sub: "actives" },
  ];
  kpis.forEach((kpi) => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML = `
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value" style="color:${kpi.col || "#f5f0e8"}">${kpi.value}</div>
      ${kpi.sub ? `<div class="kpi-sub">${kpi.sub}</div>` : ""}`;
    kpiRow.appendChild(card);
  });
  container.appendChild(kpiRow);

  // Trend chart card
  const trendCard = document.createElement("div");
  trendCard.className = "trend-card";

  const trendHeader = document.createElement("div");
  trendHeader.className = "trend-header";

  let legendHTML = categories.map((cat) =>
    `<div class="trend-legend-item">
      <div class="trend-legend-line" style="border-top:1.5px dashed ${cat.color}"></div>
      <span class="trend-legend-label">${cat.label}</span>
    </div>`
  ).join("");
  legendHTML += `<div class="trend-legend-item">
    <div class="trend-legend-total-line"></div>
    <span class="trend-legend-label">Total</span>
  </div>`;

  trendHeader.innerHTML = `
    <div>
      <div class="trend-title">Évolution du patrimoine</div>
      <div class="trend-subtitle">Basé sur ${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="trend-legend">${legendHTML}</div>`;
  trendCard.appendChild(trendHeader);

  const trendChartDiv = document.createElement("div");
  renderTrendChart(trendChartDiv);
  trendCard.appendChild(trendChartDiv);
  container.appendChild(trendCard);

  // Per-category sparklines
  const sparkGrid = document.createElement("div");
  sparkGrid.className = "sparkline-grid";
  categories.forEach((cat) => {
    const vals = snapshots.map((s) => s.totals[cat.id] || 0);
    const last = vals[vals.length - 1] || 0;
    const prev = vals[vals.length - 2] || 0;
    const diff = last - prev;
    const current = (savings[cat.id] || []).reduce((s, e) => s + Number(e.amount || 0), 0);

    const card = document.createElement("div");
    card.className = "sparkline-card";
    card.style.border = `1px solid ${cat.color}18`;

    let diffHTML = "";
    if (vals.length >= 2) {
      diffHTML = `<div class="sparkline-diff">
        <div class="sparkline-diff-value" style="color:${diff >= 0 ? "#A8C87E" : "#C87E7E"}">${fmtDiff(diff)}</div>
        <div class="sparkline-diff-label">vs préc.</div>
      </div>`;
    }

    card.innerHTML = `
      <div class="sparkline-top">
        <div>
          <div class="sparkline-cat-label">${cat.icon} ${cat.label}</div>
          <div class="sparkline-cat-value" style="color:${cat.color}">${fmt(current)}</div>
        </div>
        ${diffHTML}
      </div>`;

    const sparkDiv = document.createElement("div");
    renderSparkline(sparkDiv, vals, cat.color);
    card.appendChild(sparkDiv);
    sparkGrid.appendChild(card);
  });
  container.appendChild(sparkGrid);

  // Snapshot history table
  if (snapshots.length > 0) {
    const snapCard = document.createElement("div");
    snapCard.className = "snapshot-card";
    snapCard.innerHTML = `<div class="snapshot-title">Historique des snapshots</div>`;

    const table = document.createElement("table");
    table.className = "snapshot-table";

    const thead = document.createElement("thead");
    let headHTML = "<tr><th>Mois</th>";
    categories.forEach((cat) => {
      headHTML += `<th style="color:${cat.color}">${cat.icon} ${cat.label}</th>`;
    });
    headHTML += "<th>Total</th><th>Δ</th></tr>";
    thead.innerHTML = headHTML;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const reversed = [...snapshots].reverse();
    reversed.forEach((snap, i) => {
      const st = snapTotal(snap);
      const pt = reversed[i + 1] ? snapTotal(reversed[i + 1]) : null;
      const delta = pt !== null ? st - pt : null;

      let rowHTML = `<td>${snap.month}</td>`;
      categories.forEach((cat) => {
        rowHTML += `<td style="color:${cat.color}bb">${snap.totals[cat.id] ? fmt(snap.totals[cat.id]) : '<span style="opacity:0.2">—</span>'}</td>`;
      });
      rowHTML += `<td style="color:#f5f0e8;opacity:0.9">${fmt(st)}</td>`;
      rowHTML += `<td style="color:${delta === null ? "#333" : delta >= 0 ? "#A8C87E" : "#C87E7E"}">${delta === null ? "—" : fmtDiff(delta)}</td>`;

      const tr = document.createElement("tr");
      tr.innerHTML = rowHTML;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    snapCard.appendChild(table);
    container.appendChild(snapCard);
  }

  // Bottom snapshot button
  const bottomDiv = document.createElement("div");
  bottomDiv.className = "stats-bottom";
  const snapBtn = document.createElement("button");
  snapBtn.className = "btn-snapshot-bottom";
  snapBtn.textContent = "📸 Enregistrer snapshot du mois";
  snapBtn.onclick = takeSnapshot;
  bottomDiv.appendChild(snapBtn);
  container.appendChild(bottomDiv);
}

// ── Main render ───────────────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderPortfolio();
  renderStats();
  updateModalColorDot();
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => { currentTab = btn.dataset.tab; render(); };
  });

  // Modal
  document.getElementById("modal-overlay").onclick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };
  document.getElementById("modal-content").onclick = (e) => e.stopPropagation();
  document.getElementById("btn-modal-cancel").onclick = closeModal;
  document.getElementById("btn-modal-create").onclick = handleModalCreate;
  document.getElementById("modal-name").onkeydown = (e) => {
    if (e.key === "Enter") handleModalCreate();
  };

  render();
});
