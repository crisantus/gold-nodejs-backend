import { escapeHtml, buildEmailTemplate } from "../../src/utils/email/templates/layout.js";
import { afterEach, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { sendEmail } from "../../src/utils/email/sender.js";
__EMAIL_TEST_MOCK__
const initialEnabled = env.EMAIL_ENABLED;
const message = { to: "test@example.com", subject: "Test", text: "Test", html: "<p>Test</p>" };
afterEach(() => {
  env.EMAIL_ENABLED = initialEnabled;
  vi.restoreAllMocks();
});
it("reports disabled sends honestly", async () => {
  env.EMAIL_ENABLED = false;
  expect(await sendEmail(message)).toEqual({ outcome: "skipped" });
});
it("escapes template values", () => {
  expect(escapeHtml('<script>"&')).toBe("&lt;script&gt;&quot;&amp;");
});
__EMAIL_TEST_CASE__

it("escapes dynamic template content and provides a text fallback", () => {
  const content = buildEmailTemplate({
    title: "<script>alert(1)</script>",
    greeting: "Hi <User>",
    paragraphs: ["A & B"],
    button: { label: "Continue", url: "https://example.com/action?token=a&mode=b" },
  });
  expect(content.html).not.toContain("<script>");
  expect(content.html).toContain("&lt;User&gt;");
  expect(content.html).toContain("token=a&amp;mode=b");
  expect(content.text).toContain("https://example.com/action?token=a&mode=b");
  expect(content.subject).toContain(env.EMAIL_BRAND_NAME);
});
