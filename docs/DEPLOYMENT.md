# Around the A — Deployment

## Platform decision

Around the A deploys to Cloudflare Workers. The repository already builds a Cloudflare Worker through Vinext, Vite's Cloudflare plugin, `worker/index.ts`, and Wrangler. Keeping that target avoids a framework migration and preserves the runtime used by the production build.

The browser remains the persistence boundary. The current application requires no application environment variables, database, or server-side player data.

## Local development

Requirements:

- Node.js 22.13.0 or newer
- npm

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The default local command uses Vinext's Node development runtime. This avoids starting Cloudflare's local `workerd` emulator, which requires macOS 13.5 or newer. On a supported operating system, Cloudflare-specific local behavior can be tested with:

```bash
npm run dev:cloudflare
```

## Local production build

```bash
npm run build
npm run start
```

The production server prints its local URL. `npm run build` still produces the Cloudflare Worker artifact and generated deployment configuration at `dist/server/wrangler.json`; `npm run start` serves that compiled output without Miniflare.

## Pull-request validation

Every pull request to `main` runs `.github/workflows/pull-request.yml`:

1. `npm ci`
2. TypeScript
3. ESLint
4. Prettier check
5. Production build
6. Unit and integration tests (including rendered production output)

The preview job then uploads the same generated Worker artifact with `wrangler versions upload`. It uses the alias `pr-<pull-request-number>`, producing a stable Cloudflare Preview URL for that pull request without promoting the version to production.

Fork pull requests do not receive deployment credentials and therefore run validation only.

## Required accounts and repository secrets

Create or select a Cloudflare Workers account and add these GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Create the API token from Cloudflare's **Edit Cloudflare Workers** template and restrict it to the account used by Around the A. Never commit the token or place it in a public workflow variable.

The first authenticated upload creates or updates the `around-the-a` Worker and establishes its `workers.dev` subdomain. Preview URLs must remain enabled for that Worker.

## Manual preview

Authenticate locally with `npx wrangler login`, then run:

```bash
npm run build
npx wrangler versions upload \
  --config dist/server/wrangler.json \
  --preview-alias milestone-preview-deployment
```

This uploads a previewable Worker version without changing production traffic.

## Branch and release policy

### Feature branches

- Open a pull request to `main`.
- Validation must pass.
- A versioned Cloudflare Preview URL is created when credentials are configured.
- Use the preview for desktop, mobile, gameplay, and stakeholder QA.
- Do not promote feature-branch versions to production.

### Main

- Changes reach `main` only through an approved pull request.
- `main` represents the current stable demo.
- Merging does not automatically publish an experiment as a production release.

### Production releases

- Run the **Production Release** GitHub workflow from `main`.
- Enter `DEPLOY` in the workflow confirmation input.
- Configure required reviewers on the GitHub `production` environment for an additional approval gate.
- The workflow validates the selected `main` commit before running `wrangler deploy`.

## Rollback

Cloudflare stores Worker versions separately from active deployments. To roll back:

1. Open the Worker in Cloudflare Dashboard.
2. Open **Deployments**.
3. Select the last verified version.
4. Promote that version to 100% of production traffic.
5. Record the rollback and open a corrective pull request.

Do not rebuild an old Git revision merely to roll back; promote the already verified Cloudflare version when possible.

## Debugging failed deployments

- Confirm the GitHub Actions validation job passed before reviewing deployment output.
- Confirm both Cloudflare secrets exist and are scoped to the same account.
- Confirm the Cloudflare Worker is named `around-the-a`.
- Confirm Preview URLs are enabled under the Worker's domain settings.
- Inspect the generated `dist/server/wrangler.json` after `npm run build`.
- Run `npx wrangler whoami` locally to confirm authentication.
- Use `npx wrangler versions list --config dist/server/wrangler.json` to confirm an uploaded version exists.
- If the application HTML loads but remains at `BOOTING`, verify that `/assets/*` requests return JavaScript with HTTP 200 and inspect the browser console for hydration errors.

Cloudflare preview URLs do not currently provide Worker logs. Reproduce runtime failures locally or upload a corrected version after validation.
