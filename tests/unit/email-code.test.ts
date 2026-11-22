import { describe, expect, it } from "vitest";

import { codeEmail, normalizeCode } from "@/lib/email/code-email";

describe("normalizeCode", () => {
  it.each([
    ["123456", "123456"],
    [" 123 456 ", "123456"],
    ["123-456", "123456"],
    ["000042", "000042"],
  ])("accepts %j", (input, expected) => {
    expect(normalizeCode(input)).toBe(expected);
  });

  it.each(["12345", "1234567", "12a456", "", null, 123456])("rejects %j", (input) => {
    expect(normalizeCode(input)).toBeNull();
  });
});

describe("codeEmail", () => {
  const texts = {
    subject: "123456 is your code",
    heading: "Confirm <email>",
    intro: "Enter this code:",
    expires: "10 minutes",
    ignore: "Ignore if not you",
  };

  it("puts the code in both html and text", () => {
    const email = codeEmail("123456", texts, "Tezda");
    expect(email.subject).toBe("123456 is your code");
    expect(email.text).toContain("123456");
    expect(email.html).toContain("123456");
  });

  it("escapes HTML in texts", () => {
    const email = codeEmail("123456", texts, "Tezda");
    expect(email.html).toContain("Confirm &lt;email&gt;");
    expect(email.html).not.toContain("<email>");
  });
});
