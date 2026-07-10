import { type RenderOptions, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import type { ReactElement, ReactNode } from "react";
import messages from "@/messages/ru.json";

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <NextIntlClientProvider
        locale="ru"
        messages={messages}
        timeZone="Asia/Jerusalem"
        now={new Date("2026-07-10T09:00:00")}
      >
        {children}
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
