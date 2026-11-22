import { describe, expect, it } from "vitest";

import { parseGoogleIdToken, safeNext } from "@/lib/auth/google-token";

const CLIENT = "client-123.apps.googleusercontent.com";
const NOW = 1_800_000_000;

function token(claims: Record<string, unknown>) {
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.sig`;
}

const valid = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: NOW + 600,
  sub: "1234567890",
  email: "Owner@Gmail.com",
  email_verified: true,
  name: "  Ali Valiyev ",
};

describe("parseGoogleIdToken", () => {
  it("returns a normalized profile for a valid token", () => {
    expect(parseGoogleIdToken(token(valid), CLIENT, NOW)).toEqual({
      sub: "1234567890",
      email: "owner@gmail.com",
      name: "Ali Valiyev",
    });
  });

  it("accepts the short issuer and a string email_verified", () => {
    const t = token({ ...valid, iss: "accounts.google.com", email_verified: "true" });
    expect(parseGoogleIdToken(t, CLIENT, NOW)?.sub).toBe("1234567890");
  });

  it.each([
    ["wrong audience", { aud: "someone-else" }],
    ["wrong issuer", { iss: "https://evil.example" }],
    ["expired", { exp: NOW - 1 }],
    ["unverified email", { email_verified: false }],
    ["missing sub", { sub: "" }],
    ["missing email", { email: undefined }],
  ])("rejects %s", (_label, override) => {
    expect(parseGoogleIdToken(token({ ...valid, ...override }), CLIENT, NOW)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(parseGoogleIdToken("not-a-jwt", CLIENT, NOW)).toBeNull();
    expect(parseGoogleIdToken("a.%%%.c", CLIENT, NOW)).toBeNull();
  });

  it("stores a missing name as null", () => {
    expect(parseGoogleIdToken(token({ ...valid, name: undefined }), CLIENT, NOW)?.name).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows admin paths only", () => {
    expect(safeNext("/admin/orders")).toBe("/admin/orders");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/admin//evil.com")).toBeNull();
    expect(safeNext("https://evil.com/admin/x")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
