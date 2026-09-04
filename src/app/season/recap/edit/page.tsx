import RecapEditor from "@/components/RecapEditor";
export default function RecapEditPage() {
  return (
    <div className="space-y-6">
      <header className="rise">
        <p className="kicker">Commissioner&rsquo;s desk</p>
        <h1 className="font-display mt-2 text-3xl text-gold-bright sm:text-4xl">EDIT THE RECAP</h1>
      </header>
      <RecapEditor />
    </div>
  );
}
