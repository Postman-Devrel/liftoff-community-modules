# Contributing a Module to LiftOff

Thank you for building a learning module for the Postman community! This guide walks you through the submission process from start to finish.

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

See `module-template/content.md` for a starter template and the [Authoring Guide](docs/authoring-guide.md) for detailed writing guidance, validation types, and a full example.

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

### 6. Validate locally

```bash
npm test
```

This runs the same checks that CI will run on your PR.

### 7. Open a pull request

Push your branch and open a PR against `main`. CI will automatically:
- Validate your `module.json` against the schema
- Check that `content.md` exists and isn't empty
- Verify every `validatorId` has a matching stub file
- Check your module ID doesn't collide with existing modules in LiftOff

### 8. Review and promotion

The LiftOff team will review your PR for:
- Content quality and clarity
- Step-by-step accuracy (can a learner actually follow this?)
- Validator feasibility (can the steps be auto-validated via the Postman API?)
- Alignment with existing modules (no overlap, consistent tone)

Once merged, the team promotes your module into the main LiftOff app, wires up the validators, adds regression tests, and ships it.

## Module directory structure

After running the generator, your module directory will contain:

```
modules/my-module-name/
├── content.md           # Your authored content (source of truth)
├── module.json          # Generated module definition
├── badge.png            # Badge image, 1024×1024 (optional)
└── validators/          # Generated validator stubs
    ├── types.ts
    ├── validate-my-module-name-create-a-workspace.ts
    └── validate-my-module-name-build-the-thing.ts
```

## Guidelines

### Writing good steps

- **Be specific.** Don't say "create a collection" — say exactly where to click, what to name it, and what the expected outcome is.
- **One action per step.** Each step should validate one thing. Break complex tasks into multiple steps.
- **Include expected outcomes.** Tell learners what they should see after completing a step.
- **Use Markdown formatting.** Bold UI elements (`**Create Workspace**`), use numbered lists for sequential actions, and code blocks for commands.
- **Start with context.** Every step should begin with 1–2 sentences explaining *what* this step accomplishes and *why* — don't jump straight into "1. Click..."

### Choosing point values

The generator defaults all steps to 10 points. After generating, you can edit `module.json` to adjust:

- **10 points** — Setup steps, simple actions (create workspace, fork repo)
- **15–20 points** — Core learning steps (build a collection, write a test)
- **25+ points** — Complex or capstone steps (run a full test suite, chain multiple requests)

### Validator patterns

Most validators follow one of these patterns:

| Pattern | When to use | Example |
|---------|-------------|---------|
| **Workspace check** | Verify a workspace exists by name | `GET /workspaces` → find by name |
| **Collection check** | Verify a collection exists with expected requests | `GET /collections/{uid}` → check items |
| **Test script check** | Verify a request has specific test assertions | Parse `event[].script.exec` |
| **Manual** | Step can't be auto-validated (UI-only action) | Return success immediately |
| **Input field** | Validate using a value the learner provides | Check `context.userInputs[key]` |

### Regenerating after edits

If you update your `content.md` after generating, just run the generator again:

```bash
npm run generate modules/my-module-name
```

It preserves your existing color and icon, and only creates validator stubs for new steps (existing stubs are not overwritten).

## Questions?

Open an issue in this repo or reach out in the [Postman Community Discord](https://discord.gg/postman).
