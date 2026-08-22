import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-card">
        <p className="eyebrow">404</p>
        <h1>This spot does not exist.</h1>
        <p>The live leaderboard is waiting back on the home page.</p>
        <Link className="button button-primary" href="/">
          View the Top 5
        </Link>
      </div>
    </main>
  );
}
