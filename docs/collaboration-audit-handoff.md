# Collaboration audit handoff (2026-09-25)

PR #193, branch fix/collaboration-release-audit. DRAFT: do not merge/deploy until completion.

## User requirements
Audit comments, file uploads, notifications, chat, invitations and similar cross-feature failures before publishing. Prevent simultaneous tablature editing and show who is editing. No local web testing; use GitHub CI and deployed previews. Conventional feat:/fix:/chore: commits/PR titles. Explicitly say when backend deploy/migration is required. Do not activate test@bandanize.com; user deferred that account. Do not merge or deploy without authorization.

## Implemented
- Comments: independent 5-second refresh, 8-second timeout, focus/online recovery, reject late reads across mutations, preserve drafts, deduplicate saved comments; scroll only near bottom. Mention caret moved to layout effect to avoid delayed cursor jumps.
- Notifications: 10-second refresh, cancellation guard, failure UI, defensive date display, read revision guard.
- General API: 20-second default timeout, uploads keep 5-minute timeout. Project reads ignore superseded responses. Invitation acceptance refreshes independent data concurrently.
- File deletion: visible errors and duplicate-click guard. Upload client rejects incomplete/invalid completion filenames.
- Local chunk storage: validate metadata/paths, atomic assembly, stable filename per upload, retain small session metadata, repeated last chunk after lost response/restart returns same complete filename. JVM striped locking. Multiple service replicas need shared storage AND cross-process coordination; current locking is single-JVM, not a distributed guarantee.
- Edit leases WIP: four nullable fields on TablatureModel, DB pessimistic row lock plus refresh, 90-second lease, acquire/renew/status/release endpoints. Token bound to user and browser editing session; token not exposed in ordinary JSON/status. Acquire checks expected original content. Controller transactions protect content saves and prevent metadata edits/deleting a tab while another session holds its lease.
- Frontend WIP: useTabEditLease hook renews every 10 seconds, owner indication, save token, readonly on lost lease, copy/download retained draft; close/discard releases. SongDetail rethrows failed content saves. Old clients without lease tokens cannot save content after backend deployment.

## Validation
First commit (before edit leases) passed backend tests, PostgreSQL tests and frontend lint; browser/build results need re-check.
Second commit (edit leases and concurrency tests) is unvalidated at handoff.
Added ChunkUploadRecoveryTest, remote-comment recovery tests in comments.mjs, and DatabaseLifecycleTest lease tests including simultaneous acquisition and expiry.
No local app/tests have been run.

## Required next work
1. Read PR #193 current head/checks and any new main changes; resolve any conflicts without dropping others' work.
2. Complete browser tests for two simultaneous editors, owner display, renew failure/expired lease, draft preservation, release and reacquire. Existing mocked browser routes may need edit-lock fixtures when they enter editing. Do NOT weaken existing tests.
3. Run/fix CI, including actual PostgreSQL concurrency test. Inspect Java compilation and frontend lint on WIP.
4. Review lock access paths: content and metadata save, deletion, files/comments during editing; verify no stale entity can overwrite lease fields. Review lease hook lifecycle/unmount and slow acquisitions/renewals. No guarantee yet for all destructive song/list/project operations during editing.
5. Add migration SQL/docs for tablature_model edit_owner_id BIGINT, edit_owner_name VARCHAR(255), edit_token VARCHAR(255), edit_expires_at TIMESTAMP WITH TIME ZONE. Existing ddl-auto=update may create them; production validate/manual needs explicit migration. Backend/frontend must ship together; tell user.
6. Finish audit of calendar stale responses and media/project cross-user updates. File state still relies on project invalidations/reconnect; no new push events added for comments/files. Comments/notifications use polling. Calendar audit is not complete.
7. Chunk storage metadata is retained for retry idempotency; document cleanup/storage strategy. Lost response AFTER attaching metadata (POST song/tab/comment) still has no generic idempotency key: do not claim all writes are exactly-once. Check frontend retry behavior.
8. Extend browser tests for upload/attachment association failure and notification failure; test late history versus comment save/delete.
9. Publish concise audit evidence/report: what is verified, what remains unverified in production. Do not claim readiness for publication just because mocked browser CI passes.
10. When done, update PR description with final behavior, CI evidence and deployment instructions; mark ready, do not merge.

## Production evidence from prior chat work
PR #189 (merged into current main) decouples chat polling from invitations, timeout8s and fallback every3s. Real user session showed sent messages appearing but timestamps about2h old. Friend reports missing messages until reload, sometimes even after reload. Two real authenticated users have NOT verified production delivery. UTC/naive chat timestamp issue remains unresolved. User's original session was in app.bandanize.com/project/23?tab=chat; a new PC may require login. Do not send messages to their colleague unless explicitly authorized.
