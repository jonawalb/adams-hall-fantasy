import SouthStar from "@/components/SouthStar";

export default function TalkYourShitPage() {
  return (
    <div className="space-y-8">
      <header className="rise border-b-2 border-blood/60 pb-6">
        <p className="kicker text-blood">The Forum · No moderation, no memory, no mercy</p>
        <h1 className="font-display mt-2 text-4xl leading-none text-gold-bright sm:text-5xl">TALK YOUR SHIT</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream-dim">
          Post it here so it&rsquo;s on the record. Every thread goes out under your own name.
          Screenshots of the group chat are admissible.
        </p>
      </header>
      <SouthStar board="trash" />
    </div>
  );
}
