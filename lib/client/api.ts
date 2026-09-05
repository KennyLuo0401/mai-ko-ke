"use client";

/**
 * Client data layer / 前端資料串接
 *
 * S1 polls the authorized RoomView and discards any view older than the one
 * already rendered (BUILD_PLAN §19). Supabase Realtime replaces the polling
 * loop later: on a change notification, re-fetch the same RoomView. Nothing
 * else in the UI has to change.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ApiErrorCode, RoomView } from "@/lib/contracts";

export class ApiCallError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiCallError";
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: init?.signal,
    cache: "no-store",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiCallError({
      code: "internal_error",
      message: "Malformed server response",
      retryable: true,
    });
  }

  const body = payload as { data?: T; error?: ApiError };
  if (!response.ok || body.error) {
    throw new ApiCallError(
      body.error ?? {
        code: "internal_error",
        message: "Request failed",
        retryable: true,
      },
    );
  }
  return body.data as T;
}

const POLL_INTERVAL_MS = 1200;

/**
 * Subscribe to a room. Returns the newest authorized view; `apply` lets a
 * mutation's own response update the UI immediately without waiting for a poll.
 */
export function useRoomView(roomId: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<ApiCallError | null>(null);
  const versionRef = useRef(0);

  // Ignore any view older than what is already on screen.
  const apply = useCallback((next: RoomView) => {
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    setView(next);
    setError(null);
  }, []);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        apply(await apiFetch<RoomView>(`/api/rooms/${roomId}`, { signal }));
      } catch (err) {
        if (err instanceof ApiCallError) setError(err);
      }
    },
    [roomId, apply],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      await refresh(controller.signal);
      if (!controller.signal.aborted) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    void tick();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh]);

  return { view, error, refresh, apply };
}
