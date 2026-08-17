import type {
  ApplicationInitializationError,
  ApplicationInitializationPhase,
} from "../game-engine/index.ts";
import { PixelButton } from "./game/PixelButton.tsx";

export function GameInitializationScreen({
  phase,
  failure,
  onRetry,
  diagnostic = false,
}: {
  phase: ApplicationInitializationPhase;
  failure: ApplicationInitializationError | null;
  onRetry: () => void;
  diagnostic?: boolean;
}) {
  const showDiagnostics = diagnostic && process.env.NODE_ENV !== "production";
  return (
    <main className="initialization-screen" data-testid="initialization-screen">
      <p className="diagnostic-kicker">AROUND THE A</p>
      <h1>{failure ? "CARTRIDGE ERROR" : "LOADING CARTRIDGE"}</h1>
      <p>{failure?.publicMessage ?? phase.replaceAll("_", " ")}</p>
      {failure && showDiagnostics && failure.diagnosticMessage && (
        <pre>{failure.diagnosticMessage}</pre>
      )}
      {failure && <PixelButton onClick={onRetry}>TRY AGAIN</PixelButton>}
    </main>
  );
}
