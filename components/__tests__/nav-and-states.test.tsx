import { Inbox } from "lucide-react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/empty-state";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    renderWithProviders(
      <EmptyState
        icon={Inbox}
        title="Пусто"
        description="Пройдите опрос"
        action={<Button size="sm">Начать</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Пусто" })).toBeInTheDocument();
    expect(screen.getByText("Пройдите опрос")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Начать" })).toBeInTheDocument();
  });
});

describe("SiteBottomNav", () => {
  it("renders a primary navigation landmark and marks the active tab", () => {
    renderWithProviders(<SiteBottomNav activeHref="/" />);
    expect(screen.getByRole("navigation", { name: "Основная навигация" })).toBeInTheDocument();

    const home = screen.getByRole("link", { name: "Главная" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "План" })).not.toHaveAttribute("aria-current");
  });
});

describe("ThemeToggle", () => {
  it("renders an accessible toggle button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(button).toBeEnabled();
  });
});
