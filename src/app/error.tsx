"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page">
      <div className="state-card">
        <p className="eyebrow">Connection interrupted</p>
        <h1>The board could not load.</h1>
        <p>Your payment status is safe. Try loading the board again.</p>
        <button className="button button-primary" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    </main>
  );
}
