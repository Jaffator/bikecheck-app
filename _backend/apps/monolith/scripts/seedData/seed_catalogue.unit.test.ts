import * as fs from 'fs';
import * as path from 'path';
import seedDataJson from './seed_data.json';
import { SeedAction, SeedData } from './seed_data.types';
import { components } from './seed_type_components';
import { toI18nKey } from './i18n_key';

// The catalogue is data, and data drifts silently. These read the seed files alone — no
// database — so they run in the UNIT suite and fail at commit time rather than months
// later on someone's bike detail (ADR 0019).

const seedData = seedDataJson as SeedData;
const allActions: SeedAction[] = Object.values(seedData.actions).flat();

const typeNames: string[] = components.map((component) => component.component_type);
const categoryNames: string[] = [...new Set(components.map((component) => component.component_group_name))];

const REPO_ROOT: string = path.join(__dirname, '../../../../..');

const MIGRATION_SQL: string = fs.readFileSync(
  path.join(REPO_ROOT, '_backend/apps/monolith/prisma/migrations/20260906140000_seed_catchall_part_replacements/migration.sql'),
  'utf8',
);

// The migration that gives each Component Type a Replacement of its own (ADR 0022).
const SPLIT_SQL: string = fs.readFileSync(
  path.join(
    REPO_ROOT,
    '_backend/apps/monolith/prisma/migrations/20260907140000_split_replacements_per_component_type/migration.sql',
  ),
  'utf8',
);

// [component_type, action_name, i18n_key] as the split migration lists them.
const SPLIT_ROWS: string[][] = [...SPLIT_SQL.matchAll(/jsonb_build_array\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g)].map(
  (match) => [match[1], match[2], match[3]],
);

// Read, not imported: the locale files belong to the frontend and stay out of this build.
function readLocale(language: string): Record<string, Record<string, string>> {
  const file: string = path.join(REPO_ROOT, `_frontend/bikecheck/src/i18n/locales/${language}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, Record<string, string>>;
}

// The map the migration keys by group_name, mirrored so a new category fails the suite
// before it fails a deployment.
const CATCH_ALL_BY_CATEGORY: Record<string, string> = {
  Suspension: 'Suspension Part Replacement',
  Frame: 'Frame Part Replacement',
  Cockpit: 'Cockpit Part Replacement',
  'Saddle & Seatpost': 'Saddle Part Replacement',
  Wheels: 'Wheels Part Replacement',
  Drivetrain: 'Drivetrain Part Replacement',
  Brakes: 'Brakes Part Replacement',
  'E-bike': 'Ebike Part Replacement',
  // The seed file says 'Other', every deployed database says 'Misc'. The migration maps
  // both until that drift is settled.
  Misc: 'Other Part Replacement',
  Other: 'Other Part Replacement',
};

const CATCH_ALL_NAMES: Set<string> = new Set(Object.values(CATCH_ALL_BY_CATEGORY));

describe('seed catalogue', () => {
  // ADR 0018 asked for at least one; ADR 0022 asks for exactly one. Two Replacements on a
  // type would put the same part on two rows of the wizard's action step - the picker the
  // split removed, rebuilt as a list. None leaves the part unreplaceable.
  it('gives every Component Type exactly one Replacement (ADR 0022)', () => {
    const counts = new Map<string, number>();
    for (const action of allActions) {
      if (!action.replace) continue;
      for (const target of action.targets) counts.set(target, (counts.get(target) ?? 0) + 1);
    }

    const wrong: [string, number][] = typeNames
      .map((name): [string, number] => [name, counts.get(name) ?? 0])
      .filter(([, count]) => count !== 1);

    expect(wrong).toEqual([]);
  });

  // The catch-alls outlive the split, serving owner-created types alone. They hold no
  // seeded target, which is why their category moved onto the Action itself.
  it('keeps a targetless catch-all per category (ADR 0022)', () => {
    const catchAlls = allActions.filter((action) => action.catch_all === true);

    expect(catchAlls.map((action) => action.action).sort()).toEqual([...CATCH_ALL_NAMES].sort());
    expect(catchAlls.filter((action) => action.targets.length > 0).map((action) => action.action)).toEqual([]);
    expect(catchAlls.filter((action) => !action.replace).map((action) => action.action)).toEqual([]);
  });

  // The migration is what reaches a deployed database (ADR 0019), so its list and the seed
  // file have to say the same thing.
  it('mints the same per-type Replacements the seed file declares (ADR 0022)', () => {
    const seeded = new Map<string, string[]>(
      allActions.filter((action) => action.replace && action.catch_all !== true).map((action) => [action.action, action.targets]),
    );
    const known = new Set<string>(typeNames);
    const problems: string[] = [];

    expect(SPLIT_ROWS.length).toBeGreaterThan(0);

    for (const [typeName, actionName, key] of SPLIT_ROWS) {
      if (!known.has(typeName)) problems.push(`${typeName}: not a Component Type`);
      if (!seeded.has(actionName)) problems.push(`${actionName}: not a Replacement in seed_data.json`);
      else if (!seeded.get(actionName)!.includes(typeName)) problems.push(`${actionName}: does not target ${typeName}`);
      // The key is derived from the English name at seed time and hardcoded in the SQL, so
      // a rename must reach both.
      if (key !== toI18nKey('action', actionName)) problems.push(`${actionName}: key ${key} is not derived from the name`);
    }

    expect(problems).toEqual([]);
  });

  it('has a locale entry for every Replacement key (ADR 0022)', () => {
    const locales = [readLocale('cs'), readLocale('en')];
    const untranslated: string[] = [];

    for (const action of allActions.filter((entry) => entry.replace)) {
      const key: string = toI18nKey('action', action.action);
      for (const locale of locales) {
        if (locale.action[key.replace('action.', '')] === undefined) untranslated.push(key);
      }
    }

    expect([...new Set(untranslated)]).toEqual([]);
  });

  it('targets only Component Types that exist', () => {
    const known = new Set<string>(typeNames);
    const unknown: string[] = allActions.flatMap((action) => action.targets).filter((target) => !known.has(target));

    // seed_actions.ts throws on the first target it cannot find, which aborts the whole
    // catalogue seed and only logs.
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('gives every Component Category a catch-all Replacement', () => {
    const actionNames = new Set<string>(allActions.filter((action) => action.replace).map((action) => action.action));
    const missing: string[] = categoryNames.filter((category) => {
      const catchAll = CATCH_ALL_BY_CATEGORY[category];
      return catchAll === undefined || !actionNames.has(catchAll);
    });

    expect(missing).toEqual([]);
  });

  it('names each catch-all in the migration that delivers it', () => {
    const unmapped: string[] = Object.entries(CATCH_ALL_BY_CATEGORY)
      .filter(([category, catchAll]) => !MIGRATION_SQL.includes(`'${category}'`) || !MIGRATION_SQL.includes(`'${catchAll}'`))
      .map(([category]) => category);

    expect(unmapped).toEqual([]);
  });

  it('has a locale entry for every catch-all key the migration writes', () => {
    const locales = [readLocale('cs'), readLocale('en')];
    const untranslated: string[] = [];

    for (const catchAll of new Set(Object.values(CATCH_ALL_BY_CATEGORY))) {
      const key: string = toI18nKey('action', catchAll);
      // The migration hardcodes the derived key; a rename must reach the locale files.
      if (!MIGRATION_SQL.includes(`'${key}'`)) untranslated.push(`${key} (migration)`);
      for (const locale of locales) {
        if (locale.action[key.replace('action.', '')] === undefined) untranslated.push(key);
      }
    }

    expect(untranslated).toEqual([]);
  });
});
