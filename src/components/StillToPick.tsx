import type { Member } from "@/lib/pickem";

interface Props {
  members: Member[];
  /** picks made per member id for the week in question */
  counts: Map<string, number>;
  total: number;
  locked: boolean;
  label: string;
}

/** Names the members who haven't submitted a full set of picks. */
export default function StillToPick({ members, counts, total, locked, label }: Props) {
  const missing = members
    .map((m) => ({ m, n: counts.get(m.id) ?? 0 }))
    .filter((x) => x.n < total)
    .sort((a, b) => a.n - b.n || a.m.display_name.localeCompare(b.m.display_name));
  if (!members.length) return null;
  return (
    <div className={`panel px-4 py-3 ${missing.length ? "border-blood/40" : "border-gold/40"}`}>
      <p className={`kicker ${missing.length ? "text-blood" : ""}`}>
        {missing.length ? (locked ? `Missed ${label}` : `Still to pick · ${label}`) : `Everyone is in · ${label}`}
      </p>
      {missing.length > 0 ? (
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {missing.map(({ m, n }) => (
            <span key={m.id}>
              <span className="font-head font-semibold">{m.display_name}</span>
              <span className="font-mono-num ml-1 text-xs text-cream-dim">
                {n}/{total}
              </span>
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-cream-dim">All {members.length} members have submitted every pick.</p>
      )}
    </div>
  );
}
