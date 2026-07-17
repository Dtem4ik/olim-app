import { beforeEach, describe, expect, it } from "vitest";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { EngineStep } from "@/lib/plan/build-plan";
import { type Profile, saveProfile } from "@/lib/plan/profile";
import { fireEvent, renderWithProviders, screen, userEvent } from "@/test/test-utils";

const steps: EngineStep[] = [
  {
    slug: "land-bank",
    section_slug: "banks",
    title: "Счёт в банке",
    stage: "just_landed",
    sort_order: 1,
    cond: { stage: "just_landed" },
  },
  {
    slug: "land-kupat",
    section_slug: "health",
    title: "Больничная касса",
    stage: "just_landed",
    sort_order: 2,
    cond: { stage: "just_landed" },
    warn_rule: { type: "deadline_after_arrival_days", days: 90 },
  },
  {
    slug: "ulpan",
    section_slug: "hebrew",
    title: "Ульпан",
    stage: "first_months",
    sort_order: 1,
    cond: { stage: ["first_months", "settled"] },
  },
];

const pickRadio = (name: string) => screen.getByRole("radio", { name });
const next = () => screen.getByTestId("onboarding-next");

beforeEach(() => window.localStorage.clear());

describe("OnboardingFlow", () => {
  it("walks the quiz and shows a plan matching the answers", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingFlow steps={steps} />);

    await user.click(screen.getByTestId("onboarding-start"));
    await user.click(pickRadio("Только приземлился(лась)"));
    await user.click(next());
    await user.click(pickRadio("Еврей(ка)"));
    await user.click(next());
    await user.click(pickRadio("Россия"));
    await user.click(next());
    await user.click(pickRadio("Еду один(на)"));
    await user.click(next());
    await user.click(pickRadio("Нет"));
    await user.click(next());
    fireEvent.change(screen.getByTestId("onboarding-date"), { target: { value: "2026-07-01" } });
    await user.click(next());
    await user.click(next()); // city optional → finish

    expect(screen.getByTestId("onboarding-preview")).toBeInTheDocument();
    expect(screen.getAllByTestId("plan-step")).toHaveLength(2);
    expect(screen.getByText("Счёт в банке")).toBeInTheDocument();
    // warn_rule surfaces a deadline badge (icon) on that step; the step without a
    // rule has none. Date-agnostic so it doesn't depend on the current day.
    const deadlineRow = screen.getByText("Больничная касса").closest("li");
    const plainRow = screen.getByText("Счёт в банке").closest("li");
    expect(deadlineRow?.querySelector("svg")).toBeInTheDocument();
    expect(plainRow?.querySelector("svg")).toBeNull();
  });

  it("supports back navigation and children-age chips", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingFlow steps={steps} />);

    await user.click(screen.getByTestId("onboarding-start"));
    await user.click(pickRadio("Только приземлился(лась)"));
    await user.click(next());
    // Back from question 2 returns to question 1.
    await user.click(screen.getByTestId("onboarding-back"));
    expect(pickRadio("Только приземлился(лась)")).toBeChecked();

    // Advance to the family question and choose "with children".
    await user.click(next());
    await user.click(pickRadio("Еврей(ка)"));
    await user.click(next());
    await user.click(pickRadio("Россия"));
    await user.click(next());
    await user.click(pickRadio("С детьми"));
    await user.click(next());

    // Age chips: add then remove.
    fireEvent.change(screen.getByTestId("onboarding-age-input"), { target: { value: "7" } });
    await user.click(screen.getByTestId("onboarding-age-add"));
    expect(screen.getByTestId("onboarding-age-chips")).toHaveTextContent("7");
    await user.click(screen.getByRole("button", { name: "Убрать" }));
    expect(screen.queryByTestId("onboarding-age-chips")).not.toBeInTheDocument();
  });

  it("shows an empty preview for a persona with no matching steps, then edits", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OnboardingFlow steps={steps} />);

    // A "preparing" persona matches none of the just-landed steps.
    await user.click(screen.getByTestId("onboarding-start"));
    await user.click(pickRadio("Готовлюсь к репатриации"));
    await user.click(next());
    await user.click(pickRadio("Внук(чка) еврея"));
    await user.click(next());
    await user.click(pickRadio("Россия"));
    await user.click(next());
    await user.click(pickRadio("Еду один(на)"));
    await user.click(next());
    await user.click(pickRadio("Нет"));
    await user.click(next()); // → flight date
    await user.click(next()); // → city
    await user.click(next()); // → finish

    expect(screen.getByText(/пока нет шагов/i)).toBeInTheDocument();

    // Edit answers re-enters the quiz at the first question.
    await user.click(screen.getByTestId("onboarding-edit"));
    expect(screen.getByTestId("onboarding-quiz")).toBeInTheDocument();
  });

  it("hydrates a saved profile into the preview and starts over", async () => {
    const user = userEvent.setup();
    const saved: Profile = {
      version: 1,
      stage: "just_landed",
      basis: "jewish",
      family: "single",
      pet: false,
      arrivalDate: "2026-07-01",
      monthsInCountry: 0,
    };
    saveProfile(saved);

    renderWithProviders(<OnboardingFlow steps={steps} />);
    // useEffect hydrates the saved profile → preview (no intro).
    expect(await screen.findByTestId("onboarding-preview")).toBeInTheDocument();
    expect(screen.getByText("Счёт в банке")).toBeInTheDocument();

    await user.click(screen.getByTestId("onboarding-startover"));
    expect(screen.getByTestId("onboarding-intro")).toBeInTheDocument();
    expect(window.localStorage.getItem("olim.profile.v1")).toBeNull();
  });
});
