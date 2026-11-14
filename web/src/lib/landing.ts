import type { PortalKey } from "@consumer-rights/contracts";

/** Where each portal opens after sign-in. Shared by the browser and the server. */
export const LANDING_PATHS: Record<PortalKey, string> = {
  consumer: "/my-cases", business: "/business/overview",
  woreda: "/woreda/dashboard", subcity: "/subcity/dashboard", bureau: "/bureau/dashboard"
};
