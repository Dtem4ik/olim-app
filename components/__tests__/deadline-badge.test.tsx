import { describe, expect, it } from "vitest";
import { DeadlineBadge } from "@/components/deadline-badge";
import { renderWithProviders, screen } from "@/test/test-utils";

const now = new Date("2026-07-10T09:00:00");
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

describe("DeadlineBadge", () => {
  it("shows an overdue label for past dates", () => {
    renderWithProviders(<DeadlineBadge due={daysFromNow(-2)} now={now} />);
    expect(screen.getByText(/просрочено на 2 дня/i)).toBeInTheDocument();
  });

  it("shows 'today' for the current day", () => {
    renderWithProviders(<DeadlineBadge due={now} now={now} />);
    expect(screen.getByText("Сегодня")).toBeInTheDocument();
  });

  it("shows a countdown for soon deadlines", () => {
    renderWithProviders(<DeadlineBadge due={daysFromNow(4)} now={now} />);
    expect(screen.getByText(/осталось 4 дня/i)).toBeInTheDocument();
  });

  it("shows a formatted date for far deadlines", () => {
    renderWithProviders(<DeadlineBadge due={daysFromNow(40)} now={now} />);
    expect(screen.getByText(/до /i)).toBeInTheDocument();
  });
});
