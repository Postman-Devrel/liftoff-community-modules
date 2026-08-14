# LiftOff Community Modules

Build a learning module for [LiftOff](https://github.com/Postman-DevRel/liftoff) — Postman's hands-on learning platform. You write a single markdown file, the tooling generates everything else, and you preview it in the browser before submitting.

## How it works

1. You write a `content.md` in a structured format — the generator turns it into `module.json` and validator stubs
2. You preview your module in the browser to make sure it looks right
3. You open a pull request — CI validates everything automatically
4. The LiftOff team reviews your content, works with you on any feedback, and merges
5. Once merged, the module is promoted into the main [LiftOff app](https://github.com/Postman-DevRel/liftoff) where the validators are wired up and the module goes live

## Quick start

### 1. Fork and clone this repo

```bash
git clone https://github.com/<your-username>/liftoff-community-modules.git
cd liftoff-community-modules
npm install
```

### 2. Copy the template

```bash
cp -r module-template modules/my-module-name
```

Replace `my-module-name` with a unique kebab-case ID for your module (e.g. `graphql-basics`, `api-security-101`).

### 3. Write your content.md

This is the **only file you need to author**. The structured format uses markdown headings to define lessons and steps:

```markdown
# My Module Title

Description of what learners will build and learn.

## Part 1: Get Set Up

Optional lesson description.

### Step 1: Create a Workspace

Step instructions with full markdown — numbered lists,
code blocks, tables, links, etc.

**Validation:** What the validator should check.

### Step 2: Manual Step

Instructions for a step that can't be auto-validated.

**Validation:** [MANUAL] Learner self-reports completion.

## Part 2: Build Something

### Step 3: Build the Thing

More instructions...

**Validation:** What to check.
```

Key rules:
- **`# Title`** — H1 becomes the module title
- **First paragraph** after H1 becomes the description
- **`## Part N: Title`** — H2 becomes a lesson
- **`### Step N: Title`** — H3 becomes a step
- **`**Validation:**`** — describes what the validator checks
- **`[MANUAL]`** in a validation block marks the step as self-reported
- **`**PRIVATE**`** in the first 5 lines makes the module private

### 4. Generate module.json

```bash
npm run generate modules/my-module-name
```

This parses your `content.md` and generates:
- `module.json` — the structured module definition
- `validators/` — stub files for each step's validator

### 5. Preview in the browser

```bash
npm run preview modules/my-module-name
```

Open `http://localhost:3333` to see your module rendered like it will appear in LiftOff. Edit your files and reload the browser to see changes.

### 6. Validate and submit

```bash
npm test
```

This runs the same checks that CI will run on your PR. Once it passes, push your branch and open a pull request against `main`.

## What happens after you submit

CI automatically validates your `module.json` against the schema, checks that `content.md` exists, verifies every validator has a matching stub file, and checks for ID collisions with existing LiftOff modules.

The LiftOff team reviews your PR for content quality, step-by-step accuracy, validator feasibility, and alignment with existing modules. Once merged, the team promotes your module into the main LiftOff app, wires up the validators, adds regression tests, and ships it.

## Writing good steps

- **Start with context.** Every step should begin with 1–2 sentences explaining *what* this step accomplishes and *why* — don't jump straight into "1. Click..."
- **Be specific.** Don't say "create a collection" — say exactly where to click, what to name it, and what the expected outcome is.
- **One action per step.** Each step should validate one thing. Break complex tasks into multiple steps.
- **Include expected outcomes.** Tell learners what they should see after completing a step.
- **Use Markdown formatting.** Bold UI elements (`**Create Workspace**`), use numbered lists for sequential actions, and code blocks for commands.

See the [Authoring Guide](docs/authoring-guide.md) for validation types, point values, input fields, badges, a full worked example, and more.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run generate modules/<name>` | Generate `module.json` and validator stubs from `content.md` |
| `npm run preview modules/<name>` | Preview module at http://localhost:3333 |
| `npm test` | Validate all modules (same checks as CI) |

## Repo structure

```
├── modules/                  # Community module submissions (one dir per module)
│   └── your-module-name/
│       ├── content.md        # Authored content (source of truth)
│       ├── module.json       # Generated module definition
│       ├── badge.png         # Badge image (optional)
│       └── validators/       # Generated validator stubs
├── module-template/          # Starter template — copy this
├── docs/                     # Authoring guide and references
├── schema/                   # JSON Schema for module.json
├── scripts/                  # Generator, preview server, and CI validation
└── .github/workflows/        # GitHub Actions CI
```

## Questions?

Open an issue in this repo or reach out in the [Postman Community Discord](https://discord.gg/postman).

## License

MIT
