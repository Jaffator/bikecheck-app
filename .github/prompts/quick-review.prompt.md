---
description: "Quick code review for bugs, type safety, performance, architecture violations, and security issues"
name: "Code Review Quick"
agent: "agent"
---

Proveď rychlý code review aktivního souboru. Zaměř se na kritické problémy:

## Co kontrolovat

### 🔴 Bugs & Logic Errors

- `filter()[0]` místo `find()`
- Neošetřené nullable values (`?.` missing)
- Špatná logika v conditions
- Off-by-one errors
- Async/await chybí nebo špatně použito

### 🔴 Type Safety

- `any` types
- Chybí return types
- Nullable mismatch (DB vs DTO)
- Prisma types správně použity?

### 🔴 Performance Red Flags

- N+1 queries (missing `include`)
- Chybí `select` - načítá zbytečná data
- Multi-step DB operace bez transakce
- Missing pagination na velkých datasets

### 🔴 Architecture

- Business logika v Controlleru (měla být v Service)
- DB queries mimo Repository
- God services/functions
- Duplicitní kód

### 🔴 Security Basics

- Raw queries s interpolací
- Chybí input validation
- Sensitive data v logách
- Authorization check missing

## Output

Jen kritické issues ve formátu:

```
❌ [Bug] Popis problému
Řádek X: `problematický kód`
Fix: `opravený kód`

⚠️ [Type] Popis problému
Řádek X: chybějící return type
Fix: přidat `: Promise<Type>`

🔥 [Perf] N+1 query
Řádek X: multiple DB calls v loop
Fix: použít include nebo whereIn
```

**Na konci:**

- ✅ "No critical issues" a pochvala pokud není co opravit
- 🔧 Seznam prioritních fixů (max 5)

**Pravidla:**

- MAX 5 nejdůležitějších issues
- Stručně, bez detailních vysvětlení
- Pouze věci, které MUSÍ být opraveny
- Ignoruj styling a naming (není critical)
