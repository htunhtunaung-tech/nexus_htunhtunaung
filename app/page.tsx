import Link from "next/link";
import { LandingPreview } from "@/components/landing/landing-preview";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "3D constellation",
    text: "See every project as a node you can rotate, drag and open. Grid and list views are one click away.",
  },
  {
    title: "A Kanban board that stays in sync",
    text: "Drag tasks across five columns. Teammates' changes appear on your board as they happen.",
  },
  {
    title: "Built for small teams",
    text: "Invite people with secure links, assign tasks and follow an activity timeline.",
  },
  {
    title: "Analytics from real data",
    text: "Completion rate, overdue work and workload by person, calculated from your own tasks.",
  },
];

export default function Home() {
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <Link href="/" className="text-lg font-semibold tracking-[0.2em]">
          NEXUS
        </Link>
        <nav aria-label="Main" className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:py-20">
          <div className="grid gap-6">
            <p className="text-sm text-cyan-400">Developer command center</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your projects. Your workflow. Your universe.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              NEXUS turns your projects into an interactive constellation, with a Kanban board, team invites and
              analytics behind every node.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Launch Your Workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#demo">Explore the Demo</a>
              </Button>
            </div>
          </div>
          <div id="demo">
            <LandingPreview />
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-6 py-12">
          <h2 id="features-heading" className="text-2xl font-semibold">
            What&apos;s inside
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-xl border bg-muted/20 p-5">
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 p-6 text-sm text-muted-foreground">
          <p>NEXUS · built by Htun Htun Aung</p>
          <a
            href="https://github.com/htunhtunaung-tech/nexus_htunhtunaung"
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}