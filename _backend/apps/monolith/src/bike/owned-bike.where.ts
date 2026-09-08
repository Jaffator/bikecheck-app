import { Prisma } from '@prisma/client';

// How every domain says "this bike, owned by this user, in this state". Four services
// used to hand-write it and had already drifted apart (ADR 0024), so it lives here once.
export type OwnedBikeOptions = {
  // An Archived Bike is readable but never writable, so the default keeps it out and
  // only the read paths that want it ask for it.
  includeArchived?: boolean;
};

// is_deleted is nullable, so `not: true` is what covers both false and the null rows
// written before the column existed.
export function ownedBikesWhere(
  userId: number,
  { includeArchived = false }: OwnedBikeOptions = {},
): Prisma.bikesWhereInput {
  return {
    user_id: userId,
    ...(includeArchived ? {} : { is_deleted: { not: true } }),
  };
}

// One bike out of the same set, so a read of the garage and a read of one of its bikes can
// never disagree about which bikes exist.
export function ownedBikeWhere(bikeId: number, userId: number, options: OwnedBikeOptions = {}): Prisma.bikesWhereInput {
  return { id: bikeId, ...ownedBikesWhere(userId, options) };
}
