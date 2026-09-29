import { PrismaService } from '../../prisma/prisma.service';
import { ownedBikesWhere } from './owned-bike.where';

// A bike's colour is its rank by id among all the owner's bikes, archived included, so archiving
// one repaints nothing. Every list that colours a bike reads it here, so no two can disagree.
export async function colorIndexes(prisma: PrismaService, userId: number): Promise<Map<number, number>> {
  const bikes = await prisma.bikes.findMany({
    where: ownedBikesWhere(userId, { includeArchived: true }),
    select: { id: true },
  });
  const ids = bikes.map(({ id }) => id).sort((a, b) => a - b);

  return new Map(ids.map((id, rank) => [id, rank]));
}
