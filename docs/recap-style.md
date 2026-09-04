# The Tuesday Morning Paper — house style

The weekly recap for the Adams Hall Fantasy League. Trigger: Jonathan says
"Write AHFL newsletter" (Monday night or Tuesday). Then: run
`node scripts/recap-pack.mjs <year> <week>` (pull first if the nightly archive has
committed), query Supabase for pick'em results and who never submitted, write the
draft, insert it into the `recaps` table with `status = 'draft'` via the SQL editor
(dollar-quote the body), and tell Jonathan the edit URL `/season/recap/edit/?id=N`.
He edits and publishes by noon Tuesday.

## Shape
- ~1,500 words. Markdown-lite: `## ` headings, blank lines between paragraphs, `**bold**`.
- Sections: `## Intro` (league-wide state of play, 150–200 words), then one
  `## <Away> at <Home>` section per matchup (five in the regular season), each
  ~230–260 words, then a short `## Wuss Report` closer naming who didn't submit picks.
- Headline: short, mean, specific to the week. Teaser: one line for the front-page card.

## Voice
- Incredibly NSFW, crude, profane, and MEAN. Personal. Roast NFL players hard. Roast
  league members harder, by name, using receipts: bench points, waiver whiffs, who the
  league picked against, who forgot to pick, their history on this site (Hall of
  Shame years, titles, feud records, luck index, seed, when they joined). No slurs. No
  invented private facts. No accusations of crimes.
- Roles: Ethan Connell is the league COMMISSIONER. Jonathan Walberg BUILT THE WEBSITE
  (and is the site admin who edits/publishes). Never call Jonathan the commissioner.
- Every NFL player mentioned gets a nickname in quotes between first and last name,
  and it must be a real pun on the name: Bijan “Slob on my Knob” Robinson, Puka “Nut
  in ya” Nacua, Jahmyr “Give ’em the” Gibbs, Ja’Marr “Deez Nuts” Chase, De’Von
  “Achin’ Balls” Achane, Amon-Ra “Sun God of Sloppy Toppy” St. Brown, Saquon
  “Bark-Lay Pipe” Barkley, Justin “Jeff Yourself” Jefferson, CeeDee “Seedy Motel”
  Lamb, Josh “Jacobs Ladder to Heaven” Jacobs. Vary them week to week.
- Jonathan may add more personal attacks in the editor, but the draft should already
  be personal and vicious on its own.

## Facts
- Use only what's in the data pack: scores, starters, bench, waivers, standings.
- Numbers to one decimal. Winner named in each section's first sentence.
