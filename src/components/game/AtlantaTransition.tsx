import { PixelButton } from "./PixelButton.tsx";

interface AtlantaTransitionProps {
  mode?: "intro" | "next";
  text?: string;
  onContinue(): void;
}

export function AtlantaTransition({
  mode = "intro",
  text,
  onContinue,
}: AtlantaTransitionProps) {
  const isNext = mode === "next";
  return (
    <main
      className={`atlanta-transition transition-${mode}`}
      data-testid={`atlanta-${mode}`}
    >
      <div className="transition-map" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <section>
        <p className="screen-kicker">
          {isNext ? "NEXT STOP" : "ATLANTA · NOW BOARDING"}
        </p>
        <h1>
          {isNext ? (
            <>
              PONCE CITY
              <br />
              MARKET
            </>
          ) : (
            <>
              THE CITY
              <br />
              IS CHANGING
            </>
          )}
        </h1>
        <p>
          {text ??
            (isNext
              ? "Your next skill is ASSESS. Learn when an AI answer deserves a second look."
              : "AI is becoming part of everyday life. Learn to use it without letting it use you.")}
        </p>
        {isNext && <div className="coming-next">ASSESS · COMING NEXT</div>}
        <PixelButton onClick={onContinue}>
          {isNext ? "RETURN TO TITLE" : "RIDE TO FIVE POINTS"}
        </PixelButton>
      </section>
    </main>
  );
}
