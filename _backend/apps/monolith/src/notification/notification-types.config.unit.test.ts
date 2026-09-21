import { CLEARED_ON_VIEW, NOTIFICATION_CONFIG } from './notification-types.config';

// The bell is a receipt: opening the list clears an ask about following, because the Users
// badge in the top bar carries the pending count until it is answered (#155).
describe('bell badge ownership', () => {
  it('follow_request is cleared by opening the list', () => {
    expect(NOTIFICATION_CONFIG.follow_request.holdsBadge).toBeUndefined();
    expect(CLEARED_ON_VIEW).toContain('follow_request');
  });

  it('an unassigned ride still holds the bell until it is put on a bike', () => {
    expect(NOTIFICATION_CONFIG.strava_activity_unassigned.holdsBadge).toBe(true);
    expect(CLEARED_ON_VIEW).not.toContain('strava_activity_unassigned');
  });
});
