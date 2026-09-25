# Collaboration release audit — PR #193

Branch: `fix/collaboration-release-audit`. Continue through GitHub MCP.
No local application/test execution. No merge, backend deployment or migration is authorized.
Never use `test@bandanize.com`. Do not message another real user as a test.

## Implemented protection

- Tablature editing uses a database row lock and a 90-second renewable lease. Identity is bound to both the authenticated user and a random editing token; tokens are excluded from normal models and status responses. The original content must match on acquisition. Old clients without a lease cannot save content.
- The editor shows the active owner, renews every 10 seconds, pauses writes on renewal/network failure and supports explicit resume. Separate effect lifetimes prevent late acquisition/renewal responses from affecting a replacement editor. A late successful acquisition after unmount is released.
- Unsaved text and its original base are preserved in user/tab-scoped session storage. Reload restores the draft; stale bases cannot overwrite another user's text. Storage failures are visible, and copy/export remain available. Session storage does not survive closing the browser tab and is not a cloud backup.
- Authentication verification no longer clears a session on a network/5xx failure. A 401 for an obsolete authentication token cannot clear a newer session.
- Deleting a tablature, its orphaned song/list, or its project checks active leases within the transaction. Whole-project deletion checks orphan songs as well.
- Attachment mutations lock and refresh their parent database row, preserving concurrent uploads/deletions. Repeating association of the same uploaded URL does not duplicate the item. Frontend file updates apply the particular add/delete instead of replacing the entire file list with a potentially stale response.
- Comments poll independently every five seconds, reject history responses spanning a local mutation, preserve failed-send drafts and report failures. Selected anchors are checked against a locked current tablature. Song activity updates use dynamic SQL updates so comments/files cannot rewrite unrelated song metadata.
- Project snapshots are invalidated by acknowledged mutations and recovered periodically (15 seconds), on focus and reconnect. Chat recovery remains independent (three seconds); invitations use their own refresh (10 seconds). A slow catalogue/invitation request does not block chat.
- Calendar requests reject obsolete responses, reset when changing project and recover on focus/reconnect/every ten seconds. Save/delete share an immediate operation guard. A late pre-delete response cannot resurrect an event; failed reads and writes remain visible.
- Notifications refresh independently, protect read acknowledgements against stale reads and show distinct refresh/read errors.
- Chunk completion is stable across retry/restart, validates session identity and assembles atomically. The final filename cannot be the incomplete-upload sentinel.

## Validation and evidence

All execution is on GitHub Actions. No local tests were run.
The database workflow runs `DatabaseLifecycleTest` and `TabCommentHttpTest` against PostgreSQL 16 and real HTTP endpoints. Only email delivery/storage boundaries in lifecycle tests are mocked.
The normal CI runs the full backend suite plus frontend lint/build.
Browser checks run Chromium/WebKit on a GitHub runner with explicitly intercepted API fixtures. These demonstrate UI behaviour, not production integration.

Regression coverage added during this continuation:
- simultaneous lease acquisition: exactly one winner;
- wrong-user token, expired token, stale base, old release and forbidden access;
- song/list/project delete rollback during an active lease;
- two concurrent attachments plus content save, retry association, delete and retained lease;
- browser ownership, failed save/renewal, paused edits, reload draft, expired-base conflict and late acquisition cleanup;
- delayed comments history across a send and failed-send draft retention;
- delayed calendar history across deletion, remote event refresh and outage recovery;
- notification fetch/read failure and retained unread state;
- failed file deletion and late catalogue response after deletion.

Check the latest Actions run for the final commit before considering review complete. Earlier green runs must not be substituted for a newer failing revision.

## Required coordinated backend/frontend release

**Backend deployment and an additive PostgreSQL migration are required. They have NOT been performed.**
Apply `docs/migrations/2026-09-25-tab-edit-leases.sql` before the matching backend/frontend rollout:
`tablature_model.edit_owner_id BIGINT`, `edit_owner_name VARCHAR(255)`,
`edit_token VARCHAR(255)`, `edit_expires_at TIMESTAMP WITH TIME ZONE`.
Hibernate update may already create them; verify the schema instead of assuming. No data rewrite is needed.
Backend and frontend must be rolled out together: new frontend against old backend cannot acquire a lease; old frontend against new backend cannot save content.
The existing PR Cloudflare preview is automatically generated by the repository integration; no production rollout was initiated.

## Outstanding deployment checks and limitations

- Preview frontend found at https://fix-collaboration-release-au.bandanize.pages.dev and opened successfully at login. No authenticated staging backend/two authorized test accounts have been supplied. Two real users against the deployed new backend remain unverified. Do not declare production fixed.
- After authorization, test two browser sessions on staging with distinct disposable accounts: edit/save/expiry/reconnect, comments/attachments, invitations, notifications, chat and calendar. Verify backend revision, schema, CORS and storage configuration before use.
- Historical chat timestamps without a zone are still ambiguous. The reported two-hour offset and real-user missed-message symptom need deployed-server evidence; do not rewrite old timestamps based on an assumed time zone.
- Calendar event edits do not have a version/conflict protocol between two users; sequential last-writer-wins is unchanged. The audit fixes stale client reads and overlapping operations, not collaborative event editing.
- Chunk locking is within one JVM. Multiple backend replicas require shared storage AND cross-process upload coordination. Do not enable multi-replica chunk handling based on these tests.
- Completed chunk session identity metadata is deliberately retained for retry/restart recovery. Do not delete it during in-flight uploads or the retry window. Choose and document an operational retention window before scheduling cleanup; no destructive cleanup job was created.
- File-upload completion and file association are separate operations. A successful upload followed by a failed association can leave an orphaned physical file. Comment creation has no generic idempotency key: an ambiguous lost response still requires checking history before retrying. Do not claim exactly-once delivery.
- Physical storage cleanup after transaction commit can fail independently and is logged; production storage permissions/cleanup and actual email delivery were not verified by mocked boundaries.
