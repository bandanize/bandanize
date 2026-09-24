# Song activity indicators

Deploy **both backend and frontend** for this change. Deploying only Cloudflare Pages leaves ordinary counters visible without unread highlighting.

The backend creates the additive `song_read_state` table through the existing Hibernate `ddl-auto=update` configuration. Keep the current database and volumes. No existing songs or comments are rewritten. The tested backend image is published by the existing main-branch workflow; the server still needs to pull and restart with that image.

Receipts belong to the authenticated user and song. Tabs, file references (song/tab scoped URL), and comments are independent. Only resources actually displayed in a visible browser tab for at least 800ms are acknowledged. Loading a hidden comment panel does not acknowledge it. Files count as seen when their library row appears, without needing to download/play each file. Own comments are excluded. Existing resources start unseen until viewed; there is no historical read data to migrate.

Unseen indicators refresh on focus and every 30 seconds while the page is visible. Missing or failing endpoints do not fabricate unread status. Failed receipts retain the highlight and retry after 30 seconds.

A new comment/tab/file has a distinct resource identity, so replacing a deleted resource with another still triggers an indicator even when the count stays equal. Edits to an already seen tab are reflected in the Activity timestamp but do not make it a newly unseen tab. Reusing the exact same upload URL in the same scope represents the same file.

Remote validation: backend HTTP integration tests cover persistence, project membership, separate users/categories, stale/future IDs, replacement comments and deletion cleanup. Browser fixtures cover compact rows, independent visibility receipts, hidden comments and a new file after reading. Tests run only on GitHub Actions.
