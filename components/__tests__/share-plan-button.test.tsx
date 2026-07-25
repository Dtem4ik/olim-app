import { afterEach, describe, expect, it, vi } from "vitest";
import { SharePlanButton } from "@/components/plan/share-plan-button";
import type { Profile } from "@/lib/plan/profile";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/test-utils";

// Facade spy — assert the launch event `plan_shared` fires on a successful share
// (Phase 9d wiring sanity). The server action + share/clipboard are mocked so
// the test is offline and deterministic.
const captureSpy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ capture: captureSpy }));

const sharePlan = vi.hoisted(() => vi.fn());
vi.mock("@/app/plan/actions", () => ({ sharePlan }));
vi.mock("@/lib/share/created-shares", () => ({ recordCreatedShare: vi.fn() }));

const profile: Profile = {
  version: 1,
  stage: "just_landed",
  basis: "jewish",
  family: "single",
  pet: false,
};

afterEach(() => {
  captureSpy.mockClear();
  sharePlan.mockReset();
});

describe("SharePlanButton", () => {
  it("emits plan_shared with the slug + done count on a successful share", async () => {
    sharePlan.mockResolvedValue({ ok: true, slug: "abc123def456" });
    // No Web Share API → clipboard fallback path.
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    renderWithProviders(<SharePlanButton answers={profile} done={["a", "b"]} />);
    await userEvent.click(screen.getByTestId("plan-share"));

    await waitFor(() =>
      expect(captureSpy).toHaveBeenCalledWith("plan_shared", {
        slug: "abc123def456",
        done: 2,
      }),
    );
  });

  it("does NOT emit plan_shared when the share fails", async () => {
    sharePlan.mockResolvedValue({ ok: false });

    renderWithProviders(<SharePlanButton answers={profile} done={[]} />);
    await userEvent.click(screen.getByTestId("plan-share"));

    await waitFor(() => expect(sharePlan).toHaveBeenCalled());
    expect(captureSpy).not.toHaveBeenCalledWith("plan_shared", expect.anything());
  });
});
