# Chat and invitation updates

Deploy backend and frontend together (backend first). There is no schema change and no destructive data migration in this release.

## Legacy chats
The existing `chat_message_model.id` defines persisted message order. Both the project relationship and chat endpoint now return ID ascending. The frontend uses the same order and deduplicates by ID. This stabilizes existing rows without rewriting their timestamps, authors or content. Missing legacy dates remain unknown, rather than changing to "now" on reload. Hibernate's normal schema update is sufficient; do not clear or recreate chat tables.

Existing migrations in DatabaseMigrationService concern song-list relationships, not chats. No new startup migration is needed for this fix.

## Live delivery
Authenticated GET /api/live/events sends per-user SSE invalidations after the transaction commits. No JWT is put in a query string. The frontend fetches history/invitations from authorized endpoints and reconnects automatically. It also recovers missed chat/invitation updates every 10 seconds while visible and on focus/online.

Proxy requirements: preserve text/event-stream, disable response buffering for /api/live/events, allow Authorization/CORS, and allow streams longer than 60 seconds. X-Accel-Buffering: no is sent. A connection renews after 60 seconds so authentication is rechecked. Do not cache API responses.

Push subscribers are in memory on each backend instance. With multiple replicas, updates sent through another replica recover via background refresh (up to 10 seconds for chat/invitations; project membership on reconnect). For immediate cross-replica push, use one instance or add a shared event broker. This implementation does not claim distributed push.

## Verify after deployment
Open separate browser profiles for two verified accounts, invite one to a disposable project, accept, and exchange messages in both directions without reload. Test network loss/reconnect, rejected invitations, same-date legacy messages, and repeat acceptance. Do not test with real messages in someone else's project.

## Test account
The requested test account was created through production registration and requires activation. No credentials are committed here. Account-specific activation, if authorized by the operator instead of email verification, can be performed in the database; it must not disable verification globally.
