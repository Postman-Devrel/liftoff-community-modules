# My Module Title

A clear description of what learners will build and learn in this module.
Aim for 2–3 sentences that explain the hands-on outcome. Supports **Markdown**.

## Part 1: Get Set Up

Set up the workspace and tools you'll need for the rest of this module.

### Step 1: Create a Workspace

A **workspace** is your home base in Postman — collections, requests, and variables all belong to one.

1. Open the **Postman desktop app**.
2. Click **Workspaces** in the top navigation → **Create Workspace**.
3. Name it **My Module Name** and set visibility to **Personal**.
4. Click **Create Workspace**.

Paste the workspace URL or ID below to verify.

**Validation:** An internal workspace named "My Module Name" exists and was created by the current user.

### Step 2: Do Something Manually

This step demonstrates a manual validation — the learner self-reports completion because it can't be auto-checked via the API.

1. Open the workspace you just created.
2. Explore the sidebar and familiarize yourself with the layout.
3. Click **Done** when you're ready to move on.

**Validation:** [MANUAL] Learner confirms they explored the workspace UI.

## Part 2: Build Something

The core hands-on lesson where learners build the main artifact.

### Step 3: Build the Thing

Now you'll create the core artifact for this module. This step uses an **input field** — you'll enter a value that gets passed to the validator.

1. In the left sidebar, click **Collections** → **+**.
2. Name the collection **My First Collection**.
3. Add a **GET** request with this URL:

```
https://postman-echo.com/get
```

4. Click **Send** and confirm you see a **200 OK** response.

**Validation:** Collection "My First Collection" exists in the workspace with a GET request to postman-echo.com.

### Step 4: Verify Your Work

Review everything you've built and confirm it's working end to end.

1. Open your collection and verify all requests are saved.
2. Run the collection using the **Collection Runner**.
3. Confirm all requests pass with **200 OK**.

**Validation:** All requests in the collection return successful responses.
