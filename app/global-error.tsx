"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="initialization-screen">
          <p className="diagnostic-kicker">AROUND THE A</p>
          <h1>APPLICATION ERROR</h1>
          <p>The application could not render safely.</p>
          <button type="button" onClick={reset}>
            RETRY
          </button>
        </main>
      </body>
    </html>
  );
}
