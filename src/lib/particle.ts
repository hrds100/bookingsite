// Particle Network configuration for nfstay social login
//
// LEGACY project — shared with hub.nfstay.com and app.nfstay.com
// Same Google/Apple account → same wallet recovered across all nfstay domains.
// This is how cross-domain single sign-on works.

import { ParticleNetwork } from "@particle-network/auth";

export const PARTICLE_LEGACY_CONFIG = {
  projectId: "4f8aca10-0c7e-4617-bfff-7ccb5269f365",
  clientKey: "cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D",
  appId: "d80e484f-a690-4f0b-80a8-d1a1d0264b90",
};

// Initialize with legacy config (same as hub.nfstay.com — cross-domain wallet recovery)
export const particle = new ParticleNetwork({
  ...PARTICLE_LEGACY_CONFIG,
  chainName: "Ethereum" as never,
  chainId: 1,
});

export type SocialType = "google" | "apple" | "twitter" | "facebook";

// Trigger social OAuth login — opens Particle popup/redirect
export async function socialLogin(socialType: SocialType) {
  const userInfo = await particle.auth.login({
    preferredAuthType: socialType,
    socialLoginPrompt: "select_account",
  });
  return userInfo;
}

// Check if user is already logged in to Particle
export function isParticleLoggedIn(): boolean {
  return particle.auth.isLogin();
}

// Get current Particle user info (if logged in)
export function getParticleUserInfo() {
  return particle.auth.getUserInfo();
}

// Logout from Particle
export async function particleLogout() {
  if (particle.auth.isLogin()) {
    await particle.auth.logout();
  }
}

// Derive a deterministic password from Particle UUID
// Same logic as marketplace10 — ensures cross-domain login compatibility
export function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + "_NFsTay2!" + uuid.slice(-6);
}
