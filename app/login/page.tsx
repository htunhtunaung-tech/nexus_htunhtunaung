import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

type Props = { searchParams: Promise<{ next?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Reads ?next= from the URL, so it renders per request inside Suspense
async function LoginFormWithNext({ searchParams }: Props) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}