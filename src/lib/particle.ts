// Particle Network configuration for NFStay social login
//
// LEGACY project — shared with hub.nfstay.com and app.nfstay.com
// Same Google/Apple account → same wallet recovered across all NFStay domains.
// This is how cross-domain single sign-on works.

export const PARTICLE_LEGACY_CONFIG = {
  projectId: "4f8aca10-0c7e-4617-bfff-7ccb5269f365",
  clientKey: "cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D",
  appId: "d80e484f-a690-4f0b-80a8-d1a1d0264b90",
};

// Derive a deterministic password from Particle UUID
// Same logic as marketplace10 — ensures cross-domain login compatibility
export function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + "_NFsTay2!" + uuid.slice(-6);
}
