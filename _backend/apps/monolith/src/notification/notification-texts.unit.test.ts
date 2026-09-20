import { buildNotificationText } from './notification-texts';

// A heads-up names the jobs coming up, in the app's own words for each language; a
// notification with something due sizes the job in counts instead.
describe('maintenance_due text', () => {
  const chain = {
    componentKey: 'component.chain',
    componentName: 'Chain',
    actionKey: 'action.chainReplacement',
    actionName: 'Chain replacement',
    percentage: 72,
  };

  it('names what is coming up, translated', () => {
    const text = buildNotificationText('maintenance_due', 'cs', {
      bikeName: 'Canyon Strive',
      level: 'warning',
      soonCount: 1,
      crossed: [chain],
    });

    expect(text.title).toBe('Blíží se servis');
    expect(text.body).toBe('Canyon Strive · Řetěz – Výměna řetězu 72 %');
  });

  it('names a part the owner typed as typed', () => {
    const text = buildNotificationText('maintenance_due', 'en', {
      bikeName: 'Canyon Strive',
      level: 'warning',
      soonCount: 2,
      crossed: [
        chain,
        {
          componentKey: null,
          componentName: 'Mudguard',
          actionKey: 'action.chainReplacement',
          actionName: 'x',
          percentage: 70,
        },
      ],
    });

    expect(text.title).toBe('Service coming up');
    expect(text.body).toBe('Canyon Strive · Chain – Chain replacement 72 %, Mudguard – Chain replacement 70 %');
  });

  it('sizes the job in counts once something is due', () => {
    const text = buildNotificationText('maintenance_due', 'en', {
      bikeName: 'Canyon Strive',
      level: 'overdue',
      soonCount: 1,
      dueCount: 0,
      overdueCount: 1,
      crossed: [chain],
    });

    expect(text.title).toBe('Service overdue');
    expect(text.body).toBe('Canyon Strive · 1 soon, 1 overdue');
  });
});

// A new follower is named as the app names people: name and @handle when both are known,
// whichever one is when not - a follower who never made a profile has no handle.
describe('new_follower text', () => {
  it('names the follower with name and handle, in Czech', () => {
    const text = buildNotificationText('new_follower', 'cs', { personName: 'Jarda Novák', handle: 'jaffa' });

    expect(text.title).toBe('Nový sledující');
    expect(text.body).toBe('Jarda Novák (@jaffa) teď sleduje tvoji garáž.');
  });

  it('names the follower with name and handle, in English', () => {
    const text = buildNotificationText('new_follower', 'en', { personName: 'Jarda Novák', handle: 'jaffa' });

    expect(text.title).toBe('New follower');
    expect(text.body).toBe('Jarda Novák (@jaffa) now follows your garage.');
  });

  it('falls back to @handle when the follower has no name', () => {
    expect(buildNotificationText('new_follower', 'cs', { handle: 'jaffa' }).body).toBe('@jaffa teď sleduje tvoji garáž.');
    expect(buildNotificationText('new_follower', 'en', { handle: 'jaffa' }).body).toBe('@jaffa now follows your garage.');
  });

  it('drops the parenthesis when the follower has no handle', () => {
    expect(buildNotificationText('new_follower', 'cs', { personName: 'Jarda Novák' }).body).toBe(
      'Jarda Novák teď sleduje tvoji garáž.',
    );
    expect(buildNotificationText('new_follower', 'en', { personName: 'Jarda Novák' }).body).toBe(
      'Jarda Novák now follows your garage.',
    );
  });

  it('still reads as a sentence with neither', () => {
    expect(buildNotificationText('new_follower', 'cs', {}).body).toBe('Někdo teď sleduje tvoji garáž.');
    expect(buildNotificationText('new_follower', 'en', {}).body).toBe('Someone now follows your garage.');
  });
});

// A Follow Request names the asker the same way; without a handle the parenthesis goes and
// the sentence still reads whole.
describe('follow_request text', () => {
  it('names the asker with name and handle, in Czech', () => {
    const text = buildNotificationText('follow_request', 'cs', { personName: 'Jarda Novák', handle: 'jaffa' });

    expect(text.title).toBe('Nová žádost o sledování');
    expect(text.body).toBe('Jarda Novák (@jaffa) chce sledovat tvoji garáž.');
  });

  it('names the asker with name and handle, in English', () => {
    const text = buildNotificationText('follow_request', 'en', { personName: 'Jarda Novák', handle: 'jaffa' });

    expect(text.title).toBe('New follow request');
    expect(text.body).toBe('Jarda Novák (@jaffa) wants to follow your garage.');
  });

  it('drops the parenthesis when the asker has no handle', () => {
    expect(buildNotificationText('follow_request', 'cs', { personName: 'Jarda Novák' }).body).toBe(
      'Jarda Novák chce sledovat tvoji garáž.',
    );
    expect(buildNotificationText('follow_request', 'en', { personName: 'Jarda Novák' }).body).toBe(
      'Jarda Novák wants to follow your garage.',
    );
  });

  it('falls back to @handle when the asker has no name', () => {
    expect(buildNotificationText('follow_request', 'cs', { handle: 'jaffa' }).body).toBe(
      '@jaffa chce sledovat tvoji garáž.',
    );
    expect(buildNotificationText('follow_request', 'en', { handle: 'jaffa' }).body).toBe(
      '@jaffa wants to follow your garage.',
    );
  });

  it('still reads as a sentence with neither', () => {
    expect(buildNotificationText('follow_request', 'cs', {}).body).toBe('Někdo chce sledovat tvoji garáž.');
    expect(buildNotificationText('follow_request', 'en', {}).body).toBe('Someone wants to follow your garage.');
  });
});
