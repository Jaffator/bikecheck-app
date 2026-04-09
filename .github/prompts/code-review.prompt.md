---
description: "Comprehensive code review for architecture, database schema, performance, type safety, and bugs in NestJS/Prisma project"
name: "Code Review Complex"
argument-hint: "Optional: specific focus areas"
agent: "agent"
---

Proveď důkladný code review aktivního souboru podle následujících kritérií:

## 1. Architektura a Design Patterns

### NestJS/Prisma specifika:

- **Separace concerns**: Controller → Service → Repository pattern dodržen?
- **Business logika** patří do Services, ne do Controllers
- **Repositories** pouze Prisma queries, žádná business logika
- **Používá se composition** místo dědičnosti?
- **Funkce jsou malé** a mají jasný účel
- Žádné "god services" nebo sdílené utility třídy

### Prisma schema:

- **Relace správně definované**: foreign keys, onDelete, onUpdate strategie
- **Indexy na správných sloupcích**: filtrované a často dotazované pole
- **Nullable fields správně použity**: opravdu může být null?
- **Unique constraints**: duplicitní data, composite keys
- **Soft delete pattern**: is_deleted + deleted_at konzistentní
- **Naming**: konzistentní pojmenování (plurál pro tabulky)

## 2. Performance

- **N+1 queries**: chybí `include` nebo `select` při Prisma queries?
- **Missing indexes**: WHERE, JOIN, ORDER BY podmínky bez indexů?
- **Denormalizace**: duplicitní data správně aktualizována?
- **Eager loading**: načítá se víc dat než potřeba?
- **Transakce**: multi-step operace správně v `$transaction`?
- **Pagination**: chybí limit na velkých datasetech?

## 3. Type Safety

- **Žádné `any` typy**
- **Explicitní return types** u funkcí
- **DTO typy**: správně definované s validací (`class-validator`)
- **Prisma typy**: používání `Omit`, `Pick`, `Partial` místo ručních typů
- **Nullability**: `?` správně odpovídá Prisma schema

### DTO best practices:

```typescript
// ✅ Dobře
type CreateBase = Omit<PrismaModel, 'id' | 'created_at' | 'updated_at'>;
export class CreateDto implements Partial<CreateBase> { ... }

// ❌ Špatně
extends PrismaModel  // dědí i auto-generované sloupce
```

## 4. Bugs a Code Smells

- **Chybějící validace**: input validation na API endpointech?
- **Error handling**: uncaught exceptions, vhodné HTTP status kódy?
- **Race conditions**: concurrent updates na stejná data?
- **Memory leaks**: neuzavřené connections, event listeners?
- **Logic errors**:
  - `filter()[0]` místo `find()`
  - Neošetřené nullable values
  - Špatná arithmetic (Date math, decimal precision)
- **Duplicate code**: DRY principle

## 5. Security

- **SQL injection**: raw queries nebo interpolace v Prisma?
- **Authorization**: vlastník resource může modifikovat?
- **Sensitive data**: credentials v kódu, logy?
- **Input sanitization**: XSS, path traversal?

## Output formát

Pro každou nalezenou issue:

**[SEVERITY] Issue Type: Stručný popis**

```typescript
// Problematický kód
```

**Proč je to problém:** Vysvětlení
**Fix:**

```typescript
// Opravený kód
```

---

**Severity:**

- 🔴 Critical: security, data loss, crashes
- 🟠 High: performance bottleneck, architectural flaw
- 🟡 Medium: code smell, missing validation
- 🟢 Low: style, naming, minor improvements

Shrnutí na konci:

- Celkový počet issues podle severity
- Doporučení pro priority fixes
- Architectural recommendations
