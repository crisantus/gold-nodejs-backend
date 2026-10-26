# Gold Backend

Create a clean Express, TypeScript and Prisma backend by answering a few
questions in your terminal.

## 1. Install once

Install Node.js 24 LTS and Git, then run this from any folder:

```bash
npm install -g --install-links github:crisantus/gold-nodejs-backend
```

Install directly from the public GitHub repository. No npm publication is required.

The installation downloads Gold Backend from GitHub, builds it automatically,
and makes the `gold-backend` command available. You do not need to clone the
repository or run build/link commands yourself. The existing `gold_backend` command
remains available as an alias.

## 2. Create a backend

Open a terminal in the parent folder where you want your new project, then run:

```bash
gold-backend create
```

The wizard asks for the project name, database, roles, and features. Use the
arrow keys to navigate, **Space** to select features, and **Enter** to continue.

Choose whether you need:

- MySQL or PostgreSQL with Prisma.
- Users only, or users and administrators.
- Email, Firebase push notifications, or an in-app notification inbox.
- Socket.IO live updates or private Cloudinary uploads.
- Swagger, Postman exports, or Docker files.

Leave **Install dependencies and verify the project** set to Yes. Gold creates
the project folder, installs dependencies, generates the Prisma client and
selected API exports, and checks the code. Internet access is needed.

## 3. Configure and run your backend

Enter the folder named in the wizard. For example:

```bash
cd my-api
```

Edit its existing `.env` to connect your database and selected providers.
Keep the random local secrets Gold generated. If you selected the local
Docker Compose database, run `docker compose up -d` and wait for it to be healthy.
Docker is required only for that option.

Then run:

```bash
npm run db:migrate -- --name init
npm run dev
```

The default API address is `http://localhost:5000`. Swagger is at
`http://localhost:5000/docs` if selected. For Postman, import the generated
collection and environment from `docs/api/`.

Your generated `SETUP.md` explains the remaining steps for exactly the features
you selected. Gold prepares the integrations; provider credentials and any
required client setup are still needed.

For email, Firebase, authentication, admin accounts, folder structure, and
troubleshooting, see the [detailed usage guide](docs/USAGE.md).

## Update Gold Backend

Before `gold-backend create` starts, Gold checks GitHub for an update. When one
is available, it shows the update command. You can ignore the notice and continue.
Updates are optional; offline access or a failed check does not prevent creation.

Check or update manually:

```bash
gold-backend check-update
gold-backend update
```

If an older installation does not have these commands yet, update with npm:

```bash
npm install -g --install-links github:crisantus/gold-nodejs-backend
```

Gold compares Git commits, so updates can be detected even when the package
version stays the same. Updating the generator affects future projects; existing
generated backends keep their code. Use `--no-update-check` to skip a check.

## Uninstall Gold Backend

To remove the Gold command from your computer:

```bash
gold-backend uninstall
```

The equivalent npm command also works with older installations:

```bash
npm uninstall -g gold-backend
```

Your generated backend projects, their dependencies, and databases are retained.
They run independently of the Gold CLI.

<details>
<summary>Developing the generator itself</summary>

These commands are for working on this repository. Users install from GitHub
using the command above.

```bash
npm ci
npm run dev -- create
npm run verify
npm run test:generated
npm pack --dry-run
```

`npm ci` automatically builds the generator through its `prepare` script.
`test:generated` creates temporary apps and installs/verifies them; it needs
network access and does not send email or push messages.

Read `AGENTS.md`, `.agents/skills/gold-backend-generator/SKILL.md`, and
`docs/development/BACKEND_STYLE_GUIDE.md` before changing the generator.

</details>
