import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, withRetry } from "@/lib/ai";
import { SchemaError } from "@/lib/ai/schemas";
import { OpenAiError } from "@/lib/ai/openaiAdapter";

/** Retry behaviour is tested deterministically — no real timers, no network. */
const noSleep = async () => {};

describe("withRetry", () => {
  it("returns the first successful result without retrying", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return "ok";
      },
      { sleep: noSleep },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries transient failures up to three total attempts", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new OpenAiError("boom", true);
        },
        { sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(OpenAiError);
    expect(calls).toBe(MAX_ATTEMPTS);
    expect(calls).toBe(3);
  });

  it("succeeds on a later attempt", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new OpenAiError("flaky", true);
        return "recovered";
      },
      { sleep: noSleep },
    );
    expect(result).toBe("recovered");
    expect(calls).toBe(3);
  });

  it("does not retry a malformed-output failure", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new SchemaError("bad shape");
        },
        { sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(SchemaError);
    expect(calls).toBe(1);
  });

  it("does not retry a non-retryable provider failure", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new OpenAiError("bad request", false);
        },
        { sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(OpenAiError);
    expect(calls).toBe(1);
  });

  it("backs off with growing delays", async () => {
    const delays: number[] = [];
    await expect(
      withRetry(
        async () => {
          throw new OpenAiError("boom", true);
        },
        {
          baseDelayMs: 100,
          sleep: async (ms) => {
            delays.push(ms);
          },
        },
      ),
    ).rejects.toBeTruthy();
    expect(delays).toEqual([100, 200]);
  });
});
