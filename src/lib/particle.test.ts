import { describe, it, expect } from "vitest";
import { derivedPassword, PARTICLE_LEGACY_CONFIG } from "./particle";

describe("derivedPassword", () => {
  it("returns deterministic output for a given UUID", () => {
    const uuid = "abcdefghij-1234-5678-9abc-klmnop";
    const result = derivedPassword(uuid);
    expect(result).toBe(derivedPassword(uuid));
  });

  it("follows the formula: first 10 chars + _NFsTay2! + last 6 chars", () => {
    const uuid = "abcdefghij-1234-5678-9abc-klmnop";
    const expected = uuid.slice(0, 10) + "_NFsTay2!" + uuid.slice(-6);
    expect(derivedPassword(uuid)).toBe(expected);
  });

  it("produces different passwords for different UUIDs", () => {
    const a = derivedPassword("uuid-aaaa-bbbb-cccc-dddd-eeee");
    const b = derivedPassword("uuid-xxxx-yyyy-zzzz-1111-2222");
    expect(a).not.toBe(b);
  });
});

describe("PARTICLE_LEGACY_CONFIG", () => {
  it("has all required fields", () => {
    expect(PARTICLE_LEGACY_CONFIG.projectId).toBeTruthy();
    expect(PARTICLE_LEGACY_CONFIG.clientKey).toBeTruthy();
    expect(PARTICLE_LEGACY_CONFIG.appId).toBeTruthy();
  });

  it("matches hub.nfstay.com config exactly", () => {
    expect(PARTICLE_LEGACY_CONFIG.projectId).toBe("4f8aca10-0c7e-4617-bfff-7ccb5269f365");
    expect(PARTICLE_LEGACY_CONFIG.clientKey).toBe("cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D");
    expect(PARTICLE_LEGACY_CONFIG.appId).toBe("d80e484f-a690-4f0b-80a8-d1a1d0264b90");
  });
});
