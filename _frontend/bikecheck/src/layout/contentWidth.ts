// How wide the app runs in a browser. One phone-and-a-half: the cards were drawn for a
// phone, and past this a photo card or a progress bar stops reading as one thing. The
// header, the page and the tab bar share it, so the title stays over the content.
export const CONTENT_MAX_WIDTH = "44rem";

// The tab bar and the pinned bars keep the phone's inset inside the column.
export const BAR_WIDTH = `min(92%, calc(${CONTENT_MAX_WIDTH} - 2rem))`;
