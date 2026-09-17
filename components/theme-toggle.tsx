"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  return (
    <button
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        localStorage.theme = dark ? "dark" : "light";
      }}
      aria-label="Toggle theme"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
