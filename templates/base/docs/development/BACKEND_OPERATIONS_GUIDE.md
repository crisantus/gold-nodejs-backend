# Backend operations

Read SETUP.md for the selected providers and exact environment settings.

## Startup and health

`npm run dev` starts `src/server.ts`; production runs `dist/server.js`.
`src/app.ts` composes Express without listening. See PROJECT_STRUCTURE.md for
the startup and request flow. The server connects Prisma before accepting traffic.
/api/health is liveness; /api/ready queries the required database. Provider
credentials are validated only when their generated runtime capability is
enabled. Health is not proof of email/push delivery.

Set TRUST_PROXY_HOPS to the actual trusted proxy topology, explicit
CORS_ORIGINS for browser clients, independent production JWT/CSRF secrets,
and HTTPS at the deployment boundary. Use a database connection with verified
TLS where required by your hosting environment. Never expose production
credentials in logs, source, Postman exports, or screenshots.

## Database changes

Use db:migrate only against a development database and review/commit its SQL.
Deploy reviewed migrations separately with db:deploy. The MySQL development
preset includes a dedicated shadow database when Compose is selected.
A code rollback does not undo a migration. Back up important data, verify
restores in an isolated environment, and plan forward repairs before release.
Use a least-privilege application database account and separate migration
credentials where your deployment supports them.

## Authentication and state

Logout and password changes revoke server-side sessions. Access middleware
rechecks sessions, account status and roles. Keep consumed refresh-token hashes
until their session's absolute expiry so reuse remains detectable. Establish a
retention/cleanup job for expired sessions and one-time actions as the app grows;
this starter does not install a scheduler automatically.

If device push is selected, clients unregister their device token before logout;
logging out one session does not remove every device from the user's account.
Keep encryption keys stable until stored records have a tested re-encryption
plan. Monitor invalid device cleanup and provider acceptance/failure counts.

## Deployment and shutdown

SIGINT/SIGTERM stop traffic, close enabled socket connections, and disconnect
Prisma with a bounded shutdown deadline. Run the compiled app under a process
supervisor or the selected container deployment. The generated Docker image
runs as a non-root user; migration commands run in a separate deployment step.

Multiple instances require a shared rate-limit store and an appropriate
Socket.IO adapter/load-balancer setup if sockets are selected. The default
socket transport is single-instance and important missed state must be fetched
from persistent storage after reconnecting.

## Verification and troubleshooting

Run npm run verify before release. Database integration tests require the
explicit disposable loopback gold_test database guard described in SETUP.md.
Unit mocks establish behavior at boundaries, not real provider delivery.
Use request IDs and stable public error codes to investigate failures. Log
selected safe metadata; avoid request bodies, tokens and private provider data.
Retry only operations whose idempotency guarantees support it.
