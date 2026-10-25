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
and makes the `gold_backend` command available. You do not need to clone the
repository or run build/link commands yourself.

## 2. Create a backend

Open a terminal in the parent folder where you want your new project, then run:

```bash
gold_backend create
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

After new changes are available on GitHub, rerun the installation command:

```bash
npm install -g --install-links github:crisantus/gold-nodejs-backend
```

This updates the generator for future projects. Existing generated backends
remain independent.

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
