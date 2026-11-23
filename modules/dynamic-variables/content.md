# Dynamic Variables: Generate and Reuse Test Data

Stop hardcoding `"email": "test@example.com"` and fighting `409 Conflict` errors. In this module you'll use Postman's built-in **dynamic variables** — like `{{$guid}}`, `{{$randomEmail}}`, and `{{$isoTimestamp}}` — to generate fresh, realistic test data on every request, then capture those values, reuse them across a **create → read → update** workflow, and trigger follow-up requests automatically with `pm.execution.runRequest()`.

### What you'll need

1. **A Postman account** — [sign up free](https://www.postman.com/postman-account/) if you don't have one.
2. **The Postman desktop app or web app** — either works for every step.
3. **A Postman API key** — LiftOff uses it to check your work. [Generate one here](https://go.postman.co/settings/me/api-keys).

Every request in this module targets [Postman Echo](https://postman-echo.com), a free service that sends back exactly what you send it. That makes it easy to *see* the values your dynamic variables generate. About **15–20 minutes**.

## Part 1: Meet Dynamic Variables

Set up a workspace and collection, then send your first request powered by dynamic variables.

### Step 1: Create a Workspace

A workspace keeps everything for this module — collections, requests, and variables — in one place, separate from your other work.

1. In Postman, click **Workspaces** in the top navigation, then **Create Workspace**.
2. Choose **Blank workspace** and click **Next**.
3. Name it **Dynamic Variables - [your name]** (for example, *Dynamic Variables - Alex*).
4. Set visibility to **Personal** and click **Create**.

**Validation:** A workspace whose name starts with "Dynamic Variables -" exists and was created by the current user.

### Step 2: Create a Collection

Collections group related requests so you can share variables between them and run them together — both of which you'll do later in this module.

1. Inside your **Dynamic Variables** workspace, click **New** → **Collection**.
2. Name the collection **User Lifecycle**.

You should see an empty **User Lifecycle** collection in the sidebar.

**Validation:** A collection named "User Lifecycle" exists in the "Dynamic Variables -" workspace.

### Step 3: Send Your First Dynamic Variable

Dynamic variables are built-in placeholders that start with `$`. Postman replaces each one with a freshly generated value **every time you send a request** — you don't define them anywhere. They're backed by the [Faker](https://github.com/faker-js/faker) library, so they produce realistic names, emails, UUIDs, dates, and more.

| Syntax | Who defines it | Value |
|--------|----------------|-------|
| `{{baseUrl}}` | You (collection, environment, or global variable) | Whatever you set — stays the same until you change it |
| `{{$guid}}` | Postman (built-in) | A brand new value on every send |

A few you'll use in this module:

| Variable | Example output |
|----------|----------------|
| `{{$guid}}` | `611c2e81-2ccb-42d8-9ddc-2d0bfa65c1b4` |
| `{{$timestamp}}` | `1732190400` (Unix seconds) |
| `{{$isoTimestamp}}` | `2026-11-21T10:15:30.000Z` |
| `{{$randomFullName}}` | `Melba Kshlerin` |
| `{{$randomEmail}}` | `Kaci.Jacobson@yahoo.com` |
| `{{$randomInt}}` | `742` (between 0 and 1000) |

Now try them in the URL and a header:

1. In the **User Lifecycle** collection, click **Add a request** and name it **Echo Dynamic Values**.
2. Set the method to **GET** and enter this URL:

   ```
   https://postman-echo.com/get?requestId={{$guid}}&sentAt={{$timestamp}}
   ```

3. Open the **Headers** tab and add a header with key `X-Trace-Id` and value `{{$randomUUID}}`.
4. Click **Send**. In the response, look at `args.requestId`, `args.sentAt`, and `headers.x-trace-id` — each holds a generated value.
5. Click **Send** again. Every value changes.
6. Click **Save**.

> **Tip:** Type `{{$` in the URL bar, a body, or a header to see autocomplete suggestions for every dynamic variable.

**Validation:** A GET request named "Echo Dynamic Values" exists in the "User Lifecycle" collection. Its URL contains `{{$guid}}` and it has a header whose value contains a `{{$...}}` dynamic variable.

## Part 2: Seed Realistic Request Payloads

Use dynamic variables inside a JSON body to create a unique user on every send.

### Step 4: Build a Create User Request

Hardcoded payloads break as soon as you send them twice — a real API would reject the duplicate email or ID. Dynamic variables make every request unique, so you can send it as often as you like.

1. In the **User Lifecycle** collection, add a new request named **Create User**.
2. Set the method to **POST** and the URL to:

   ```
   https://postman-echo.com/post
   ```

3. Open the **Body** tab, select **raw**, and choose **JSON** from the dropdown.
4. Paste this body:

   ```json
   {
     "id": "{{$guid}}",
     "name": "{{$randomFullName}}",
     "email": "{{$randomEmail}}",
     "age": {{$randomInt}},
     "createdAt": "{{$isoTimestamp}}"
   }
   ```

5. Click **Send**. Expect `200 OK`. The `json` field in the response shows the values Postman generated.
6. Send it a few more times and watch every field change. Then click **Save**.

> **Notice:** `age` is not wrapped in quotes because `{{$randomInt}}` produces a number. Postman may underline it as invalid JSON in the editor — that's fine; it's valid once the value is filled in.

**Validation:** A POST request named "Create User" exists in the "User Lifecycle" collection with a raw JSON body that uses at least four different `{{$...}}` dynamic variables, including `{{$guid}}`, `{{$randomEmail}}`, and `{{$isoTimestamp}}`.

## Part 3: Reuse Generated Values Across Requests

Dynamic variables generate a *new* value every time they appear — so `{{$guid}}` in one request will never match `{{$guid}}` in the next. To reuse a value, you generate it once, store it in a collection variable, and reference that variable everywhere else.

### Step 5: Generate Values Once With replaceIn()

A **pre-request script** runs before the request is sent. Inside a script, `pm.variables.replaceIn()` resolves a dynamic variable into a real value that you can store. You'll generate the user's ID, name, and email once and save them as collection variables.

1. Open the **Create User** request and click the **Scripts** tab, then select **Pre-request**.
2. Add this script:

   ```javascript
   // Generate each value once and store it for later requests
   pm.collectionVariables.set("userId", pm.variables.replaceIn("{{$guid}}"));
   pm.collectionVariables.set("userName", pm.variables.replaceIn("{{$randomFullName}}"));
   pm.collectionVariables.set("userEmail", pm.variables.replaceIn("{{$randomEmail}}"));
   ```

3. Open the **Body** tab and replace the body so it uses the stored values (no `$` — these are now your own variables):

   ```json
   {
     "id": "{{userId}}",
     "name": "{{userName}}",
     "email": "{{userEmail}}",
     "age": {{$randomInt}},
     "createdAt": "{{$isoTimestamp}}"
   }
   ```

4. Click **Send**, then click the **User Lifecycle** collection and open its **Variables** tab. You should see `userId`, `userName`, and `userEmail` with the same values that appear in the response.
5. Click **Save** on the request.

**Validation:** The "Create User" request has a pre-request script that calls `pm.variables.replaceIn` and `pm.collectionVariables.set` for `userId`, and its body references `{{userId}}`.

### Step 6: Capture a Value From the Response

Real APIs usually assign IDs on the server, so you capture them from the response instead. A **post-response script** runs after the response arrives — you'll read the ID from the response, store it, and add tests that prove the round trip worked.

1. In the **Create User** request, open **Scripts** → **Post-response**.
2. Add this script:

   ```javascript
   const body = pm.response.json().json;

   pm.test("User was created", function () {
       pm.response.to.have.status(200);
   });

   pm.test("Response email matches the generated email", function () {
       pm.expect(body.email).to.eql(pm.collectionVariables.get("userEmail"));
   });

   // Save the ID returned by the API for the next requests
   pm.collectionVariables.set("createdUserId", body.id);
   ```

3. Click **Send**. Open the **Test Results** tab — both tests should pass.
4. Check the collection's **Variables** tab: `createdUserId` now holds the ID from the response. Click **Save**.

**Validation:** The "Create User" request has a post-response script that contains at least one `pm.test` call and calls `pm.collectionVariables.set` with `createdUserId`.

### Step 7: Read the User Back

Now the value generated in **Create User** flows into a different request. This is how you chain requests in a workflow without copying and pasting IDs.

1. Add a new request to **User Lifecycle** named **Get User**.
2. Set the method to **GET** and the URL to:

   ```
   https://postman-echo.com/get?userId={{createdUserId}}&email={{userEmail}}
   ```

3. Open **Scripts** → **Post-response** and add:

   ```javascript
   const args = pm.response.json().args;

   pm.test("Fetched the user created earlier", function () {
       pm.expect(args.userId).to.eql(pm.collectionVariables.get("createdUserId"));
       pm.expect(args.email).to.eql(pm.collectionVariables.get("userEmail"));
   });
   ```

4. Click **Send**. The test should pass, showing the same ID and email that **Create User** generated. Click **Save**.

> **Troubleshooting:** If the test fails with `expected undefined`, send **Create User** first — `createdUserId` is only set after it runs.

**Validation:** A GET request named "Get User" exists in the "User Lifecycle" collection. Its URL contains `{{createdUserId}}` and it has a post-response script with at least one `pm.test` call.

### Step 8: Update the User With Fresh Data

Reused and dynamic values work well together: keep the stable ID, and generate a fresh value for the field you're changing.

1. Add a new request named **Update User**.
2. Set the method to **PATCH** and the URL to:

   ```
   https://postman-echo.com/patch
   ```

3. In **Body** → **raw** → **JSON**, paste:

   ```json
   {
     "id": "{{createdUserId}}",
     "name": "{{$randomFullName}}",
     "updatedAt": "{{$isoTimestamp}}"
   }
   ```

4. Open **Scripts** → **Post-response** and add:

   ```javascript
   const body = pm.response.json().json;

   pm.test("Updated the same user", function () {
       pm.expect(body.id).to.eql(pm.collectionVariables.get("createdUserId"));
   });

   pm.test("Name changed", function () {
       pm.expect(body.name).to.not.eql(pm.collectionVariables.get("userName"));
   });
   ```

5. Click **Send** — both tests should pass. Click **Save**.

**Validation:** A PATCH request named "Update User" exists in the "User Lifecycle" collection. Its body references both `{{createdUserId}}` and at least one `{{$...}}` dynamic variable, and it has a post-response script with at least one `pm.test` call.

## Part 4: Trigger Requests Automatically

Your workflow still needs you to click **Send** on each request in turn. With `pm.execution.runRequest()`, one request's script can run another saved request in your collection. Here, a new user automatically gets a welcome email the moment **Create User** finishes.

### Step 9: Build a Send Welcome Email Request

In a real app, creating a user often kicks off follow-up work, like a welcome email or a webhook. First you'll build that follow-up as a normal saved request. It reuses the stored user values and generates its own message ID and timestamp.

1. Add a new request to **User Lifecycle** named **Send Welcome Email**.
2. Set the method to **POST** and the URL to:

   ```
   https://postman-echo.com/post
   ```

3. In **Body** → **raw** → **JSON**, paste:

   ```json
   {
     "messageId": "{{$guid}}",
     "to": "{{userEmail}}",
     "userId": "{{createdUserId}}",
     "subject": "Welcome, {{userName}}!",
     "sentAt": "{{$isoTimestamp}}"
   }
   ```

4. Click **Send** to check it works. Expect `200 OK`, with the email and ID from your last **Create User** run in the `json` field.
5. Click **Save**.

**Validation:** A POST request named "Send Welcome Email" exists in the "User Lifecycle" collection. Its body references `{{userEmail}}` and `{{createdUserId}}` and uses at least one `{{$...}}` dynamic variable.

### Step 10: Trigger It From Create User

Now you'll make **Create User** run **Send Welcome Email** on its own. `pm.execution.runRequest()` takes the **request ID** of a saved request, sends it, and returns a Promise. Add `await` to get the response. The triggered request resolves `{{userEmail}}` and `{{createdUserId}}` from the collection variables you just set, so the email always goes to the user you just created.

1. Open **Send Welcome Email**, click the **Info** icon in the right sidebar, and click **Copy request ID**.
2. Open **Create User** → **Scripts** → **Post-response**, and add this at the **end** of the existing script. Replace `<send-welcome-email-request-id>` with the ID you copied:

   ```javascript
   // Automatically send the welcome email for the user just created
   const emailResponse = await pm.execution.runRequest("<send-welcome-email-request-id>");

   pm.test("Welcome email was sent to the new user", function () {
       pm.expect(emailResponse.code).to.eql(200);
       const email = emailResponse.json().json;
       pm.expect(email.to).to.eql(pm.collectionVariables.get("userEmail"));
       pm.expect(email.userId).to.eql(pm.collectionVariables.get("createdUserId"));
   });
   ```

3. Click **Send** on **Create User** once. Open **Test Results**. All three tests should pass, including **Welcome email was sent to the new user**.
4. Open the **Console** (bottom left) to see both requests: the `POST` to `/post` for **Create User**, followed by the triggered **Send Welcome Email**. Click **Save**.

> **Tip:** Instead of pasting the ID, you can type the request name inside the quotes and pick it from the autocomplete dropdown. To override variables for just that run, pass a second argument: `pm.execution.runRequest(id, { variables: { userEmail: "someone@example.com" } })`.

> **Good to know:** `pm.execution.runRequest()` works in the Postman app and Collection Runner, but not in Newman or the Postman VS Code extension. Each script can call it up to 10 times. Request IDs change when you export and re-import a collection, so update them afterwards.

**Validation:** The "Create User" request has a post-response script that calls `pm.execution.runRequest` and contains a `pm.test` that checks the triggered request's response.

### Step 11: Run the Whole Workflow

Now it all comes together. Because every run generates new data, you can repeat the whole workflow as often as you like with no collisions. The **Collection Runner** sends your requests in order, and **Create User** still triggers the welcome email on its own.

1. In the sidebar, drag the requests into this order: **Echo Dynamic Values**, **Create User**, **Get User**, **Update User**, **Send Welcome Email**.
2. Hover over the **User Lifecycle** collection, click **⋯** → **Run collection**.
3. In the request list, **uncheck Send Welcome Email**. **Create User** already triggers it, so leaving it checked would send a second, duplicate email.
4. Set **Iterations** to **3** and click **Run User Lifecycle**.
5. Confirm every test passes in all three iterations, including **Welcome email was sent to the new user**.
6. Expand **Create User** in two different iterations and compare the request bodies. Each iteration used a different ID, name, and email, and each welcome email went to that iteration's user.

> **Troubleshooting:** If **Get User** or **Update User** fails in the first iteration, check that **Create User** comes before them in the run order. They depend on the variables it sets.

**Validation:** [MANUAL] Learner confirms the collection ran for 3 iterations with all tests passing, including the triggered welcome email test, and different generated data in each iteration.

## Part 5: Where to Go Next

Dynamic variables are useful well beyond CRUD demos. Here are some ways to use them in your own projects.

### Step 12: Explore More Uses of Dynamic Variables

Take a few minutes to see where dynamic variables fit in real-world API work.

| Use case | How dynamic variables help |
|----------|----------------------------|
| **Load and performance testing** | Every virtual user sends unique data, so you don't just test cache hits. See [Performance testing](https://learning.postman.com/docs/collections/performance-testing/testing-api-performance/). |
| **Randomized test seeding** | Fill a dev or staging database with realistic users, orders, or products by running a collection with many iterations. See [Collection runs](https://learning.postman.com/docs/collections/running-collections/intro-to-collection-runs/). |
| **Mixing with data files** | Use a CSV or JSON file for the fields that must be specific, and dynamic variables for everything else. See [Data files](https://learning.postman.com/docs/collections/running-collections/working-with-data-files/). |
| **Webhook simulation** | Send realistic event payloads with unique event IDs and timestamps to your webhook receiver. |
| **Mock servers** | Return varied, realistic responses from a mock. See [Mock servers](https://learning.postman.com/docs/designing-and-developing-your-api/mocking-data/setting-up-mock/). |

Reference docs:

- [Dynamic variables list](https://learning.postman.com/docs/tests-and-scripts/write-scripts/variables-list/) — every `{{$...}}` variable Postman supports
- [Variables in Postman](https://learning.postman.com/docs/sending-requests/variables/variables/) — scopes and precedence
- [`pm.variables` reference](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-variables/) — including `replaceIn()`

Open the dynamic variables list and pick one variable you haven't used yet, then click **Done**.

**Validation:** [MANUAL] Learner confirms they reviewed the additional resources.
