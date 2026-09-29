// How a person is named wherever a row or a sheet shows one: the name; without one the
// address, as the notifications name people; with neither the one word the app has for it.
export function personName(person: { name: string | null; handle: string | null }, unnamed: string): string {
  return person.name ?? (person.handle === null ? unnamed : `@${person.handle}`);
}
