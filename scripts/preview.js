#!/usr/bin/env node

/**
 * Interactive preview server for community modules.
 * Renders the module UI and validates steps against the real Postman API.
 *
 * Usage:
 *   node scripts/preview.js modules/my-module-name
 *   npm run preview modules/my-module-name
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3333;
const POSTMAN_API = "https://api.getpostman.com";

// --- CLI setup ---

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

// --- Data loading ---

function readModuleData() {
  const moduleJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const contentMd = fs.existsSync(contentPath)
    ? fs.readFileSync(contentPath, "utf-8")
    : "";
  return { moduleJson, contentMd };
}

function extractValidationHints(contentMd) {
  const hints = {};
  const lines = contentMd.split("\n");
  let currentStepNum = null;
  let collecting = false;
  let hintLines = [];

  for (const line of lines) {
    const stepMatch = line.match(/^### Step (\d+):/);
    if (stepMatch) {
      if (currentStepNum !== null && hintLines.length > 0) {
        hints[currentStepNum] = hintLines.join(" ").trim();
      }
      currentStepNum = parseInt(stepMatch[1], 10);
      collecting = false;
      hintLines = [];
      continue;
    }

    if (currentStepNum !== null && line.includes("**Validation:**")) {
      const after = line.replace(/.*\*\*Validation:\*\*\s*/, "");
      hintLines = [after];
      collecting = true;
      continue;
    }

    if (collecting && line.trim() !== "" && !line.startsWith("#")) {
      hintLines.push(line.trim());
    } else if (collecting && (line.trim() === "" || line.startsWith("#"))) {
      collecting = false;
    }
  }

  if (currentStepNum !== null && hintLines.length > 0) {
    hints[currentStepNum] = hintLines.join(" ").trim();
  }

  return hints;
}

// --- Postman API helpers ---

function postmanGet(endpoint, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, POSTMAN_API);
    const req = https.get(
      url.href,
      { headers: { "x-api-key": apiKey } },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          if (res.statusCode === 401) {
            reject(new Error("Invalid API key. Check your Postman API key and try again."));
            return;
          }
          if (res.statusCode === 429) {
            reject(new Error("Rate limited by the Postman API. Wait a moment and try again."));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Postman API returned non-JSON (status ${res.statusCode})`));
          }
        });
      }
    );
    req.on("error", (e) => reject(new Error(`Network error: ${e.message}`)));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Postman API request timed out"));
    });
  });
}

// --- Validation engine ---

async function verifyKey(apiKey) {
  const data = await postmanGet("/me", apiKey);
  const user = data.user || data;
  return {
    success: true,
    user: {
      name: user.fullName || user.username || "Unknown",
      email: user.email || "",
      id: user.id || "",
    },
  };
}

async function validateStep(apiKey, step, hint, context) {
  if (!hint) {
    return { success: false, message: "No validation hint found for this step. Check your content.md has a **Validation:** block.", context };
  }

  if (step.manual || hint.includes("[MANUAL]")) {
    return { success: true, message: "Marked as done.", context };
  }

  const lowerHint = hint.toLowerCase();

  try {
    // Pattern: workspace exists by name
    const wsNameMatch = hint.match(/workspace\s+(?:named|with\s+(?:the\s+)?name)\s+["']([^"']+)["']/i)
      || hint.match(/workspace\s+(?:named|called)\s+["']([^"']+)["']/i)
      || hint.match(/workspace.*?["']([^"']+)["'].*?exists/i);

    const wsStartsMatch = hint.match(/workspace.*?(?:starts?\s+with|beginning\s+with)\s+["']([^"']+)["']/i);

    if (wsNameMatch || wsStartsMatch) {
      const data = await postmanGet("/workspaces", apiKey);
      const workspaces = data.workspaces || [];
      const searchName = (wsNameMatch ? wsNameMatch[1] : wsStartsMatch[1]).toLowerCase();

      const found = workspaces.find((ws) => {
        const name = ws.name.toLowerCase();
        return wsStartsMatch
          ? name.startsWith(searchName)
          : name.includes(searchName);
      });

      if (found) {
        return {
          success: true,
          message: `Found workspace "${found.name}" (${found.id})`,
          context: { ...context, workspaceId: found.id, workspaceName: found.name },
        };
      }
      return {
        success: false,
        message: `No workspace found matching "${wsNameMatch ? wsNameMatch[1] : wsStartsMatch[1]}". Found ${workspaces.length} workspace(s): ${workspaces.slice(0, 5).map((w) => w.name).join(", ")}${workspaces.length > 5 ? "..." : ""}`,
        context,
      };
    }

    // Pattern: collection exists by name (needs workspaceId from context)
    const colNameMatch = hint.match(/collection\s+(?:named|called)\s+["']([^"']+)["']/i)
      || hint.match(/collection\s+["']([^"']+)["'].*?exists/i)
      || hint.match(/collection.*?["']([^"']+)["']/i);

    if (colNameMatch && !lowerHint.includes("request")) {
      if (!context.workspaceId) {
        return { success: false, message: "Complete the workspace step first — need a workspace ID to check collections.", context };
      }

      const data = await postmanGet(`/workspaces/${context.workspaceId}`, apiKey);
      const ws = data.workspace || {};
      const collections = ws.collections || [];
      const searchName = colNameMatch[1].toLowerCase();

      const found = collections.find((c) => c.name.toLowerCase().includes(searchName));

      if (found) {
        return {
          success: true,
          message: `Found collection "${found.name}" in workspace "${context.workspaceName || context.workspaceId}"`,
          context: { ...context, collectionUid: found.uid, collectionName: found.name },
        };
      }
      return {
        success: false,
        message: `No collection matching "${colNameMatch[1]}" in workspace. Found: ${collections.map((c) => c.name).join(", ") || "(none)"}`,
        context,
      };
    }

    // Pattern: collection contains a request by name
    const reqNameMatch = hint.match(/(?:request|GET|POST|PUT|DELETE|PATCH)\s+(?:named|called)\s+["']([^"']+)["']/i)
      || hint.match(/contains?\s+(?:a\s+)?(?:GET|POST|PUT|DELETE|PATCH)?\s*request.*?["']([^"']+)["']/i)
      || hint.match(/["']([^"']+)["']\s+request/i);

    if (reqNameMatch || (colNameMatch && lowerHint.includes("request"))) {
      if (!context.collectionUid) {
        return { success: false, message: "Complete the collection step first — need a collection to check requests.", context };
      }

      const data = await postmanGet(`/collections/${context.collectionUid}`, apiKey);
      const col = data.collection || {};
      const items = flattenItems(col.item || []);

      if (reqNameMatch) {
        const searchName = reqNameMatch[1].toLowerCase();
        const found = items.find((item) => item.name && item.name.toLowerCase().includes(searchName));

        if (found) {
          const method = found.request ? (found.request.method || "GET") : "?";
          return {
            success: true,
            message: `Found request "${found.name}" (${method}) in collection "${context.collectionName || context.collectionUid}"`,
            context,
          };
        }
        return {
          success: false,
          message: `No request matching "${reqNameMatch[1]}" in collection. Found: ${items.map((i) => i.name).join(", ") || "(none)"}`,
          context,
        };
      }

      return {
        success: true,
        message: `Collection has ${items.length} request(s): ${items.map((i) => i.name).join(", ")}`,
        context,
      };
    }

    // Pattern: environment exists by name
    const envNameMatch = hint.match(/environment\s+(?:named|called)\s+["']([^"']+)["']/i)
      || hint.match(/environment\s+["']([^"']+)["'].*?exists/i);

    if (envNameMatch) {
      if (!context.workspaceId) {
        return { success: false, message: "Complete the workspace step first — need a workspace ID to check environments.", context };
      }

      const data = await postmanGet(`/workspaces/${context.workspaceId}`, apiKey);
      const ws = data.workspace || {};
      const envs = ws.environments || [];
      const searchName = envNameMatch[1].toLowerCase();

      const found = envs.find((e) => e.name.toLowerCase().includes(searchName));

      if (found) {
        return {
          success: true,
          message: `Found environment "${found.name}"`,
          context: { ...context, environmentId: found.id || found.uid },
        };
      }
      return {
        success: false,
        message: `No environment matching "${envNameMatch[1]}" in workspace. Found: ${envs.map((e) => e.name).join(", ") || "(none)"}`,
        context,
      };
    }

    // Pattern: test script / pm.test
    if (lowerHint.includes("pm.test") || lowerHint.includes("test script") || lowerHint.includes("post-response script")) {
      if (!context.collectionUid) {
        return { success: false, message: "Complete the collection step first.", context };
      }

      const data = await postmanGet(`/collections/${context.collectionUid}`, apiKey);
      const col = data.collection || {};
      const items = flattenItems(col.item || []);

      const withTests = items.filter((item) => {
        if (!item.event) return false;
        return item.event.some((e) =>
          e.listen === "test" && e.script && e.script.exec && e.script.exec.some((line) => line.includes("pm.test"))
        );
      });

      if (withTests.length > 0) {
        return {
          success: true,
          message: `Found test scripts in ${withTests.length} request(s): ${withTests.map((i) => i.name).join(", ")}`,
          context,
        };
      }
      return {
        success: false,
        message: "No requests with pm.test scripts found in the collection.",
        context,
      };
    }

    // Pattern: query parameter
    if (lowerHint.includes("query param") || lowerHint.includes("parameter")) {
      if (!context.collectionUid) {
        return { success: false, message: "Complete the collection step first.", context };
      }

      const data = await postmanGet(`/collections/${context.collectionUid}`, apiKey);
      const col = data.collection || {};
      const items = flattenItems(col.item || []);

      const withParams = items.filter((item) => {
        if (!item.request || !item.request.url) return false;
        const url = item.request.url;
        const queries = url.query || [];
        return queries.length > 0;
      });

      if (withParams.length > 0) {
        return {
          success: true,
          message: `Found query parameters in ${withParams.length} request(s): ${withParams.map((i) => i.name).join(", ")}`,
          context,
        };
      }
      return {
        success: false,
        message: "No requests with query parameters found in the collection.",
        context,
      };
    }

    // Pattern: variable / {{variable}}
    if (lowerHint.includes("{{") || (lowerHint.includes("variable") && lowerHint.includes("url"))) {
      if (!context.collectionUid) {
        return { success: false, message: "Complete the collection step first.", context };
      }

      const data = await postmanGet(`/collections/${context.collectionUid}`, apiKey);
      const col = data.collection || {};
      const items = flattenItems(col.item || []);

      const withVars = items.filter((item) => {
        if (!item.request || !item.request.url) return false;
        const raw = typeof item.request.url === "string" ? item.request.url : item.request.url.raw || "";
        return raw.includes("{{");
      });

      if (withVars.length > 0) {
        return {
          success: true,
          message: `Found variable usage in ${withVars.length} request URL(s): ${withVars.map((i) => i.name).join(", ")}`,
          context,
        };
      }
      return {
        success: false,
        message: "No requests using {{variables}} in their URLs.",
        context,
      };
    }

    // Fallback: unrecognized pattern
    return {
      success: false,
      message: `Auto-validation not available for this pattern. Hint: "${hint.slice(0, 120)}${hint.length > 120 ? "..." : ""}"`,
      context,
    };
  } catch (err) {
    return { success: false, message: err.message, context };
  }
}

function flattenItems(items) {
  const result = [];
  for (const item of items) {
    if (item.item) {
      result.push(...flattenItems(item.item));
    } else {
      result.push(item);
    }
  }
  return result;
}

// --- HTTP helpers ---

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

// --- HTML builder ---

function buildHtml() {
  const { moduleJson, contentMd } = readModuleData();
  const mod = moduleJson;
  const hints = extractValidationHints(contentMd);

  const totalSteps = mod.lessons.reduce((s, l) => s + l.steps.length, 0);
  const totalPoints = mod.lessons.reduce(
    (s, l) => s + l.steps.reduce((ss, st) => ss + st.points, 0), 0
  );

  const hintsJson = JSON.stringify(hints);
  const moduleDataJson = JSON.stringify(mod);

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
    --error: #ef4444;
    --radius: 12px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    padding-bottom: 60px;
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

  .header-logo { font-weight: 700; font-size: 18px; color: var(--accent); letter-spacing: -0.5px; }
  .header-sep { color: var(--border); font-size: 20px; }
  .header-title { font-size: 14px; color: var(--text-dim); }

  /* API key bar */
  .api-key-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 53px;
    z-index: 9;
  }

  .api-key-bar label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .api-key-bar input {
    flex: 1;
    max-width: 420px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text);
    font-size: 13px;
    font-family: "SF Mono", "Fira Code", monospace;
  }

  .api-key-bar input:focus { outline: none; border-color: var(--accent); }

  .api-key-bar .connect-btn {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .api-key-bar .connect-btn:hover { opacity: 0.9; }
  .api-key-bar .connect-btn:disabled { opacity: 0.5; cursor: default; }

  .key-status {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .key-status.connected { color: var(--success); }
  .key-status.error { color: var(--error); }
  .key-status.loading { color: var(--text-dim); }

  /* Progress bar */
  .progress-bar-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 24px 0;
  }

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .progress-track {
    flex: 1;
    height: 8px;
    background: var(--surface-2);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--success);
    border-radius: 4px;
    transition: width 0.4s ease;
    width: 0%;
  }

  .progress-label {
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .progress-label strong { color: var(--success); font-size: 15px; }

  .container {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 24px 32px;
  }

  /* Hero card */
  .hero {
    background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    margin-bottom: 32px;
    position: relative;
    overflow: hidden;
  }
  .hero::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--accent); }
  .hero-icon { font-size: 48px; margin-bottom: 16px; }
  .hero h1 { font-size: 32px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px; }
  .hero-desc { color: var(--text-dim); font-size: 16px; line-height: 1.7; max-width: 640px; }
  .hero-stats { display: flex; gap: 24px; margin-top: 24px; }
  .stat { display: flex; flex-direction: column; }
  .stat-value { font-size: 24px; font-weight: 700; color: var(--accent); }
  .stat-label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
  .private-badge { display: inline-block; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 12px; vertical-align: middle; }

  /* Getting started */
  .getting-started { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 32px; }
  .getting-started h2 { font-size: 18px; margin-bottom: 12px; color: var(--accent); }
  .getting-started-content { color: var(--text-dim); font-size: 14px; line-height: 1.7; }

  /* Lessons */
  .lesson { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 24px; overflow: hidden; }
  .lesson-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
  .lesson-header:hover { background: var(--surface-2); }
  .lesson-number { background: var(--accent); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .lesson-title { font-size: 18px; font-weight: 600; }
  .lesson-step-count { margin-left: auto; font-size: 13px; color: var(--text-dim); }
  .lesson-desc { padding: 0 24px 16px; color: var(--text-dim); font-size: 14px; border-bottom: 1px solid var(--border); }
  .lesson-body { overflow: hidden; transition: max-height 0.3s ease; }
  .lesson-body.collapsed { max-height: 0 !important; }
  .chevron { margin-left: 8px; transition: transform 0.3s ease; color: var(--text-dim); font-size: 12px; }
  .chevron.open { transform: rotate(90deg); }

  /* Steps */
  .step { padding: 20px 24px; border-bottom: 1px solid var(--border); }
  .step:last-child { border-bottom: none; }
  .step.completed { background: rgba(16, 185, 129, 0.03); }
  .step-header { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; user-select: none; }
  .step-number { background: var(--surface-2); border: 2px solid var(--border); color: var(--text-dim); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px; transition: all 0.3s ease; }
  .step.completed .step-number { background: var(--success); border-color: var(--success); color: #fff; }
  .step-title-row { flex: 1; }
  .step-title { font-size: 15px; font-weight: 600; }
  .step-meta { display: flex; gap: 12px; margin-top: 4px; align-items: center; }
  .step-points { font-size: 12px; color: var(--accent); font-weight: 600; }
  .step-manual { font-size: 11px; background: rgba(139,92,246,0.15); color: #a78bfa; border-radius: 4px; padding: 1px 6px; font-weight: 500; }
  .step-input-tag { font-size: 11px; background: rgba(6,182,212,0.15); color: #22d3ee; border-radius: 4px; padding: 1px 6px; font-weight: 500; }

  .step-desc { margin-top: 12px; padding-left: 36px; color: var(--text-dim); font-size: 14px; line-height: 1.7; display: none; }
  .step-desc.open { display: block; }
  .step-desc p { margin-bottom: 8px; }
  .step-desc ol, .step-desc ul { margin: 8px 0 8px 20px; }
  .step-desc li { margin-bottom: 4px; }
  .step-desc code { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: "SF Mono", "Fira Code", monospace; }
  .step-desc pre { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; overflow-x: auto; margin: 8px 0; font-size: 13px; font-family: "SF Mono", "Fira Code", monospace; line-height: 1.5; }
  .step-desc pre code { background: none; padding: 0; }
  .step-desc strong { color: var(--text); }
  .step-desc a { color: var(--accent); text-decoration: none; }
  .step-desc a:hover { text-decoration: underline; }
  .step-desc blockquote { border-left: 3px solid var(--accent); padding: 8px 16px; margin: 8px 0; background: rgba(255,108,55,0.05); border-radius: 0 8px 8px 0; }
  .step-desc table { border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  .step-desc th, .step-desc td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
  .step-desc th { background: var(--surface-2); font-weight: 600; }

  /* Step action area */
  .step-actions { margin-top: 12px; padding-left: 36px; display: none; }
  .step-desc.open ~ .step-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

  .step-input-preview { margin-bottom: 8px; }
  .input-label { font-size: 12px; color: var(--text-dim); margin-bottom: 4px; font-weight: 500; }
  .input-field { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; color: var(--text); font-size: 14px; width: 280px; }
  .input-field:focus { outline: none; border-color: var(--accent); }
  .input-field::placeholder { color: var(--text-dim); opacity: 0.5; }

  .validate-btn {
    padding: 8px 24px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .validate-btn:hover { opacity: 0.9; }
  .validate-btn:disabled { opacity: 0.5; cursor: default; }
  .validate-btn.api { background: var(--accent); color: #fff; }
  .validate-btn.manual { background: rgba(139,92,246,0.2); color: #a78bfa; border: 1px solid rgba(139,92,246,0.3); }
  .validate-btn.loading { position: relative; color: transparent; }
  .validate-btn.loading::after { content: ""; position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

  @keyframes spin { to { transform: rotate(360deg); } }

  .step-result {
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 8px;
    margin-left: 36px;
    display: none;
    line-height: 1.5;
  }
  .step-result.visible { display: block; }
  .step-result.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: var(--success); }
  .step-result.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--error); }

  .footer { text-align: center; padding: 32px 24px; color: var(--text-dim); font-size: 12px; }
  .footer a { color: var(--accent); text-decoration: none; }

  .reload-bar { position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 8px 24px; text-align: center; z-index: 20; }
  .reload-bar button { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 8px 24px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .reload-bar button:hover { opacity: 0.9; }
  .reload-bar span { margin-left: 12px; color: var(--text-dim); font-size: 12px; }
</style>
</head>
<body>

<div class="header">
  <span class="header-logo">\u{1F680} LiftOff</span>
  <span class="header-sep">/</span>
  <span class="header-title">Module Preview</span>
</div>

<div class="api-key-bar">
  <label for="api-key-input">Postman API Key</label>
  <input type="password" id="api-key-input" placeholder="PMAK-..." autocomplete="off">
  <button class="connect-btn" id="connect-btn" onclick="connectKey()">Connect</button>
  <span class="key-status" id="key-status"></span>
</div>

<div class="progress-bar-container">
  <div class="progress-wrap">
    <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
    <div class="progress-label"><strong id="points-earned">0</strong> / ${totalPoints} pts</div>
  </div>
</div>

<div class="container">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-icon">${escHtml(mod.icon || "\u{1F680}")}</div>
    <h1>
      ${escHtml(mod.title)}
      ${mod.private ? '<span class="private-badge">Private</span>' : ""}
    </h1>
    <div class="hero-desc">${renderMarkdownInline(mod.description)}</div>
    <div class="hero-stats">
      <div class="stat"><span class="stat-value">${mod.lessons.length}</span><span class="stat-label">Lessons</span></div>
      <div class="stat"><span class="stat-value">${totalSteps}</span><span class="stat-label">Steps</span></div>
      <div class="stat"><span class="stat-value">${totalPoints}</span><span class="stat-label">Points</span></div>
    </div>
  </div>

  ${mod.gettingStarted ? `
  <div class="getting-started">
    <h2>${escHtml(mod.gettingStartedTitle || "Before you start")}</h2>
    <div class="getting-started-content">${renderMarkdownBlock(mod.gettingStarted)}</div>
  </div>` : ""}

  <!-- Lessons -->
  ${mod.lessons.map((lesson, li) => `
  <div class="lesson">
    <div class="lesson-header" onclick="toggleLesson(${li})">
      <span class="lesson-number">${lesson.partNumber}</span>
      <span class="lesson-title">${escHtml(lesson.title)}</span>
      <span class="lesson-step-count">${lesson.steps.length} step${lesson.steps.length !== 1 ? "s" : ""}</span>
      <span class="chevron open" id="chevron-${li}">▶</span>
    </div>
    ${lesson.description ? `<div class="lesson-desc">${renderMarkdownInline(lesson.description)}</div>` : ""}
    <div class="lesson-body" id="lesson-body-${li}">
      ${lesson.steps.map((step, si) => `
      <div class="step" id="step-${li}-${si}" data-step-number="${step.stepNumber}" data-validator-id="${escHtml(step.validatorId)}" data-points="${step.points}" data-manual="${step.manual || false}">
        <div class="step-header" onclick="toggleStep(${li}, ${si})">
          <span class="step-number" id="step-num-${li}-${si}">${step.stepNumber}</span>
          <div class="step-title-row">
            <div class="step-title">${escHtml(step.title)}</div>
            <div class="step-meta">
              <span class="step-points">${step.points} pts</span>
              ${step.manual ? '<span class="step-manual">Manual</span>' : ""}
              ${step.inputField ? '<span class="step-input-tag">Input</span>' : ""}
            </div>
          </div>
        </div>
        <div class="step-desc" id="step-desc-${li}-${si}">${renderMarkdownBlock(step.description)}</div>
        <div class="step-actions">
          ${step.inputField ? `
          <div class="step-input-preview">
            <div class="input-label">${escHtml(step.inputField.label)}</div>
            <input class="input-field" type="text" id="input-${li}-${si}" placeholder="${escHtml(step.inputField.placeholder || "")}">
          </div>` : ""}
          <button class="validate-btn ${step.manual ? "manual" : "api"}" id="btn-${li}-${si}" onclick="runValidation(${li}, ${si})">
            ${step.manual ? "✓ Done" : "Validate"}
          </button>
        </div>
        <div class="step-result" id="result-${li}-${si}"></div>
      </div>`).join("")}
    </div>
  </div>`).join("")}

</div>

<div class="reload-bar">
  <button onclick="location.reload()">↻ Reload Preview</button>
  <span>Edit your module files, then reload to see changes</span>
</div>

<div class="footer">
  <p>LiftOff Community Module Preview · <a href="https://github.com/Postman-DevRel/liftoff-community-modules">GitHub</a></p>
</div>

<script>
const MODULE = ${moduleDataJson};
const HINTS = ${hintsJson};
const TOTAL_POINTS = ${totalPoints};

let apiKey = '';
let connected = false;
let context = {};
let completedSteps = new Set();
let earnedPoints = 0;

// --- API key connection ---

async function connectKey() {
  const input = document.getElementById('api-key-input');
  const btn = document.getElementById('connect-btn');
  const status = document.getElementById('key-status');

  apiKey = input.value.trim();
  if (!apiKey) { status.className = 'key-status error'; status.textContent = 'Enter an API key'; return; }

  btn.disabled = true;
  status.className = 'key-status loading';
  status.textContent = 'Connecting...';

  try {
    const res = await fetch('/api/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const data = await res.json();

    if (data.success) {
      connected = true;
      status.className = 'key-status connected';
      status.textContent = '✓ ' + data.user.name + (data.user.email ? ' (' + data.user.email + ')' : '');
      btn.textContent = 'Connected';
      input.type = 'password';
    } else {
      status.className = 'key-status error';
      status.textContent = data.message || 'Connection failed';
    }
  } catch (e) {
    status.className = 'key-status error';
    status.textContent = 'Network error';
  }
  btn.disabled = false;
}

document.getElementById('api-key-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') connectKey();
});

// --- Step validation ---

async function runValidation(li, si) {
  const stepEl = document.getElementById('step-' + li + '-' + si);
  const btn = document.getElementById('btn-' + li + '-' + si);
  const resultEl = document.getElementById('result-' + li + '-' + si);
  const stepNum = parseInt(stepEl.dataset.stepNumber);
  const validatorId = stepEl.dataset.validatorId;
  const isManual = stepEl.dataset.manual === 'true';
  const stepKey = li + '-' + si;

  if (completedSteps.has(stepKey)) return;

  if (!isManual && !connected) {
    resultEl.className = 'step-result visible error';
    resultEl.textContent = 'Connect your Postman API key first.';
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, stepNumber: stepNum, validatorId, context })
    });
    const data = await res.json();

    if (data.context) context = data.context;

    if (data.success) {
      completedSteps.add(stepKey);
      earnedPoints += parseInt(stepEl.dataset.points) || 0;
      stepEl.classList.add('completed');

      const numEl = document.getElementById('step-num-' + li + '-' + si);
      numEl.textContent = '✓';

      resultEl.className = 'step-result visible success';
      resultEl.textContent = data.message;

      updateProgress();
    } else {
      resultEl.className = 'step-result visible error';
      resultEl.textContent = data.message;
    }
  } catch (e) {
    resultEl.className = 'step-result visible error';
    resultEl.textContent = 'Request failed: ' + e.message;
  }

  btn.classList.remove('loading');
  btn.disabled = completedSteps.has(stepKey);
}

function updateProgress() {
  const pct = TOTAL_POINTS > 0 ? (earnedPoints / TOTAL_POINTS * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('points-earned').textContent = earnedPoints;
}

// --- UI toggles ---

function toggleLesson(li) {
  document.getElementById('lesson-body-' + li).classList.toggle('collapsed');
  document.getElementById('chevron-' + li).classList.toggle('open');
}

function toggleStep(li, si) {
  document.getElementById('step-desc-' + li + '-' + si).classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function() {
  var first = document.getElementById('step-desc-0-0');
  if (first) first.classList.add('open');
});
</script>

</body>
</html>`;
}

// --- Markdown rendering ---

function escHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderMarkdownInline(text) {
  if (!text) return "";
  let s = escHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  s = s.replace(/\n/g, " ");
  return s;
}

function renderMarkdownBlock(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inCodeBlock = false, codeLines = [];
  let inList = false, listType = "";
  let inTable = false, tableRows = [];
  let inBlockquote = false, bqLines = [];

  function flushBq() { if (inBlockquote && bqLines.length) { html += "<blockquote>" + bqLines.join("<br>") + "</blockquote>"; bqLines = []; inBlockquote = false; } }
  function flushList2() { if (inList) { html += listType === "ol" ? "</ol>" : "</ul>"; inList = false; } }
  function flushTable2() { if (inTable && tableRows.length) { html += "<table>"; tableRows.forEach((row, i) => { const tag = i === 0 ? "th" : "td"; html += "<tr>" + row.map(c => "<" + tag + ">" + fmt(c) + "</" + tag + ">").join("") + "</tr>"; }); html += "</table>"; tableRows = []; inTable = false; } }
  function fmt(s) { s = escHtml(s); s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); s = s.replace(/\*(.+?)\*/g, "<em>$1</em>"); s = s.replace(/`(.+?)`/g, "<code>$1</code>"); s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>'); return s; }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) { if (inCodeBlock) { html += "<pre><code>" + escHtml(codeLines.join("\n")) + "</code></pre>"; codeLines = []; inCodeBlock = false; } else { flushBq(); flushList2(); flushTable2(); inCodeBlock = true; } continue; }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (line.startsWith("> ")) { flushList2(); flushTable2(); inBlockquote = true; bqLines.push(fmt(line.slice(2))); continue; } else { flushBq(); }
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) { const cells = line.split("|").slice(1, -1).map(c => c.trim()); if (cells.every(c => /^[-:]+$/.test(c))) continue; flushList2(); inTable = true; tableRows.push(cells); continue; } else { flushTable2(); }
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) { flushTable2(); if (!inList || listType !== "ol") { flushList2(); html += "<ol>"; inList = true; listType = "ol"; } html += "<li>" + fmt(olMatch[2]) + "</li>"; continue; }
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) { flushTable2(); if (!inList || listType !== "ul") { flushList2(); html += "<ul>"; inList = true; listType = "ul"; } html += "<li>" + fmt(ulMatch[1]) + "</li>"; continue; }
    flushList2();
    if (line.trim() === "") continue;
    html += "<p>" + fmt(line) + "</p>";
  }
  flushBq(); flushList2(); flushTable2();
  if (inCodeBlock) html += "<pre><code>" + escHtml(codeLines.join("\n")) + "</code></pre>";
  return html;
}

// --- HTTP server ---

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildHtml());
    return;
  }

  if (req.url === "/api/module" && req.method === "GET") {
    const { moduleJson } = readModuleData();
    jsonResponse(res, 200, moduleJson);
    return;
  }

  if (req.url === "/api/verify-key" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const result = await verifyKey(body.apiKey);
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 200, { success: false, message: e.message });
    }
    return;
  }

  if (req.url === "/api/validate" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { moduleJson, contentMd } = readModuleData();
      const hints = extractValidationHints(contentMd);

      const stepNumber = body.stepNumber;
      const hint = hints[stepNumber] || "";

      let step = null;
      for (const lesson of moduleJson.lessons) {
        for (const s of lesson.steps) {
          if (s.stepNumber === stepNumber) { step = s; break; }
        }
        if (step) break;
      }

      if (!step) {
        jsonResponse(res, 200, { success: false, message: "Step not found in module.json" });
        return;
      }

      const result = await validateStep(body.apiKey, step, hint, body.context || {});
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 200, { success: false, message: e.message });
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`
  \u{1F680} LiftOff Module Preview
  ─────────────────────────
  Module:  ${moduleId}
  URL:     http://localhost:${PORT}

  Enter your Postman API key in the browser to validate steps
  against the real Postman API. Edit files and reload to see changes.
  Press Ctrl+C to stop.
`);
});
