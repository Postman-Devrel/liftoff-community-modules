# Module Authoring Guide

This guide covers everything you need to write a great LiftOff learning module. You author a single `content.md` file, run the generator, and preview your module in the browser — no code required.

## The Authoring Workflow

```
content.md  →  npm run generate  →  module.json + validator stubs
                                         ↓
                                  npm run preview  →  http://localhost:3333
                                         ↓
                                    npm test  →  open PR
```

1. **Write** your `content.md` using the structured format below
2. **Generate** `module.json` and validator stubs with `npm run generate modules/your-module`
3. **Preview** in the browser with `npm run preview modules/your-module`
4. **Validate** with `npm test`
5. **Submit** a pull request

## Content Format

Your `content.md` uses markdown headings to define the module structure:

```markdown
# Module Title

A 2–3 sentence description of what learners will build and learn.
Supports **Markdown** formatting.

## Part 1: Lesson Title

Optional lesson description — context for the group of steps below.

### Step 1: Step Title

A preamble explaining what this step accomplishes and why.

1. First instruction
2. Second instruction
3. Third instruction

**Validation:** What the validator should check.

### Step 2: Another Step

More instructions...

**Validation:** [MANUAL] Learner self-reports completion.

## Part 2: Next Lesson

### Step 3: Next Step

...
```

### How headings map to structure

| Markdown | Becomes | Notes |
|----------|---------|-------|
| `# Title` | Module title | Exactly one H1, must be the first heading |
| Paragraph after H1 | Module description | 2–3 sentences, supports Markdown |
| `## Part N: Title` | Lesson | Groups related steps together |
| Paragraph after H2 | Lesson description | Optional intro for the lesson |
| `### Step N: Title` | Step | An individually validated task |
| `**Validation:**` | Validator hint | Describes what the API should check |

### Special markers

| Marker | Where | Effect |
|--------|-------|--------|
| `**PRIVATE**` | First 5 lines of the file | Sets `"private": true` — module is hidden from listings, accessible only via direct URL |
| `[MANUAL]` | Inside a `**Validation:**` block | Step shows a "Done" button instead of "Validate" — for steps that can't be auto-checked |

## Writing Good Steps

### Every step needs a preamble

Never start a step cold with "1. Open..." — orient the learner first. Begin with 1–2 sentences explaining *what* this step accomplishes and *why* it matters.

**Bad:**
```markdown
### Step 3: Add a Test Script

1. Open the request.
2. Click the Scripts tab.
3. Add a test.
```

**Good:**
```markdown
### Step 3: Add a Test Script

Postman lets you write test scripts that run automatically after every
request. You'll add assertions to make sure the API returns the data
you expect — this is the foundation of API testing.

1. Open the **List All Coffees** request in the **Coffee Service** collection.
2. Click the **Scripts** tab, then select **Post-response**.
3. Add the following test script:

    ```javascript
    pm.test("Status code is 200", function () {
        pm.response.to.have.status(200);
    });
    ```

4. Click **Send** and check the **Test Results** tab — the test should
   pass with a green check.

**Validation:** The "List All Coffees" request has a post-response script
containing at least one `pm.test` call.
```

### Be specific and self-contained

Step descriptions are the ONLY thing the learner sees in the UI. They must be self-contained — the learner should never need to leave the page to figure out what to do.

| Element | When to include | Example |
|---------|----------------|---------|
| Preamble | Always | 1–2 sentences on what and why |
| Numbered instructions | Always | Exact sequence of actions |
| JSON payloads | Any step with a request body | Full JSON in a fenced code block |
| AI/Agent Mode prompts | Any step using Agent Mode | Exact prompt in a blockquote |
| Expected outcomes | Always | "Expect `201 Created`", "Dashboard appears" |
| Troubleshooting tips | When common errors exist | "If you get a 401, check your API key" |
| Reference tables | When choosing from allowed values | Table of valid categories, phases, etc. |
| Reference links | When external docs help | Link to Postman docs, API guides |
| Cautions/warnings | When gotchas exist | "Anomaly logs cannot be deleted" |

### One action per step

Each step should validate one thing. If a step requires the learner to do three separate things, break it into three steps.

### Use Markdown formatting

- **Bold** UI elements: `**Create Workspace**`, `**Send**`
- Numbered lists for sequential actions
- Fenced code blocks for JSON payloads, URLs, and scripts
- Tables for reference data
- Blockquotes for AI/Agent Mode prompts
- Links to external docs: `[Postman Docs](https://learning.postman.com/...)`

## Validation Types

Your `**Validation:**` block describes what the Postman API should check. The LiftOff team wires up the actual validator when promoting your module, but a clear description helps them (and helps CI catch structural issues).

Common patterns:

| Check Type | Description | Example validation block |
|-----------|-------------|------------------------|
| Workspace Exists | Check a workspace exists by name | `A workspace named "Coffee API - [name]" exists` |
| Collection Exists | Check a collection exists in a workspace | `Collection "Coffee Service" exists in the workspace` |
| Collection Requests | Verify specific requests exist by name | `Collection has "List Coffees" and "Get Coffee" requests` |
| Request URLs | Check requests use variables, not hardcoded URLs | `All requests use {{baseUrl}} in their URL` |
| Environment Exists | Check an environment exists | `Environment "dev" exists in the workspace` |
| Environment Values | Check specific variable values | `baseUrl = "https://example.com", apiKey is non-empty` |
| Test Scripts | Verify requests have test scripts | `Request has a post-response script with pm.test` |
| Collection Run | Check that a collection run passed | `All tests in the collection pass` |
| API Response | Call an API and check the response | `GET /health returns 200 OK` |
| User Input | Collect and validate learner-provided text | `Enter GitHub username, verified via GitHub API` |
| Manual | Step can't be auto-validated | `[MANUAL] Learner confirms MCP server is connected` |

### When to use [MANUAL]

Use `[MANUAL]` for steps that cannot be verified through the Postman API:
- Local CLI configuration (installing tools, setting env vars)
- MCP server setup
- IDE configuration
- UI-only actions that don't create API-visible state
- Steps that require the learner to observe something visually

## Point Values

The generator defaults all steps to **10 points**. After generating, edit `module.json` to adjust:

| Points | When to use | Examples |
|--------|------------|---------|
| 10 | Setup steps, simple actions | Create workspace, fork repo |
| 15–20 | Core learning steps | Build a collection, write a test |
| 25+ | Complex or capstone steps | Run a full test suite, chain multiple requests |

## Private Modules

Add `**PRIVATE**` on its own line in the first 5 lines of your `content.md`:

```markdown
**PRIVATE**
# My Secret Module

Description...
```

Or pass `--private` to the generator:

```bash
npm run generate modules/my-module -- --private
```

Private modules:
- Do **not** appear on the LiftOff home page
- Do **not** appear in learning paths
- **Are** accessible via their direct URL: `/modules/<module-id>`
- Useful for beta content, event-exclusive modules, or work-in-progress

Remove the `**PRIVATE**` marker and regenerate to make it public.

## Input Fields

Some steps need the learner to enter a value (a GitHub username, a URL, etc.) that gets passed to the validator. After generating `module.json`, you can add an `inputField` to any step:

```json
{
  "id": "step-3-enter-username",
  "stepNumber": 3,
  "title": "Enter Your GitHub Username",
  "description": "...",
  "points": 10,
  "validatorId": "validate-my-module-enter-username",
  "inputField": {
    "key": "githubUsername",
    "label": "GitHub Username",
    "placeholder": "e.g. octocat"
  }
}
```

The learner sees a text input above the Validate button. The entered value is available to the validator as `context.userInputs.githubUsername`.

## Getting Started Panel

If your module needs prerequisites (a Postman account, an API key, a specific tool installed), add a `gettingStarted` field to `module.json` after generating:

```json
{
  "id": "my-module",
  "title": "My Module",
  "description": "...",
  "gettingStarted": "Before you begin:\n\n1. **Postman account** — [sign up free](https://postman.com)\n2. **Postman API key** — [generate one here](https://go.postman.co/settings/me/api-keys)\n3. **Node.js 18+** installed locally",
  "gettingStartedTitle": "Before you start",
  ...
}
```

This renders as a panel above the first lesson.

## Badges

Each module can have a completion badge — a 1024×1024 PNG displayed when the learner finishes all steps. Place a `badge.png` in your module directory:

```
modules/my-module/
├── content.md
├── module.json
├── badge.png       ← 1024×1024 PNG
└── validators/
```

**Style guidelines:**
- Achievement emblem / shield / badge design
- Dark or vibrant gradient background (not white — must look good on a dark UI)
- Flat vector style, no photorealism
- No text in the image
- The module's accent color as the primary palette

If no badge is present, the module's emoji icon is used as a fallback.

## Full Example

Here's a complete `content.md` for a simple module:

```markdown
# Getting Started with Postman

Learn the basics of Postman by creating a workspace, building a collection,
and writing your first test — all using a free public API that returns
coffee data.

## Part 1: Set Up Your Workspace

Every project in Postman starts with a workspace. In this lesson you'll
create one to keep your work organized.

### Step 1: Create a Workspace

A workspace is your home base in Postman — collections, requests, and
variables all live here. You'll create a personal workspace to keep
this module's work separate from everything else.

1. Open Postman and click **Workspaces** in the top nav, then **Create Workspace**.
2. Choose **Blank workspace**.
3. Name it: **Coffee API - [your name]** (e.g. *Coffee API - Alex*).
4. Set visibility to **Personal** and click **Create**.

**Validation:** A workspace whose name starts with "Coffee API -" exists
and was created by the current user.

## Part 2: Build Your First Collection

Collections group related API requests together. You'll create one and
add a request that fetches coffee data from a public sample API.

### Step 2: Create a Collection

Collections are like folders for your API requests — they keep related
calls together and make it easy to run them as a group later.

1. Inside your **Coffee API** workspace, click **New** → **Collection**.
2. Name the collection: **Coffee Service**.
3. Optionally add a description like "Requests for the Sample APIs
   coffee endpoint."

**Validation:** A collection named "Coffee Service" exists inside the
Coffee API workspace.

### Step 3: Add a GET Request

A GET request asks an API for data. You'll add one that fetches a list
of hot coffee drinks from a public sample API.

1. Click **Add a request** inside the **Coffee Service** collection.
2. Name the request: **List All Coffees**.
3. Set the method to **GET** and enter the URL:

   ```
   https://api.sampleapis.com/coffee/hot
   ```

4. Click **Send** and verify you get a `200 OK` response containing
   an array of coffee objects.

Each object in the response has `title`, `description`, `ingredients`,
and `image` fields.

**Validation:** A GET request named "List All Coffees" exists in the
Coffee Service collection with the URL containing "sampleapis.com/coffee".

## Part 3: Write Your First Test

Postman lets you write test scripts that run automatically after every
request. You'll add assertions to verify the API returns the right data.

### Step 4: Add a Test Script

Test scripts catch problems before they reach production. You'll add
three assertions: status code, response shape, and data completeness.

1. Open the **List All Coffees** request.
2. Click the **Scripts** tab, then select **Post-response**.
3. Add the following test script:

   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });

   pm.test("Response is a non-empty array", function () {
       const json = pm.response.json();
       pm.expect(json).to.be.an("array").that.is.not.empty;
   });

   pm.test("Each coffee has a title", function () {
       const json = pm.response.json();
       json.forEach(function (coffee) {
           pm.expect(coffee).to.have.property("title");
       });
   });
   ```

4. Click **Send** and check the **Test Results** tab — all three tests
   should pass with a green check.

**Validation:** The "List All Coffees" request has a post-response script
containing at least one `pm.test` call, and sending the request returns
a 200 status.
```

## Regenerating After Edits

If you update `content.md` after generating, just run the generator again:

```bash
npm run generate modules/my-module
```

It preserves your existing color and icon from `module.json`, and only creates validator stubs for new steps — existing stubs are not overwritten.

## Troubleshooting

### "No lessons found"
Your `content.md` must have at least one `## Part N: Title` heading. Make sure the format is `## Part 1: Title` (with the number and colon).

### "missing validator stub"
Run `npm run generate` to create the missing stub files. The generator creates one `.ts` file per step in the `validators/` directory.

### "directory name does not match module id"
Your module directory name must be kebab-case and match the module ID in `module.json`. Both are derived from the directory name when you run the generator.

### Preview looks wrong
The preview reads `module.json` on each page load. Make sure you've run `npm run generate` after editing `content.md`, then reload the browser.
