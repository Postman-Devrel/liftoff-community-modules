#!/usr/bin/env node

/**
 * Zero-dependency preview server for community modules.
 * Renders module.json + content.md as a visual preview that
 * approximates the LiftOff UI so authors can test their work.
 *
 * Usage:
 *   node scripts/preview.js modules/my-module-name
 *   npm run preview modules/my-module-name
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3333;

function usage() {
  console.log(`
Usage: node scripts/preview.js <module-directory>

Example:
  node scripts/preview.js modules/my-module-name
  npm run preview modules/my-module-name
`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

const moduleDir = path.resolve(args[0]);
const moduleId = path.basename(moduleDir);

const jsonPath = path.join(moduleDir, "module.json");
const contentPath = path.join(moduleDir, "content.md");

if (!fs.existsSync(jsonPath)) {
  console.error(`✗ No module.json found at ${jsonPath}`);
  console.error("  Run 'npm run generate' first to create it from content.md.");
  process.exit(1);
}

function readModuleData() {
  const moduleJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const contentMd = fs.existsSync(contentPath)
    ? fs.readFileSync(contentPath, "utf-8")
    : "";
  return { moduleJson, contentMd };
}

function buildHtml() {
  const { moduleJson, contentMd } = readModuleData();
  const mod = moduleJson;

  const totalSteps = mod.lessons.reduce((s, l) => s + l.steps.length, 0);
  const totalPoints = mod.lessons.reduce(
    (s, l) => s + l.steps.reduce((ss, st) => ss + st.points, 0),
    0
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview: ${escHtml(mod.title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface-2: #232635;
    --border: #2e3247;
    --text: #e4e6f0;
    --text-dim: #8b8fa3;
    --accent: ${mod.color || "#FF6C37"};
    --success: #10B981;
    --radius: 12px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
  }

  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-logo {
    font-weight: 700;
    font-size: 18px;
    color: var(--accent);
    letter-spacing: -0.5px;
  }

  .header-sep {
    color: var(--border);
    font-size: 20px;
  }

  .header-title {
    font-size: 14px;
    color: var(--text-dim);
  }

  .header-badge {
    margin-left: auto;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 12px;
    color: var(--text-dim);
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  /* Module hero card */
  .hero {
    background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }

  .hero::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--accent);
  }

  .hero-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .hero h1 {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: -0.5px;
  }

  .hero-desc {
    color: var(--text-dim);
    font-size: 16px;
    line-height: 1.7;
    max-width: 640px;
  }

  .hero-stats {
    display: flex;
    gap: 24px;
    margin-top: 24px;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--accent);
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .private-badge {
    display: inline-block;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 12px;
    vertical-align: middle;
  }

  /* Getting started */
  .getting-started {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    margin-bottom: 32px;
  }

  .getting-started h2 {
    font-size: 18px;
    margin-bottom: 12px;
    color: var(--accent);
  }

  .getting-started-content {
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  /* Lessons */
  .lesson {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 24px;
    overflow: hidden;
  }

  .lesson-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }

  .lesson-header:hover {
    background: var(--surface-2);
  }

  .lesson-number {
    background: var(--accent);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .lesson-title {
    font-size: 18px;
    font-weight: 600;
  }

  .lesson-step-count {
    margin-left: auto;
    font-size: 13px;
    color: var(--text-dim);
  }

  .lesson-desc {
    padding: 0 24px 16px;
    color: var(--text-dim);
    font-size: 14px;
    border-bottom: 1px solid var(--border);
  }

  .lesson-body {
    overflow: hidden;
    transition: max-height 0.3s ease;
  }

  .lesson-body.collapsed {
    max-height: 0 !important;
  }

  .chevron {
    margin-left: 8px;
    transition: transform 0.3s ease;
    color: var(--text-dim);
    font-size: 12px;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  /* Steps */
  .step {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }

  .step:last-child {
    border-bottom: none;
  }

  .step-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }

  .step-number {
    background: var(--surface-2);
    border: 2px solid var(--border);
    color: var(--text-dim);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .step-title-row {
    flex: 1;
  }

  .step-title {
    font-size: 15px;
    font-weight: 600;
  }

  .step-meta {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  }

  .step-points {
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
  }

  .step-manual {
    font-size: 11px;
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
    border-radius: 4px;
    padding: 1px 6px;
    font-weight: 500;
  }

  .step-input-tag {
    font-size: 11px;
    background: rgba(6, 182, 212, 0.15);
    color: #22d3ee;
    border-radius: 4px;
    padding: 1px 6px;
    font-weight: 500;
  }

  .step-desc {
    margin-top: 12px;
    padding-left: 36px;
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1.7;
    display: none;
  }

  .step-desc.open {
    display: block;
  }

  .step-desc p { margin-bottom: 8px; }
  .step-desc ol, .step-desc ul { margin: 8px 0 8px 20px; }
  .step-desc li { margin-bottom: 4px; }
  .step-desc code {
    background: var(--bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: "SF Mono", "Fira Code", monospace;
  }
  .step-desc pre {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 13px;
    font-family: "SF Mono", "Fira Code", monospace;
    line-height: 1.5;
  }
  .step-desc pre code {
    background: none;
    padding: 0;
  }
  .step-desc strong { color: var(--text); }
  .step-desc a { color: var(--accent); text-decoration: none; }
  .step-desc a:hover { text-decoration: underline; }
  .step-desc blockquote {
    border-left: 3px solid var(--accent);
    padding: 8px 16px;
    margin: 8px 0;
    background: rgba(255, 108, 55, 0.05);
    border-radius: 0 8px 8px 0;
  }
  .step-desc table {
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
  }
  .step-desc th, .step-desc td {
    border: 1px solid var(--border);
    padding: 6px 12px;
    text-align: left;
  }
  .step-desc th {
    background: var(--surface-2);
    font-weight: 600;
  }

  .step-validate-btn {
    margin-top: 12px;
    margin-left: 36px;
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: default;
    display: none;
  }

  .step-desc.open + .step-validate-btn {
    display: inline-block;
  }

  .btn-validate {
    background: var(--accent);
    color: #fff;
  }

  .btn-manual {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  /* Input field preview */
  .step-input-preview {
    margin-top: 12px;
    margin-left: 36px;
    display: none;
  }

  .step-desc.open ~ .step-input-preview {
    display: block;
  }

  .input-label {
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 4px;
    font-weight: 500;
  }

  .input-field {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text);
    font-size: 14px;
    width: 280px;
    cursor: default;
  }

  .input-field::placeholder {
    color: var(--text-dim);
    opacity: 0.5;
  }

  /* Validation checklist */
  .validation-section {
    margin-top: 40px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
  }

  .validation-section h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .val-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .val-item:last-child { border-bottom: none; }

  .val-id {
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 12px;
    color: var(--accent);
    flex-shrink: 0;
    min-width: 240px;
  }

  .val-step {
    color: var(--text-dim);
  }

  .val-manual {
    font-size: 11px;
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
    border-radius: 4px;
    padding: 1px 6px;
    margin-left: 8px;
  }

  /* Footer */
  .footer {
    text-align: center;
    padding: 32px 24px;
    color: var(--text-dim);
    font-size: 12px;
  }

  .footer a {
    color: var(--accent);
    text-decoration: none;
  }

  .reload-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 8px 24px;
    text-align: center;
    z-index: 20;
  }

  .reload-bar button {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 24px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .reload-bar button:hover {
    opacity: 0.9;
  }

  .reload-bar span {
    margin-left: 12px;
    color: var(--text-dim);
    font-size: 12px;
  }
</style>
</head>
<body>

<div class="header">
  <span class="header-logo">🚀 LiftOff</span>
  <span class="header-sep">/</span>
  <span class="header-title">Module Preview</span>
  <span class="header-badge">Preview Mode — not a live module</span>
</div>

<div class="container">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-icon">${escHtml(mod.icon || "🚀")}</div>
    <h1>
      ${escHtml(mod.title)}
      ${mod.private ? '<span class="private-badge">Private</span>' : ""}
    </h1>
    <div class="hero-desc">${renderMarkdownInline(mod.description)}</div>
    <div class="hero-stats">
      <div class="stat">
        <span class="stat-value">${mod.lessons.length}</span>
        <span class="stat-label">Lessons</span>
      </div>
      <div class="stat">
        <span class="stat-value">${totalSteps}</span>
        <span class="stat-label">Steps</span>
      </div>
      <div class="stat">
        <span class="stat-value">${totalPoints}</span>
        <span class="stat-label">Points</span>
      </div>
    </div>
  </div>

  ${mod.gettingStarted ? `
  <div class="getting-started">
    <h2>${escHtml(mod.gettingStartedTitle || "Before you start")}</h2>
    <div class="getting-started-content">${renderMarkdownBlock(mod.gettingStarted)}</div>
  </div>
  ` : ""}

  <!-- Lessons -->
  ${mod.lessons
    .map(
      (lesson, li) => `
  <div class="lesson">
    <div class="lesson-header" onclick="toggleLesson(${li})">
      <span class="lesson-number">${lesson.partNumber}</span>
      <span class="lesson-title">${escHtml(lesson.title)}</span>
      <span class="lesson-step-count">${lesson.steps.length} step${lesson.steps.length !== 1 ? "s" : ""}</span>
      <span class="chevron open" id="chevron-${li}">▶</span>
    </div>
    ${lesson.description ? `<div class="lesson-desc">${renderMarkdownInline(lesson.description)}</div>` : ""}
    <div class="lesson-body" id="lesson-body-${li}">
      ${lesson.steps
        .map(
          (step, si) => `
      <div class="step">
        <div class="step-header" onclick="toggleStep(${li}, ${si})">
          <span class="step-number">${step.stepNumber}</span>
          <div class="step-title-row">
            <div class="step-title">${escHtml(step.title)}</div>
            <div class="step-meta">
              <span class="step-points">${step.points} pts</span>
              ${step.manual ? '<span class="step-manual">Manual</span>' : ""}
              ${step.inputField ? '<span class="step-input-tag">Input</span>' : ""}
            </div>
          </div>
        </div>
        <div class="step-desc" id="step-desc-${li}-${si}">
          ${renderMarkdownBlock(step.description)}
        </div>
        ${
          step.inputField
            ? `
        <div class="step-input-preview" id="step-input-${li}-${si}">
          <div class="input-label">${escHtml(step.inputField.label)}</div>
          <input class="input-field" type="text" placeholder="${escHtml(step.inputField.placeholder || "")}" disabled>
        </div>`
            : ""
        }
        <button class="step-validate-btn ${step.manual ? "btn-manual" : "btn-validate"}" id="step-btn-${li}-${si}">
          ${step.manual ? "✓ Done" : "Validate"}
        </button>
      </div>`
        )
        .join("")}
    </div>
  </div>`
    )
    .join("")}

  <!-- Validator Checklist -->
  <div class="validation-section">
    <h2>Validator Checklist</h2>
    ${mod.lessons
      .flatMap((l) => l.steps)
      .map(
        (step) => `
    <div class="val-item">
      <span class="val-id">${escHtml(step.validatorId)}</span>
      <span class="val-step">${escHtml(step.title)}</span>
      ${step.manual ? '<span class="val-manual">manual</span>' : ""}
    </div>`
      )
      .join("")}
  </div>
</div>

<div class="reload-bar">
  <button onclick="location.reload()">↻ Reload Preview</button>
  <span>Edit your module.json, then reload to see changes</span>
</div>

<div class="footer">
  <p>LiftOff Community Module Preview · <a href="https://github.com/Postman-DevRel/liftoff-community-modules">GitHub</a></p>
</div>

<script>
function toggleLesson(li) {
  const body = document.getElementById('lesson-body-' + li);
  const chevron = document.getElementById('chevron-' + li);
  body.classList.toggle('collapsed');
  chevron.classList.toggle('open');
}

function toggleStep(li, si) {
  const desc = document.getElementById('step-desc-' + li + '-' + si);
  desc.classList.toggle('open');
}

// Expand first lesson's first step by default
document.addEventListener('DOMContentLoaded', function() {
  const first = document.getElementById('step-desc-0-0');
  if (first) first.classList.add('open');
});
</script>

</body>
</html>`;
}

function escHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdownInline(text) {
  if (!text) return "";
  let s = escHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );
  s = s.replace(/\n/g, " ");
  return s;
}

function renderMarkdownBlock(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLines = [];
  let inList = false;
  let listType = "";
  let inTable = false;
  let tableRows = [];
  let inBlockquote = false;
  let bqLines = [];

  function flushBlockquote() {
    if (inBlockquote && bqLines.length > 0) {
      html += "<blockquote>" + bqLines.join("<br>") + "</blockquote>";
      bqLines = [];
      inBlockquote = false;
    }
  }

  function flushList() {
    if (inList) {
      html += listType === "ol" ? "</ol>" : "</ul>";
      inList = false;
    }
  }

  function flushTable() {
    if (inTable && tableRows.length > 0) {
      html += "<table>";
      tableRows.forEach((row, i) => {
        const tag = i === 0 ? "th" : "td";
        html += "<tr>" + row.map((c) => "<" + tag + ">" + inlineFormat(c) + "</" + tag + ">").join("") + "</tr>";
      });
      html += "</table>";
      tableRows = [];
      inTable = false;
    }
  }

  function inlineFormat(s) {
    s = escHtml(s);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
    s = s.replace(/`(.+?)`/g, "<code>$1</code>");
    s = s.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank">$1</a>'
    );
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html += "<pre><code>" + escHtml(codeLines.join("\n")) + "</code></pre>";
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushBlockquote();
        flushList();
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      flushList();
      flushTable();
      inBlockquote = true;
      bqLines.push(inlineFormat(line.slice(2)));
      continue;
    } else {
      flushBlockquote();
    }

    // Table rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      // Skip separator rows
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      flushList();
      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushTable();
      if (!inList || listType !== "ol") {
        flushList();
        html += "<ol>";
        inList = true;
        listType = "ol";
      }
      html += "<li>" + inlineFormat(olMatch[2]) + "</li>";
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushTable();
      if (!inList || listType !== "ul") {
        flushList();
        html += "<ul>";
        inList = true;
        listType = "ul";
      }
      html += "<li>" + inlineFormat(ulMatch[1]) + "</li>";
      continue;
    }

    flushList();

    // Blank line
    if (line.trim() === "") {
      continue;
    }

    // Regular paragraph
    html += "<p>" + inlineFormat(line) + "</p>";
  }

  flushBlockquote();
  flushList();
  flushTable();

  if (inCodeBlock) {
    html += "<pre><code>" + escHtml(codeLines.join("\n")) + "</code></pre>";
  }

  return html;
}

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHtml());
  } else if (req.url === "/api/module") {
    const { moduleJson } = readModuleData();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(moduleJson, null, 2));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`
  🚀 LiftOff Module Preview
  ─────────────────────────
  Module:  ${moduleId}
  URL:     http://localhost:${PORT}

  Edit your module files and reload the browser to see changes.
  Press Ctrl+C to stop.
`);
});
