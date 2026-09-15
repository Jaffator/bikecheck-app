# An unverified account is a placeholder

The app is about to start writing to email addresses — a welcome, and the notifications a rider can
opt into — so an address has to be shown to belong to the person behind the account before anything
is sent to it. Registration by name and password took the address on faith and signed the user in
on the spot; a Google sign-in carried Google's own `email_verified` and threw it away.

**An account cannot sign in until its email is verified, and until then it is a placeholder, not a
locked account.** It has never signed in, so it holds nothing, and whatever next arrives on that
address with proof of ownership replaces it outright: a Google sign-in whose address Google vouches
for takes the row over (Google id set, password cleared, verified), and a fresh registration
rewrites the password and sends a new Verification Email. Nothing expires it and no job cleans it
up, because there is nothing in it to keep or to remove.

## Why strict rather than soft

The soft shape — sign in at once, show a "verify your email" banner, hold back only the emails —
keeps the current one-step registration. It was rejected because it leaves a usable account sitting
on an unproven address, which every later feature then has to remember: the email channel, and one
day a password reset, each carrying their own "but only if verified" check. One rule at the door
means nothing past it needs one.

## Why replace rather than refuse

Two scenarios fall out of a locked-but-real unverified account, and both were live in the code:

- Someone registers with an address that is not theirs and never verifies. The real owner later
  signs in with Google, and the linking step attaches their Google id to the impostor's row — whose
  password the impostor knows.
- Someone registers, the email never arrives, and a week later they try again: the address is
  taken, and the account it is taken by cannot sign in.

Refusing both — no linking to, no re-registration over, an unverified row — closes the first and
leaves the second stuck until a cron deletes stale rows. Treating the row as a placeholder closes
both with one rule and no timer: the impostor's row is overwritten the moment the owner shows up,
and a second registration is simply the first one again.

## The link is a signed token, not a row

The Verification Email carries a JWT — purpose, user id, address, a day's expiry — signed with the
app's existing secret. Verifying is idempotent and harmless, so a token has nothing to be revoked
for, and "send it again" just mints another; a table of one-time tokens would exist only to be
looked up once and marked used. The token's address is checked against the row, so a link minted
for one placeholder never verifies a row that has since been replaced under a different address.

The link is opened, not fetched: an `https` App Link that lands in the app when it is installed and
on a page with a button otherwise. Mail scanners `GET` links at delivery time, and a link that
verified on `GET` would let a scanner prove ownership on the impostor's behalf.

## Consequences

- Registration no longer signs the user in. It ends on "check your inbox", and login on an
  unverified account answers 403 `EMAIL_NOT_VERIFIED` with a way to resend.
- `users.email_verified_at`. Every account that existed before this is backfilled as verified from
  its `created_at`: nobody proved those addresses, but their owners have been signing in through
  them, and locking them out for the sake of the definition is the wrong trade.
- A Google sign-in whose address Google does not vouch for creates a placeholder like any other and
  is sent the Verification Email, rather than being trusted anyway.
- The Welcome Email fires when the account becomes usable — at creation when born verified, on
  verification otherwise — so it is never sent to a placeholder.
- The email notification channel needs no verified-address check: nothing that can act is
  unverified.
