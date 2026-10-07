import { ApiError } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableError } from "@/domain/errors";
import { firstModelThatAnswers } from "./gemini-receipt-extractor";

const LIMITS = { perModelMs: 40, totalMs: 100, minimumMs: 10 };

/** Behaves like a model that never answers: gives up when its time slice ends. */
function hang(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(Object.assign(new Error("This operation was aborted"), { name: "AbortError" })), timeoutMs),
  );
}

describe("firstModelThatAnswers", () => {
  // Fake timers (Date.now included) keep the time budget exact, however busy the machine is.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("moves on when a model is overloaded", async () => {
    const tried: string[] = [];
    const answer = await firstModelThatAnswers(
      ["flash", "lite"],
      async (model) => {
        tried.push(model);
        if (model === "flash") throw new ApiError({ message: "high demand", status: 503 });
        return "read";
      },
      LIMITS,
    );
    expect(answer).toEqual({ model: "lite", result: "read" });
    expect(tried).toEqual(["flash", "lite"]);
  });

  it("moves on when a model hangs, giving each one a capped slice of time", async () => {
    const slices: number[] = [];
    const scan = firstModelThatAnswers(
      ["flash", "lite"],
      (model, timeoutMs) => {
        slices.push(timeoutMs);
        return model === "flash" ? hang(timeoutMs) : Promise.resolve("read");
      },
      LIMITS,
    );
    await vi.advanceTimersByTimeAsync(40);
    expect((await scan).model).toBe("lite");
    expect(slices).toEqual([40, 40]);
  });

  it("reports the service as busy once the time budget is spent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tried: string[] = [];
    const scan = firstModelThatAnswers(
      ["a", "b", "c", "d"],
      (model, timeoutMs) => {
        tried.push(model);
        return hang(timeoutMs);
      },
      LIMITS,
    );
    const busy = expect(scan).rejects.toBeInstanceOf(ServiceUnavailableError);
    await vi.advanceTimersByTimeAsync(100);
    await busy;
    // 40 + 40 ms used, 20 ms left for the third, nothing worth starting a fourth.
    expect(tried).toEqual(["a", "b", "c"]);
  });

  it("stops at an error another model wouldn't fix", async () => {
    const tried: string[] = [];
    const scan = firstModelThatAnswers(
      ["flash", "lite"],
      async (model) => {
        tried.push(model);
        throw new ApiError({ message: "bad request", status: 400 });
      },
      LIMITS,
    );
    await expect(scan).rejects.toBeInstanceOf(ApiError);
    expect(tried).toEqual(["flash"]);
  });
});
