# Chat eval

Co unit testy chatu neumí: jestli **model** sáhne po správném toolu, odmítne nesmysl a nevymyslí
si číslo. Pouští se ručně, není součástí `npm test` — stojí tokeny a model není deterministický.

```bash
npm run chat:eval             # celá sada
npm run chat:eval -- A5 D9    # jen tyhle položky
npm run chat:eval:seed        # jen nasypat garáž, bez ptaní modelu
```

Vyžaduje běžící dev DB a Redis a nasazený katalog (`npm run db:devseed`) — bez něj seed spadne
a řekne, co v katalogu chybí.

## Jak to funguje

- **`fixture.ts`** — garáž a všechna očekávaná čísla na jednom místě. Datumy jsou offsety ode
  dneška, takže „za posledních 12 měsíců" znamená pořád totéž.
- **`seed_eval.ts`** — smaže všechno, co patří `eval@bikecheck.local`, a nasype fixture znovu.
  Vlastní uživatel drží tvoje data stranou a mazání vlákna zároveň nuluje denní token budget.
- **`questions.ts`** — sada otázek. Jedna položka = jeden až n turnů; kontroluje se poslední
  odpověď. Zdroj pravdy o tom, co se testuje.
- **`run.ts`** — zvedne Nest kontext a volá `AiChatService.ask()` napřímo, bez HTTP, guardu a
  throttlu. Před každou položkou smaže vlákno. Každá položka jede 3× a prochází při 2 ze 3.

Výstup: zeleno/červeno v konzoli a `last-run.json` s celými odpověďmi, zavolanými tooly a jejich
**argumenty** — bez nich se „zavolal tool" a „zavolal ho s filtrem, na který se nikdo neptal"
čtou stejně.

## Kontroly

Tvrdě v kódu, žádný druhý model: podřetězec, který v odpovědi **být musí**, který v ní **být
nesmí**, a tooly, které se **měly** zavolat. Porovnává se na normalizovaném textu — bez
diakritiky, malými písmeny, mezery uvnitř čísel pryč. Kde je správných tvarů víc (`1` i `jeden`,
procenta i zbývající kilometry), nese kontrola seznam a stačí jeden z nich.

Runner navíc před první otázkou ověří přes `ServiceTrackingService`, že fixture pořád čte jako
132 % / 45 % — jinak by rozbitá fixture vypadala jako chat, který si vymýšlí.

## Když něco spadne

Nejdřív otevři `last-run.json` a přečti, co chat opravdu napsal. Zkušenost z prvního běhu je, že
většina červených jsou příliš přísná očekávání — chat řekl „jeden report" místo „1", nebo napsal
opotřebení v kilometrech místo v procentech. Skutečné chyby chatu vypadají jinak: popře fakt,
který v datech je, nebo si vymyslí argument toolu.
