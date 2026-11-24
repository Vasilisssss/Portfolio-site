# Private view and encrypted data

The public site shows returns and percentages only (`content/privacy.ts`). Two things keep the money figures private:

1. **The private view**: `/private/` is the full site with every figure (value, invested capital, profit/loss,
   quantities, prices). It is published **encrypted** (AES-256-GCM, key derived from your password with PBKDF2-SHA256,
   600 000 iterations). There is no visible link. Open it by **typing the door word** anywhere on the page (no text field: just
   type while the site is open), or by **pressing and holding the copyright line** ("© 2026 …") at the very bottom
   for 3 seconds (works on phones). Or bookmark `/private/`. Only a fingerprint of the word is in the code
   (`components/chrome/SecretDoor.tsx`). The unlock page decrypts it in your browser.
   Nothing is sent anywhere, and without the password the file is unreadable. **Lock** (bottom left) returns to the
   public site.
2. **The data file**: `data/portfolio.json.enc` is the portfolio data encrypted with the same password. The release
   workflow decrypts it into a git-ignored copy (`data/portfolio.private.json`) to build the site; the daily IBKR
   workflow decrypts, updates and re-encrypts it.

Both use one repository secret: **`PRIVATE_VIEW_PASSWORD`** (Settings → Secrets and variables → Actions). Use a long
passphrase (four or five unrelated words): the encrypted page is public, so a short password could be guessed offline.

## How the build keeps it safe

- `app/private/page.tsx` renders the full figures only when `PRIVATE_VIEW_PASSWORD` is set at build time.
- `tools/private/seal.mjs` (part of `npm run build:pages`) encrypts `out/private/index.html`, deletes the page-data
  files that carry the same data, and then scans the whole of `out/` for the private page's marker: if any unencrypted
  copy is left, **the build fails** and nothing is published. Without the password the private page is removed.
- Workflow logs and issues never contain amounts (the repository is public).

## Changing the password

Update the `PRIVATE_VIEW_PASSWORD` secret **and** re-encrypt the data file with the new password in the same step,
or the next build cannot read it:

```bash
PRIVATE_VIEW_PASSWORD='old passphrase' node tools/private/vault.mjs decrypt data/portfolio.json.enc data/portfolio.private.json
PRIVATE_VIEW_PASSWORD='new passphrase' node tools/private/vault.mjs encrypt data/portfolio.private.json data/portfolio.json.enc
```

Commit the new `data/portfolio.json.enc`, then update the secret. (Or ask Claude to do it with you.)

**If the password is lost**, the encrypted data cannot be recovered; the daily IBKR update can rebuild the current
positions, but the month-by-month history before the current year would have to be re-entered.

## Older copies

Copies of `data/portfolio.json` committed before the switch to encryption remain in the repository's history.
Removing them needs a one-off rewrite of the history (a forced overwrite of the branches).
