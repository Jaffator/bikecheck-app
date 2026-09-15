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
