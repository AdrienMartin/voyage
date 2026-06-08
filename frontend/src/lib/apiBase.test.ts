import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./apiBase";

describe("resolveApiBaseUrl", () => {
  it("falls back to the local backend when the environment variable is absent", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("http://localhost:3000");
  });

  it("falls back to the local backend when the environment variable is empty", () => {
    expect(resolveApiBaseUrl("   ")).toBe("http://localhost:3000");
  });

  it("removes trailing slashes from the configured API base URL", () => {
    expect(resolveApiBaseUrl("https://voyage-api.vercel.app///")).toBe(
      "https://voyage-api.vercel.app",
    );
  });
});

