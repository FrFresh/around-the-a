import { createFoundation } from "./create-foundation.ts";

// A single composition root prevents components from constructing their own
// manager graphs. Import and await this promise at the application boundary.
export const foundation = createFoundation();
