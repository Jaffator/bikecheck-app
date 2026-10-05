# Mock riders

Six accounts with garages, for testing follows and Public Profiles. Dev database only.

## Logins

Password for all: `mock-rider`

| Email                    | Name           | Handle            | Visibility | Bikes | Toward you      |
| ------------------------ | -------------- | ----------------- | ---------- | ----- | --------------- |
| `rider1@bikecheck.local` | Tomáš Dvořák   | `tomas-dvorak`    | PUBLIC     | 2     | follows you     |
| `rider2@bikecheck.local` | Klára Šťastná  | `klara-stastna`   | PUBLIC     | 2     | —               |
| `rider3@bikecheck.local` | Marek Novotný  | `marek-novotny`   | PUBLIC     | 3     | request pending |
| `rider4@bikecheck.local` | Petra Malá     | `petra-mala`      | FOLLOWERS  | 1     | request pending |
| `rider5@bikecheck.local` | Jakub Černý    | `jakub-cerny`     | FOLLOWERS  | 2     | —               |
| `rider6@bikecheck.local` | Lucie Horáková | `lucie-horakova`  | OFF        | 1     | follows you     |

## Share switches

| Rider  | Components | Setup | History | Costs |
| ------ | ---------- | ----- | ------- | ----- |
| Tomáš  | on         | on    | on      | on    |
| Klára  | on         | on    | off     | off   |
| Marek  | on         | off   | on      | off   |
| Petra  | on         | on    | on      | on    |
| Jakub  | on         | on    | on      | off   |
| Lucie  | on         | on    | off     | off   |

Marek has one bike with `is_shared = false` and one e-bike. Petra reads tyre pressures in psi.

## Commands

Run from `_backend`:

```
npm run db:mockriders -- you@mail.com   # rebuild, with followers and requests toward that account
npm run db:mockriders                   # rebuild, no follow rows
npm run db:mockriders -- --clean        # remove only
```

A rebuild deletes the six accounts first, so your follows toward them and their notices in your bell go too.
