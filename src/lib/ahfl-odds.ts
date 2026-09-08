// AHFL Sportsbook: fake, deterministic moneylines for the one matchup a week
// that involves Bitch Boy. The book is never wrong and never kind.

/** David Roulley's ESPN owner GUID (display name "Bitch Boy" via OWNER_NAME_OVERRIDES). */
export const BITCH_BOY_ID = "{DD52DE43-FADF-409D-809E-6E6707F0216F}";

export function isBitchBoy(ownerId: string, owner?: string): boolean {
  return ownerId.toUpperCase() === BITCH_BOY_ID || owner === "Bitch Boy";
}

const LINES = [
  "Line opened at +900. Then he set his lineup.",
  "Sharp money came in on the opponent. It was Bitch Boy's mom.",
  "The book is paying out opponent bets early. We're not waiting.",
  "Bitch Boy to win: long shot. Bitch Boy to blame the refs: −50000.",
  "Odds adjusted after Bitch Boy was spotted researching a kicker on Thursday.",
  "Same odds as the Jets winning the Super Bowl, except the Jets have a chance.",
  "We asked Vegas for a second opinion. Vegas laughed.",
  "Every model we ran picked the opponent. One of them was a Magic 8-Ball.",
  "The book would post a live line, but nobody has ever asked.",
  "Odds moved after Bitch Boy asked what a bye week is.",
  "You could parlay every other underdog this week and it still pays less than this.",
  "Reigning Hall of Shame champion. Defending the crown.",
  "Action suspended. Not for integrity reasons. Out of pity.",
  "His waiver claims have a better hit rate than his lineups, and his waiver claims are 0-for-the-season.",
  "Line frozen: the book ran out of digits.",
  "Bitch Boy has the same odds as a kicker leading the league in receiving.",
  "Prop of the week: Bitch Boy leaves a starter on bye, −900.",
];

export interface AhflLine {
  book: string;
  /** Opponent's moneyline, e.g. "−12500". */
  favorite: string;
  /** Bitch Boy's moneyline, e.g. "+4800". */
  underdog: string;
  note: string;
}

/** Odds get more absurd as the season goes on; same input, same output, so nothing changes on reload. */
export function ahflLine(week: number): AhflLine {
  const w = Math.max(1, week);
  const fav = 10000 + 2500 * w + ((w * 7919) % 900);
  const dog = 3900 + 900 * w + ((w * 104729) % 700);
  return {
    book: "AHFL Sportsbook",
    favorite: `−${fav}`,
    underdog: `+${dog}`,
    note: LINES[(w - 1) % LINES.length],
  };
}
