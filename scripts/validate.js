#!/usr/bin/env node

/**
 * Validates community module submissions.
 * Checks: JSON schema, content.md exists, validator stubs exist,
 * IDs are consistent, and no collisions with existing modules.
 */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");

const MODULES_DIR = path.resolve(__dirname, "..", "modules");
const SCHEMA_PATH = path.resolve(__dirname, "..", "schema", "module-schema.json");

const ajv = new Ajv({ allErrors: true });

function loadSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf-8");
  return JSON.parse(raw);
}

function findModuleDirs() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function validateModule(moduleDir) {
  const errors = [];
  const warnings = [];
  const modulePath = path.join(MODULES_DIR, moduleDir);

  // 1. module.json must exist
  const jsonPath = path.join(modulePath, "module.json");
  if (!fs.existsSync(jsonPath)) {
    errors.push(`${moduleDir}: missing module.json`);
    return { errors, warnings };
  }

  // 2. Parse JSON
  let moduleData;
  try {
    moduleData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch (e) {
    errors.push(`${moduleDir}: module.json is not valid JSON — ${e.message}`);
    return { errors, warnings };
  }

  // 3. Validate against schema
  const schema = loadSchema();
  const validate = ajv.compile(schema);
  const valid = validate(moduleData);
  if (!valid) {
    for (const err of validate.errors) {
      errors.push(
        `${moduleDir}: schema error at ${err.instancePath || "/"} — ${err.message}`
      );
    }
  }

  // 4. Module directory name must match the id field
  if (moduleData.id && moduleData.id !== moduleDir) {
    errors.push(
      `${moduleDir}: directory name "${moduleDir}" does not match module id "${moduleData.id}"`
    );
  }

  // 5. content.md must exist
  const contentPath = path.join(modulePath, "content.md");
  if (!fs.existsSync(contentPath)) {
    errors.push(`${moduleDir}: missing content.md`);
  } else {
    const content = fs.readFileSync(contentPath, "utf-8").trim();
    if (content.length < 100) {
      warnings.push(
        `${moduleDir}: content.md is very short (${content.length} chars) — consider adding more detail`
      );
    }
  }

  // 6. Collect and check validator IDs
  if (moduleData.lessons) {
    const validatorIds = [];
    for (const lesson of moduleData.lessons) {
      if (!lesson.steps) continue;
      for (const step of lesson.steps) {
        if (step.validatorId) {
          validatorIds.push(step.validatorId);
        }
      }
    }

    // Check for duplicate validator IDs
    const seen = new Set();
    for (const vid of validatorIds) {
      if (seen.has(vid)) {
        errors.push(`${moduleDir}: duplicate validatorId "${vid}"`);
      }
      seen.add(vid);
    }

    // Check that validator IDs follow the module naming convention
    const expectedPrefix = `validate-${moduleData.id}-`;
    for (const vid of validatorIds) {
      if (!vid.startsWith(expectedPrefix)) {
        warnings.push(
          `${moduleDir}: validatorId "${vid}" does not start with expected prefix "${expectedPrefix}"`
        );
      }
    }

    // Check that validator stub files exist
    const validatorsDir = path.join(modulePath, "validators");
    if (validatorIds.length > 0 && !fs.existsSync(validatorsDir)) {
      errors.push(
        `${moduleDir}: missing validators/ directory — create a stub file for each validatorId`
      );
    } else if (fs.existsSync(validatorsDir)) {
      for (const vid of validatorIds) {
        const stubPath = path.join(validatorsDir, `${vid}.ts`);
        if (!fs.existsSync(stubPath)) {
          errors.push(
            `${moduleDir}: missing validator stub validators/${vid}.ts`
          );
        }
      }
    }
  }

  // 7. Check lesson/step ID consistency
  if (moduleData.lessons) {
    const lessonIds = new Set();
    const stepIds = new Set();

    for (const lesson of moduleData.lessons) {
      if (lessonIds.has(lesson.id)) {
        errors.push(`${moduleDir}: duplicate lesson id "${lesson.id}"`);
      }
      lessonIds.add(lesson.id);

      if (lesson.steps) {
        for (const step of lesson.steps) {
          if (stepIds.has(step.id)) {
            errors.push(`${moduleDir}: duplicate step id "${step.id}"`);
          }
          stepIds.add(step.id);
        }
      }
    }
  }

  // 8. Badge image (optional but recommended)
  const badgePath = path.join(modulePath, "badge.png");
  if (!fs.existsSync(badgePath)) {
    warnings.push(
      `${moduleDir}: no badge.png found — consider adding a badge image (recommended size: 1024x1024)`
    );
  }

  return { errors, warnings };
}

// --- Main ---

const moduleDirs = findModuleDirs();

if (moduleDirs.length === 0) {
  console.log("No modules found in modules/ — nothing to validate.");
  process.exit(0);
}

let totalErrors = 0;
let totalWarnings = 0;

for (const dir of moduleDirs) {
  console.log(`\nValidating ${dir}...`);
  const { errors, warnings } = validateModule(dir);

  for (const w of warnings) {
    console.log(`  ⚠  ${w}`);
    totalWarnings++;
  }
  for (const e of errors) {
    console.log(`  ✗  ${e}`);
    totalErrors++;
  }
  if (errors.length === 0) {
    console.log(`  ✓  ${dir} passed validation`);
  }
}

console.log(
  `\n${moduleDirs.length} module(s) checked — ${totalErrors} error(s), ${totalWarnings} warning(s)`
);

if (totalErrors > 0) {
  process.exit(1);
}
