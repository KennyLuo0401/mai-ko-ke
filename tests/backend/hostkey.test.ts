import { afterEach, describe, expect, it } from "vitest";
import { assertMayCreateRoom, hostKeyRequired } from "@/lib/server/hostKey";

/**
 * Opening a room is gated; joining is not. Every room costs two model calls, so
 * a shared URL must not let a stranger spend the owner's budget.
 */

const original = process.env.MKK_HOST_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.MKK_HOST_KEY;
  else process.env.MKK_HOST_KEY = original;
});

describe("host key", () => {
  it("is disabled when no key is configured, so local dev stays frictionless", () => {
    delete process.env.MKK_HOST_KEY;
    expect(hostKeyRequired()).toBe(false);
    expect(() => assertMayCreateRoom(undefined)).not.toThrow();
    expect(() => assertMayCreateRoom("anything")).not.toThrow();
  });

  it("accepts the configured key", () => {
    process.env.MKK_HOST_KEY = "let-me-host";
    expect(hostKeyRequired()).toBe(true);
    expect(() => assertMayCreateRoom("let-me-host")).not.toThrow();
    expect(() => assertMayCreateRoom("  let-me-host  ")).not.toThrow();
  });

  it("refuses everything else", () => {
    process.env.MKK_HOST_KEY = "let-me-host";
    for (const attempt of [undefined, null, "", "wrong", "let-me-hos", "let-me-hostx", 123, {}]) {
      expect(() => assertMayCreateRoom(attempt), String(attempt)).toThrowError(
        expect.objectContaining({ code: "host_key_required" }),
      );
    }
  });

  it("does not leak the key through the length of a comparison", () => {
    // A wrong key of the right length and a wrong key of the wrong length must
    // both simply fail; the compare itself is constant time.
    process.env.MKK_HOST_KEY = "abcdefgh";
    expect(() => assertMayCreateRoom("abcdefgx")).toThrow();
    expect(() => assertMayCreateRoom("a")).toThrow();
  });
});
