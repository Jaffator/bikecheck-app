import { z } from 'zod';
import { optionalId, optionalText } from './tool-input';

// Both helpers guard the same failure: a filling model turns an optional argument into a filter
// that matches nothing. Read through a schema, because that is where the model's input lands.
const schema = z.object({ id: optionalId(), text: optionalText() });

async function parsed(input: unknown): Promise<{ id: number | undefined; text: string | undefined }> {
  return await schema.parseAsync(input);
}

describe('optionalId', () => {
  it('reads a real id as a filter', async () => {
    expect((await parsed({ id: 42 })).id).toBe(42);
  });

  it('reads the zero a filling model sends as no filter at all', async () => {
    expect((await parsed({ id: 0 })).id).toBeUndefined();
  });

  it('reads a negative id as no filter, because no row ever carries one', async () => {
    expect((await parsed({ id: -3 })).id).toBeUndefined();
  });

  it('leaves an omitted id omitted', async () => {
    expect((await parsed({})).id).toBeUndefined();
  });

  it('refuses text where an id belongs', async () => {
    await expect(parsed({ id: '7' })).rejects.toThrow();
  });
});

describe('optionalText', () => {
  it('trims what the model sent', async () => {
    expect((await parsed({ text: '  front ' })).text).toBe('front');
  });

  it('reads an empty string as no filter at all', async () => {
    expect((await parsed({ text: '   ' })).text).toBeUndefined();
  });
});
