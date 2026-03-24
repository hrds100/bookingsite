// ParticleWalletCreator -- Creates a Particle wallet using auth-core directly (no React wrapper)
// This avoids AuthCoreContextProvider which crashes in our Vite environment.
// Exports a function, not a React component.
//
// IMPORTANT: This file is dynamically imported by particleIframe.ts.
// @particle-network/auth-core and @particle-network/authkit MUST be installed
// but are NOT in the main bundle -- they are lazy-loaded only when wallet creation is triggered.

import { particleAuth, connect as particleConnect } from "@particle-network/auth-core";
import { bsc } from "@particle-network/authkit/chains";
import { PARTICLE_CONFIG } from "@/lib/particle";

let initialized = false;

function ensureInit() {
  if (initialized) return;
  try {
    particleAuth.init({
      projectId: PARTICLE_CONFIG.projectId,
      clientKey: PARTICLE_CONFIG.clientKey,
      appId: PARTICLE_CONFIG.appId,
      chains: [bsc],
    });
    initialized = true;
    console.log("[Particle] auth-core initialized");
  } catch (err) {
    if ((err as Error)?.message?.includes("already")) {
      initialized = true;
    } else {
      throw err;
    }
  }
}

/**
 * Create a Particle wallet using JWT authentication.
 * Uses auth-core directly -- no React components, no AuthCoreContextProvider.
 *
 * @param jwt - Signed JWT from particle-generate-jwt Edge Function
 * @returns Wallet address (0x...)
 */
export async function createWalletWithJWT(jwt: string): Promise<string> {
  ensureInit();

  const userInfo = await particleConnect({
    provider: "jwt" as never,
    thirdpartyCode: jwt,
  });

  // Primary: get the actual signing address from the EVM provider
  try {
    const accounts = await particleAuth.ethereum.request({ method: "eth_accounts" });
    if (Array.isArray(accounts) && accounts[0]) {
      console.log("[Particle] Wallet address from eth_accounts:", accounts[0]);
      return accounts[0] as string;
    }
  } catch (e) {
    console.log("[Particle] eth_accounts failed, falling back to userInfo.wallets:", e);
  }

  // Fallback: extract from the particleConnect response wallets array
  const evmWallet = (userInfo as any)?.wallets?.find(
    (w: any) => w.chain_name === "evm_chain" || w.chain_name === "bsc",
  );
  const address = evmWallet?.public_address || null;

  if (address) {
    console.log("[Particle] Wallet address from userInfo.wallets:", address);
    return address;
  }

  throw new Error("Wallet created but no EVM address found in response");
}

export default { createWalletWithJWT };
