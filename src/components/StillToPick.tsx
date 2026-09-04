import type { Member } from "@/lib/pickem";

export interface Owner {
  ownerId: string;
  name: string;
}

interface Props {
  owners: Owner[]; // the full league roster, from ESPN
  members: Member[]; // site accounts (espn_owner_id links them to owners)
  counts: Map<string, number>; // picks submitted this week, by member id
  locked: boolean;
}

/** Calls out every league member who hasn't submitted picks for the week. */
export default function GambleYouWuss({ owners, members, counts, locked }: Props) {
  const submitted = new Set(
    members.filter((m) => m.espn_owner_id && (counts.get(m.id) ?? 0) > 0).map((m) => m.espn_owner_id as string),
  );
  const wusses = owners.filter((o) => !submitted.has(o.ownerId));
  return (
    <div className={`panel px-4 py-3 ${wusses.length ? "border-blood/50" : "border-gold/40"}`}>
      <p className={`kicker ${wusses.length ? "text-blood" : ""}`}>Pick, you fucking wuss</p>
      {wusses.length ? (
        <>
          <p className="font-head mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-lg font-semibold">
            {wusses.map((o) => (
              <span key={o.ownerId}>{o.name}</span>
            ))}
          </p>
          <p className="mt-1 text-xs text-cream-dim">
            {locked ? "Too late. It's on the record." : `${wusses.length === 1 ? "Has" : "Have"} not picked. Everyone can see this.`}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-cream-dim">Everyone&rsquo;s in. Disgusting display of responsibility.</p>
      )}
    </div>
  );
}
