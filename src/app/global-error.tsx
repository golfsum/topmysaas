"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <main className="state-page">
          <div className="state-card">
            <p className="eyebrow">TopMySaaS</p>
            <h1>Something went wrong.</h1>
            <p>Try again. A completed Stripe payment will still be recorded.</p>
            <button
              className="button button-primary"
              type="button"
              onClick={retry}
            >
              Reload the board
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
