# Database and functionality audit — 2026-09-24

## Confirmed and fixed

- Registration saved a disabled account even when verification delivery failed. Registration now rolls back on failure; the API returns an error instead of reporting success. Resend verification recovers existing pending accounts.
- Resend swallowed provider exceptions and missing configuration. Required email delivery now fails explicitly (503). The default link domain is app.bandanize.com; APP_FRONTEND_URL still overrides it.
- Account deletion was blocked by tablature-comment author foreign keys. Comments and chat are anonymized; owned projects use the same cleanup path as direct project deletion, including owners missing from legacy membership lists.
- Account deletion previously sent no email at all. A confirmation is now attempted only after deletion commits. A provider failure is logged and does not undo or misreport a completed deletion.
- Deleting a setlist removed physical files of songs shared with another list and left unlisted songs behind. Only songs with no remaining list are deleted; physical cleanup runs after commit and checks for other file references.
- Updating a tablature's text replaced attachments with the request model's default empty list. Attachment endpoints now exclusively manage attachments.
- Reorder accepted incomplete or duplicated IDs, silently removing songs. Stale/incomplete reorders return 409 without modifying the list.
- Song move/copy could link different projects and duplicate list entries. Operations validate both list membership and project identity and run atomically.
- Song/tab/list/event endpoints did not consistently validate membership. Reads and mutations now check the authenticated user's project access, including both source and destination lists.
- User updates could modify another account; generic user creation bypassed registration. Those paths are blocked. New entity endpoints reject supplied IDs.
- Owners could leave without transferring ownership. The operation now requires transfer first. Legacy ownerless projects cannot be deleted by arbitrary accounts.
- Email tokens could be used as login tokens or for another account action. New tokens have distinct purposes. Existing session tokens remain valid until expiry; old email links must be reissued.
- UserDetails.password could serialize through chat/comment authors. Password properties are excluded from responses.
- Concurrent chat read acknowledgements could create duplicate receipts. They now serialize through the user row lock.
- The old numeric public calendar URL exposed project calendars. It returns 410; the existing secret-token subscription remains functional.
- Account deletion left nullable authors that the comment UI did not handle. Both comment list and inline reader now show a deleted-user label.
- Existing frontend lint errors from state synchronization were repaired; narrowly documented exceptions remain only for effects synchronizing external APIs/widgets.

## Regression coverage

DatabaseLifecycleTest uses a real HTTP server and real relational persistence, with only mail delivery and physical storage mocked. It covers account creation/verification/login/reset/resend, invitation accept/reject/reinvite/removal, account and project deletion, cross-project access, song create/move/copy/replicate/delete, shared lists, stale reorder, attachment preservation, calendar CRUD, chat and read receipts.

Seven of the first eight scenarios failed against unchanged main; all pass after the fixes. Full local backend suite: 152 tests, zero failures. Existing comment/selection/attachment/notification/unread HTTP tests also pass. Production frontend build and lint checked separately.

The Database regression workflow runs the lifecycle and comment HTTP suites against an isolated PostgreSQL 16 service. It does not connect to production or use production credentials.

## Deployment and remaining verification

These fixes must be deployed to the API as well as the frontend. Publishing a frontend alone cannot change database operations or email delivery. No production records were created or deleted in this audit.

The live server's Resend credentials and domain verification are not accessible from this workspace. After deploying, verify RESEND_API_KEY, RESEND_FROM_EMAIL (a sender from a verified domain) and APP_FRONTEND_URL=https://app.bandanize.com. Use the provider's delivery logs to distinguish accepted mail, delivery, spam and rejection. Provider acceptance is not proof of inbox delivery.

Deletion confirmation is best-effort after commit, without a durable retry queue. If mail is unavailable, deletion still succeeds and its delivery failure is logged. Upload cleanup failures are also logged after commit; no database rollback can recreate a removed disk file.

This audit verifies the tested routes, not every production data shape or third-party integration. Spotify/YouTube authorization, real mail delivery, production upgrades from historical schemas, and existing production orphan files require deployment/operator access and are not claimed as validated here. Back up the database and upload volume before updating the server.
