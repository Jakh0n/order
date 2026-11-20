import { describe, expect, it } from "vitest";

import {
  attributionFromRequest,
  badgeHref,
  decodeAttribution,
  encodeAttribution,
} from "@/lib/attribution";

const params = (q: string) => new URLSearchParams(q);

describe("attributionFromRequest", () => {
  it("utm_source wins over ref", () => {
    expect(
      attributionFromRequest(params("utm_source=IG&ref=badge&utm_medium=bio"), null, "tezda.app"),
    ).toEqual({ source: "ig", medium: "bio", campaign: undefined, referrer: undefined });
  });
  it("ref when there is no utm_source", () => {
    expect(attributionFromRequest(params("ref=badge&utm_campaign=bahor-kafe"), null, "tezda.app"))
      .toMatchObject({ source: "badge", campaign: "bahor-kafe" });
  });
  it("records only external referrers (www ignored)", () => {
    expect(attributionFromRequest(params(""), "https://www.tezda.app/uz", "tezda.app")).toBeNull();
    expect(attributionFromRequest(params(""), "https://www.google.com/search?q=x", "tezda.app"))
      .toMatchObject({ referrer: "google.com" });
  });
  it("direct visit and broken referer → null", () => {
    expect(attributionFromRequest(params(""), null, "tezda.app")).toBeNull();
    expect(attributionFromRequest(params(""), "not a url", "tezda.app")).toBeNull();
  });
  it("cleans user input", () => {
    const a = attributionFromRequest(params(`utm_source=<script>${"x".repeat(100)}`), null, "t.app");
    expect(a?.source).toMatch(/^[a-z0-9._-]{1,64}$/);
  });
});

describe("cookie round-trip", () => {
  it("encode → decode", () => {
    const value = encodeAttribution({ source: "ig", campaign: "launch", referrer: "t.me" });
    expect(decodeAttribution(value)).toEqual({
      signupSource: "ig",
      signupMedium: null,
      signupCampaign: "launch",
      signupReferrer: "t.me",
    });
  });
  it("edited or missing cookie is re-cleaned", () => {
    expect(decodeAttribution("s=EVIL%20<b>")).toMatchObject({ signupSource: "evilb" });
    expect(decodeAttribution(undefined).signupSource).toBeNull();
  });
  it("badge link", () => {
    expect(badgeHref("bahor-kafe")).toBe("/?ref=badge&utm_campaign=bahor-kafe");
  });
});
