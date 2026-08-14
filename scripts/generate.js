#!/usr/bin/env node

/**
 * Generates module.json and validator stubs from a structured content.md file.
 *
 * Usage:
 *   node scripts/generate.js modules/my-module-name
 *   node scripts/generate.js modules/my-module-name --private
 *
 * The content.md must follow this format:
 *
 *   # Module Title
 *   Description paragraph(s)...
 *
 *   ## Part 1: Lesson Title
 *   Optional lesson description...
 *
 *   ### Step 1: Step Title
 *   Step instructions (full markdown)...
 *
 *   **Validation:** What the validator checks.
 *
 *   ### Step 2: Another Step
 *   ...
 *   **Validation:** [MANUAL] Learner self-reports completion.
 */

const fs = require("fs");
const path = require("path");

const COLORS = ["#FF6C37", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EC4899"];
const ICONS = ["🚀", "🔧", "🌐", "📡", "🧪", "⚡", "🎯", "🔬", "📦", "🛡️"];

function usage() {
  console.log(`
Usage: node scripts/generate.js <module-directory> [--private]

Examples:
  node scripts/generate.js modules/my-module-name
  node scripts/generate.js modules/my-module-name --private

The module directory must contain a content.md file written in the
structured authoring format (see module-template/content.md).
`);
  process.exit(1);
}

function toKebab(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseContentMd(text) {
  const lines = text.split("\n");

  const firstFiveLines = lines.slice(0, 5).join("\n");
  const isPrivate = firstFiveLines.includes("**PRIVATE**");

  // Strip the PRIVATE marker before parsing
  const cleaned = isPrivate
    ? lines.map((l) => (l.includes("**PRIVATE**") ? "" : l)).join("\n")
    : text;

  const result = {
    title: "",
    description: "",
    gettingStarted: null,
    isPrivate,
    lessons: [],
  };

  const sectionLines = cleaned.split("\n");
  let i = 0;

  // Skip leading blank lines
  while (i < sectionLines.length && sectionLines[i].trim() === "") i++;

  // Parse H1 title
  if (i < sectionLines.length && sectionLines[i].startsWith("# ")) {
    result.title = sectionLines[i].replace(/^# /, "").trim();
    i++;
  } else {
    throw new Error("content.md must start with an H1 (# Title)");
  }

  // Collect description — everything between H1 and the first H2 or H3
  const descLines = [];
  const prePartLines = [];
  let foundFirstHeading = false;

  while (i < sectionLines.length) {
    const line = sectionLines[i];
    if (line.startsWith("## ") || line.startsWith("### ")) {
      foundFirstHeading = true;
      break;
    }
    descLines.push(line);
    i++;
  }

  // Split desc: first paragraph(s) before --- or ### become description,
  // content between a standalone ### (non-Part) and first ## Part becomes gettingStarted
  const descText = descLines.join("\n").trim();

  // Check if there's a --- separator: content before it is description,
  // standalone H3 sections after it (before first ## Part) become gettingStarted
  const hrIndex = descLines.findIndex((l) => l.trim() === "---");
  if (hrIndex >= 0) {
    result.description = descLines.slice(0, hrIndex).join("\n").trim();
  } else {
    result.description = descText;
  }

  // Check for standalone H3 sections before first ## Part (gettingStarted content)
  // These are H3s that appear before any ## Part heading
  if (foundFirstHeading && sectionLines[i] && sectionLines[i].startsWith("### ")) {
    const gsLines = [];
    while (i < sectionLines.length && !sectionLines[i].startsWith("## ")) {
      gsLines.push(sectionLines[i]);
      i++;
    }
    const gsText = gsLines.join("\n").trim();
    if (gsText) {
      result.gettingStarted = gsText;
    }
  }

  // Parse lessons (## Part N: Title) and steps (### Step N: Title)
  let currentLesson = null;
  let currentStep = null;
  let stepContentLines = [];

  function flushStep() {
    if (!currentStep) return;
    const content = stepContentLines.join("\n").trim();

    // Extract **Validation:** block
    const valMatch = content.match(/\*\*Validation:\*\*\s*([\s\S]*?)$/);
    let description = content;
    let validationText = "";
    let isManual = false;

    if (valMatch) {
      description = content.slice(0, valMatch.index).trim();
      validationText = valMatch[1].trim();
      isManual = validationText.includes("[MANUAL]");
    }

    currentStep.description = description;
    currentStep.validationHint = validationText;
    if (isManual) currentStep.manual = true;

    if (currentLesson) {
      currentLesson.steps.push(currentStep);
    }
    currentStep = null;
    stepContentLines = [];
  }

  function flushLesson() {
    flushStep();
    if (currentLesson && currentLesson.steps.length > 0) {
      result.lessons.push(currentLesson);
    }
    currentLesson = null;
  }

  while (i < sectionLines.length) {
    const line = sectionLines[i];

    // Match ## Part N: Title
    const partMatch = line.match(/^## Part (\d+):\s*(.+)$/);
    if (partMatch) {
      flushLesson();
      const partNumber = parseInt(partMatch[1], 10);
      const lessonTitle = partMatch[2].trim();
      const lessonSlug = toKebab(lessonTitle);
      currentLesson = {
        id: `lesson-${partNumber}-${lessonSlug}`,
        slug: lessonSlug,
        title: lessonTitle,
        partNumber,
        description: "",
        steps: [],
      };

      // Collect lesson description (lines between ## Part and first ### Step)
      i++;
      const lessonDescLines = [];
      while (i < sectionLines.length) {
        if (
          sectionLines[i].startsWith("### ") ||
          sectionLines[i].startsWith("## ")
        ) {
          break;
        }
        // Skip horizontal rules between parts
        if (sectionLines[i].trim() === "---") {
          i++;
          continue;
        }
        lessonDescLines.push(sectionLines[i]);
        i++;
      }
      currentLesson.description = lessonDescLines.join("\n").trim();
      continue;
    }

    // Match ### Step N: Title
    const stepMatch = line.match(/^### Step (\d+):\s*(.+)$/);
    if (stepMatch) {
      flushStep();
      const stepNumber = parseInt(stepMatch[1], 10);
      const stepTitle = stepMatch[2].trim();
      const stepSlug = toKebab(stepTitle);
      currentStep = {
        id: `step-${stepNumber}-${stepSlug}`,
        stepNumber,
        title: stepTitle,
        slug: stepSlug,
        description: "",
        points: 10,
      };
      i++;
      continue;
    }

    // Skip --- separators between parts
    if (line.trim() === "---" && !currentStep) {
      i++;
      continue;
    }

    // Accumulate step content
    if (currentStep) {
      stepContentLines.push(line);
    }

    i++;
  }

  flushLesson();

  if (result.lessons.length === 0) {
    throw new Error(
      'No lessons found. content.md must have at least one "## Part N: Title" section.'
    );
  }

  return result;
}

function buildModuleJson(moduleId, parsed, options = {}) {
  const color = options.color || COLORS[Math.floor(Math.random() * COLORS.length)];
  const icon = options.icon || ICONS[Math.floor(Math.random() * ICONS.length)];

  const module = {
    id: moduleId,
    title: parsed.title,
    description: parsed.description,
  };

  if (parsed.gettingStarted) {
    module.gettingStarted = parsed.gettingStarted;
    module.gettingStartedTitle = "Before you start";
  }

  module.color = color;
  module.icon = icon;

  if (parsed.isPrivate || options.isPrivate) {
    module.private = true;
  }

  module.lessons = parsed.lessons.map((lesson) => {
    const lessonObj = {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      partNumber: lesson.partNumber,
    };

    if (lesson.description) {
      lessonObj.description = lesson.description;
    }

    lessonObj.steps = lesson.steps.map((step) => {
      const stepObj = {
        id: step.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        points: step.points,
        validatorId: `validate-${moduleId}-${step.slug}`,
      };

      if (step.manual) {
        stepObj.manual = true;
      }

      return stepObj;
    });

    return lessonObj;
  });

  return module;
}

function generateValidatorStub(validatorId, step, moduleId) {
  if (step.manual) {
    return `import type { ValidatorFn } from "../types";

/**
 * ${step.title}
 * Manual validation — learner self-reports completion.
 */
export const ${toCamelCase(validatorId)}: ValidatorFn = async (_apiKey, _context) => {
  return { success: true, message: "Self-verified by learner." };
};
`;
  }

  return `import type { ValidatorFn } from "../types";

/**
 * ${step.title}
 * TODO: Implement validation logic.
 * Hint: ${step.validationHint || "Check that the learner completed this step."}
 */
export const ${toCamelCase(validatorId)}: ValidatorFn = async (apiKey, context) => {
  // Example: call the Postman API to verify the step
  // const workspaces = await listWorkspaces(apiKey);
  // const found = workspaces.find(ws => ws.name.includes("..."));

  return {
    success: false,
    message: "Validator not yet implemented — replace this stub with real logic.",
  };
};
`;
}

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function generateTypesFile() {
  return `export interface ValidationContext {
  userId?: string;
  workspaceId?: string;
  environmentId?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  context?: Partial<ValidationContext>;
}

export type ValidatorFn = (
  apiKey: string,
  context: ValidationContext
) => Promise<ValidationResult>;
`;
}

// --- Main ---

const args = process.argv.slice(2);
if (args.length === 0) usage();

const moduleDir = args[0];
const forcePrivate = args.includes("--private");

const fullPath = path.resolve(moduleDir);
const moduleId = path.basename(fullPath);

const contentPath = path.join(fullPath, "content.md");
if (!fs.existsSync(contentPath)) {
  console.error(`✗ No content.md found at ${contentPath}`);
  console.error(
    "  Create your content.md first, then run this script to generate module.json."
  );
  process.exit(1);
}

console.log(`\nGenerating module from ${contentPath}...\n`);

const contentText = fs.readFileSync(contentPath, "utf-8");
let parsed;
try {
  parsed = parseContentMd(contentText);
} catch (e) {
  console.error(`✗ Parse error: ${e.message}`);
  process.exit(1);
}

const moduleJson = buildModuleJson(moduleId, parsed, { isPrivate: forcePrivate });

// Check for existing module.json — don't overwrite without flag
const jsonPath = path.join(fullPath, "module.json");
if (fs.existsSync(jsonPath)) {
  const existing = fs.readFileSync(jsonPath, "utf-8");
  const existingData = JSON.parse(existing);
  // Preserve color and icon from existing module.json
  moduleJson.color = existingData.color || moduleJson.color;
  moduleJson.icon = existingData.icon || moduleJson.icon;
  console.log(
    "  ℹ  Existing module.json found — preserving color and icon, regenerating structure."
  );
}

// Write module.json
fs.writeFileSync(jsonPath, JSON.stringify(moduleJson, null, 2) + "\n");
console.log(`  ✓  module.json written`);

// Generate validator stubs
const validatorsDir = path.join(fullPath, "validators");
if (!fs.existsSync(validatorsDir)) {
  fs.mkdirSync(validatorsDir, { recursive: true });
}

// Write shared types file if it doesn't exist
const typesPath = path.join(validatorsDir, "types.ts");
if (!fs.existsSync(typesPath)) {
  fs.writeFileSync(typesPath, generateTypesFile());
  console.log(`  ✓  validators/types.ts written`);
}

let created = 0;
let skipped = 0;

for (const lesson of parsed.lessons) {
  for (const step of lesson.steps) {
    const validatorId = `validate-${moduleId}-${step.slug}`;
    const stubPath = path.join(validatorsDir, `${validatorId}.ts`);

    if (fs.existsSync(stubPath)) {
      skipped++;
      continue;
    }

    const stub = generateValidatorStub(validatorId, step, moduleId);
    fs.writeFileSync(stubPath, stub);
    created++;
  }
}

console.log(
  `  ✓  Validators: ${created} created, ${skipped} already existed`
);

// Count totals
const totalSteps = moduleJson.lessons.reduce(
  (sum, l) => sum + l.steps.length,
  0
);
const totalPoints = moduleJson.lessons.reduce(
  (sum, l) => sum + l.steps.reduce((s, st) => s + st.points, 0),
  0
);
const manualSteps = moduleJson.lessons.reduce(
  (sum, l) => sum + l.steps.filter((s) => s.manual).length,
  0
);

console.log(`
Summary:
  Module:     ${moduleJson.title} (${moduleId})
  Lessons:    ${moduleJson.lessons.length}
  Steps:      ${totalSteps} (${manualSteps} manual)
  Points:     ${totalPoints}
  Color:      ${moduleJson.color}
  Icon:       ${moduleJson.icon}
  Private:    ${moduleJson.private ? "yes" : "no"}

Next steps:
  1. Review module.json and tweak color/icon/descriptions if needed
  2. Edit the validator stubs in validators/ to add real logic
  3. Run 'npm test' to validate your module
  4. Run 'npm run preview ${moduleDir}' to preview in the browser
`);
