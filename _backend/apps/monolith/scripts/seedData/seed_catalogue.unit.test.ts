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

describe('seed catalogue', () => {
  it('offers a Replacement for every Component Type (ADR 0018)', () => {
    const replaceable = new Set<string>();
    for (const action of allActions) {
      if (!action.replace) continue;
      for (const target of action.targets) replaceable.add(target);
    }

    const uncovered: string[] = typeNames.filter((name) => !replaceable.has(name));
    expect(uncovered).toEqual([]);
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
