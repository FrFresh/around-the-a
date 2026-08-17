export class FuturePhaseError extends Error {
  constructor(system: string, phase: number) {
    super(`${system} behavior is scheduled for Phase ${phase}.`);
    this.name = "FuturePhaseError";
  }
}
