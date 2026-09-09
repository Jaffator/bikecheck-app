import { decodeCursor, encodeCursor } from './cursor';

describe('cursor', () => {
  it('carries the sort key and the row that held it', () => {
    expect(decodeCursor(encodeCursor('2026-05-14T08:00:00.000Z', 412))).toEqual({
      sortKey: '2026-05-14T08:00:00.000Z',
      id: 412,
    });
  });

  it('carries a numeric sort key back as text', () => {
    expect(decodeCursor(encodeCursor(132, 55))).toEqual({ sortKey: '132', id: 55 });
  });

  it('reads nonsense from the model as no cursor', () => {
    expect(decodeCursor('not-a-cursor')).toBeNull();
    expect(decodeCursor(encodeCursor('2026-05-14', Number.NaN))).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
});
