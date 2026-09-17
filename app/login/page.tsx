import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isInstalled } from "@/lib/db";
import { LogoMark } from "@/components/logo-mark";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in — Digital Board" };

export default async function LoginPage() {
  if (!isInstalled()) redirect("/setup");
  if (await currentUser()) redirect("/board");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark />
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
