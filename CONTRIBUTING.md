# Contributing a Module to LiftOff

Thank you for building a learning module for the Postman community! This guide walks you through the submission process from start to finish.

## How it works

1. You create a module in this repo following the template structure
2. You open a pull request — CI validates your `module.json`, `content.md`, and validator stubs automatically
3. The LiftOff team reviews your content, works with you on any feedback, and merges
4. Once merged, the module is promoted into the main [LiftOff app](https://github.com/Postman-DevRel/liftoff) where the validators are wired up and the module goes live

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

### 3. Edit your module

Your module directory must contain:

```
modules/my-module-name/
├── module.json          # Module structure, lessons, and steps (required)
├── content.md           # Long-form overview content (required)
├── badge.png            # Badge image, 1024×1024 (recommended)
└── validators/          # One stub file per validatorId (required)
    ├── validate-my-module-name-step-one.ts
    └── validate-my-module-name-step-two.ts
```

#### module.json

This defines your module's structure — title, description, lessons, steps, and how each step is validated. See `module-template/module.json` for a complete example with comments.

Key rules:
- **`id`** must match your directory name exactly
- **`validatorId`** values must start with `validate-<your-module-id>-`
- Each `validatorId` must have a matching `.ts` stub file in `validators/`
- Step descriptions should be detailed — tell the learner exactly what to do

#### content.md

The narrative overview of your module — what learners will build, what they'll learn, and who it's for. This appears on the module's landing page.

#### Validator stubs

Each step in your module has a `validatorId` that maps to a validator function. In this repo, you provide **stubs** — skeleton implementations that show what the validator will check. The LiftOff team will wire up the full implementation when promoting your module.

See the examples in `module-template/validators/` for the three common patterns:
- **API-based validation** — uses the Postman API to check workspace/collection state
- **Manual validation** — learner self-reports (for steps that can't be auto-checked)
- **Input field validation** — uses a value the learner enters

### 4. Validate locally

```bash
npm test
```

This runs the same checks that CI will run on your PR.

### 5. Open a pull request

Push your branch and open a PR against `main`. CI will automatically:
- Validate your `module.json` against the schema
- Check that `content.md` exists and isn't empty
- Verify every `validatorId` has a matching stub file
- Check your module ID doesn't collide with existing modules in LiftOff

### 6. Review and promotion

The LiftOff team will review your PR for:
- Content quality and clarity
- Step-by-step accuracy (can a learner actually follow this?)
- Validator feasibility (can the steps be auto-validated via the Postman API?)
- Alignment with existing modules (no overlap, consistent tone)

Once merged, the team promotes your module into the main LiftOff app, wires up the validators, adds regression tests, and ships it.

## Guidelines

### Writing good steps

- **Be specific.** Don't say "create a collection" — say exactly where to click, what to name it, and what the expected outcome is.
- **One action per step.** Each step should validate one thing. Break complex tasks into multiple steps.
- **Include expected outcomes.** Tell learners what they should see after completing a step.
- **Use Markdown formatting.** Bold UI elements (`**Create Workspace**`), use numbered lists for sequential actions, and code blocks for commands.

### Choosing point values

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

## Questions?

Open an issue in this repo or reach out in the [Postman Community Discord](https://discord.gg/postman).
