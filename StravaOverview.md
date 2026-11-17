# Strava API Policy – přehled změn (PRD #373)

| # | Pravidlo Stravy | Co se změnilo | Stav |
|---|---|---|---|
| #374 | §5.3 Žádná AI nad Strava daty | AI shrnutí jízdy zrušené úplně. AI chat už nevidí jízdy ani km, zbyly mu díly, servisní historie, náklady a tlaky. | ✅ |
| #375 | §6.2 Strava data max 7 dní | Surová data ze Stravy se po 7 dnech mažou. Čekající jízdy bez kola starší 7 dní se zahodí. Z jízd zmizela trasa, název, výkon a kalorie. Zůstává datum, km, převýšení, čas, kolo a opotřebení. | ✅ |
| #383 | (navazuje na #375) | Kalorie a statistika „Energy“ odstraněné z DB, API i UI. | ✅ |
| #377 | §7.2 Jen nutná oprávnění | Scopes zúžené na `profile:read_all` a `activity:read_all`. Pryč je `activity:write` a `read_all`. | ✅ |
| #378 | §7.4 Odpojení = smazání dat | Odpojení z appky i deauthorize ze Stravy smaže tokeny, surová data, čekající jízdy, trasy, spárování kol a Strava údaje uživatele. Jízdy zůstanou bez trasy. Appka se ptá dvakrát a pošle notifikaci. | ✅ |
| #379 | §7.1 Soukromé aktivity | Soukromé jízdy se ukládají a počítají do opotřebení, jen jsou označené zámkem. Zmínka je i v Privacy policy. | ✅ |
| #380 | §2.3 / §5.13 Data vidí jen vlastník | Než se veřejný profil nebo sdílení dostane ke km a času ze Stravy, uživatel musí zaškrtnout souhlas. Mapa se tam neukazuje nikdy. Stejný souhlas platí pro reporty. | ✅ |
| #381 | Brand guidelines | Oficiální tlačítko „Connect with Strava“, odkaz „View on Strava“ a logo „Powered by Strava“. Strava logo zmizelo z ikony appky, z landing page a ze screenshotů do storu. | ✅ |
| #376 | §6.2 / §5.7 Mapa | Mapa jízdy se má stahovat ze Stravy až při otevření, s cache na 7 dní. | ⏳ otevřené |
| #384 | (navazuje na #378) | Po znovupřipojení Stravy se mají trasy jízd stáhnout znovu. | ⏳ otevřené |
| #382 | Žádost o víc sportovců | Screenshoty a popis jsou hotové. Chybí dodělat #376 a #384, získat skutečné uživatele a odeslat formulář. | ⏳ otevřené |

V #375 je napsané, že se trasa z jízd odstranila. Mapa se ale v appce pořád ukazuje, takže tuhle díru má zavřít #376.
