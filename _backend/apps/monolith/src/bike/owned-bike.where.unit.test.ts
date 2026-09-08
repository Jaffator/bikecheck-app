import { ownedBikeWhere } from './owned-bike.where';

const OWNER_ID = 7;
const BIKE_ID = 15;

describe('ownedBikeWhere', () => {
  it('names the bike, its owner and excludes an archived one by default', () => {
    expect(ownedBikeWhere(BIKE_ID, OWNER_ID)).toEqual({
      id: BIKE_ID,
      user_id: OWNER_ID,
      is_deleted: { not: true },
    });
  });

  // `false` would drop the null rows written before the column existed - the drift this
  // function exists to end.
  it('excludes an archived bike with `not: true` rather than `false`', () => {
    expect(ownedBikeWhere(BIKE_ID, OWNER_ID, { includeArchived: false })).toEqual({
      id: BIKE_ID,
      user_id: OWNER_ID,
      is_deleted: { not: true },
    });
  });

  it('says nothing about the flag when an archived bike is wanted', () => {
    expect(ownedBikeWhere(BIKE_ID, OWNER_ID, { includeArchived: true })).toEqual({
      id: BIKE_ID,
      user_id: OWNER_ID,
    });
  });
});
