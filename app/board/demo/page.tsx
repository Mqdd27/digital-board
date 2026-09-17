"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DemoBoardPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="z-10 flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <Link
          href="/"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Home
        </Link>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="text-xs font-semibold tracking-tight">Free-form Board</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 rounded-md border bg-secondary p-0.5">
          <Link href="/board" className="rounded px-2.5 py-1 text-xs text-muted-foreground transition-all hover:text-foreground">
            Board
          </Link>
          <span className="rounded bg-card px-2.5 py-1 text-xs font-medium shadow-sm">Canvas</span>
        </div>

        <ThemeToggle />
      </div>

      <div className="relative flex-1">
        <Tldraw persistenceKey="board-demo" className="absolute inset-0" />
      </div>
    </div>
  );
}
