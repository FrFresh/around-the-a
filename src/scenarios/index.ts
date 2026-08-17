import type { Scenario } from "../game/types.ts";
import { fivePoints } from "./five-points.ts";

export { fivePoints };
export const scenarios: Record<string, Scenario> = { [fivePoints.id]: fivePoints };
