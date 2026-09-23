# Collaboration update

## Validation
Run tests only in GitHub Actions. Do not run tests or previews on a maintainer's local computer for this task.
The browser workflow exercises responsive UI and invitation continuity with mocked APIs. Backend integration tests cover real membership, expiry, rotation, revocation and permissions.

## Consent and legal release checklist
- Set VITE_LEGAL_OWNER, VITE_PRIVACY_EMAIL and VITE_LEGAL_COUNTRY only after the two maintainers confirm their identity/contact. The pages explicitly remain provisional while these are missing.
- Confirm hosting location, international transfers, log/backup retention and the provider list before considering the privacy notice final. This change does not certify legal compliance.
- In Cloudflare Zaraz, enable Consent Management and require consent on every optional tool. Set accurate purpose names and descriptions (including providers, storage and retention). The app reads actual purpose IDs; it never treats display labels such as Analytics as IDs.
- Unrecognised or new purposes default to denied. Existing legacy cookieConsent values do not grant consent. Preferences can be reopened from the footer on public and authenticated pages.
- A client-side banner cannot prevent a separately injected tool configured to run without consent. Verify Cloudflare configuration before publication.
- Never add independent analytics/marketing scripts that bypass this gate.
- References: https://developers.cloudflare.com/zaraz/consent-management/api/ and https://www.aepd.es/guias/guia-cookies.pdf

## Invitations
The backend adds nullable invite_token_hash and invite_expires_at columns to band_model (existing Hibernate update policy). Production installations with automatic DDL disabled need an equivalent additive migration. Tokens contain 32 random bytes, expire in seven days, are stored only as SHA-256 digests and can be rotated/revoked only by the project owner. Acceptance requires a verified account and serialises membership updates with a database lock.
The frontend remembers the invitation for up to seven days in the same browser. For verification on another browser/device, reopen the original invitation link after verification.

## Calendar
Google subscription opens through an external calendar URL with a copy/manual fallback. It is read-only and refresh timing belongs to Google. The token permits reading the feed and should be kept private. A membership check now protects token retrieval. Calendar URLs and services must be reachable for Google to fetch them.
The earlier production Cloudflare 1033 outage is an infrastructure issue; these UI changes cannot restore a disconnected tunnel.
