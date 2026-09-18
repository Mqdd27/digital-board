import { redirect } from "next/navigation";
import { isInstalled } from "@/lib/db";
import { DEFAULT_COLUMNS } from "@/lib/board";
import { LogoMark } from "@/components/logo-mark";
import { SetupForm } from "@/components/setup-form";

export const metadata = { title: "Setup — Digital Board" };

export default async function SetupPage() {
  if (await isInstalled()) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Welcome</h1>
            <p className="text-sm text-muted-foreground">One-time setup, then your board is ready.</p>
          </div>
        </div>
        <SetupForm defaultColumns={DEFAULT_COLUMNS} />
      </div>
    </main>
  );
}
