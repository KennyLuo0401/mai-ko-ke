/**
 * Analysis adapter selection + retry / adapter 選擇與重試
 *
 * BUILD_PLAN §9: external API calls use at most three attempts with
 * exponential backoff. Malformed output is a failure, never data we continue
 * with, so schema errors are NOT retried.
 */

import type { AnalysisAdapter } from "@/lib/contracts";
import { fixtureAdapter } from "@/lib/ai/fixtureAdapter";
import { openAiAdapter, OpenAiError } from "@/lib/ai/openaiAdapter";
import { SchemaError } from "@/lib/ai/schemas";

export type AdapterName = "fixture" | "openai";

export function selectedAdapterName(): AdapterName {
  return process.env.MKK_ANALYSIS_ADAPTER === "openai" ? "openai" : "fixture";
}

export function getAnalysisAdapter(): AnalysisAdapter {
  return selectedAdapterName() === "openai" ? openAiAdapter : fixtureAdapter;
}

export const MAX_ATTEMPTS = 3;

function isRetryable(err: unknown): boolean {
  if (err instanceof SchemaError) return false; // bad shape won't fix itself
  if (err instanceof OpenAiError) return err.retryable;
  return true;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` with at most three total attempts and exponential backoff.
 * `sleep` is injectable so retry behaviour can be tested deterministically.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    attempts?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = opts.attempts ?? MAX_ATTEMPTS;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const sleep = opts.sleep ?? wait;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
