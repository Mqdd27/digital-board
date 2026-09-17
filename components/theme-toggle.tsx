"use client";

import { Moon, Sun } from "lucide-react";

const YEAR = 60 * 60 * 24 * 365;

export function ThemeToggle() {
  return (
    <button
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        // Read back by the root layout on the next request, so SSR renders the
        // right theme. Swap for a Server Action if this ever needs HttpOnly.
        document.cookie = `theme=${dark ? "dark" : "light"};path=/;max-age=${YEAR};samesite=lax`;
      }}
      aria-label="Toggle theme"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
