import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Sparkles, LayoutDashboard, ScrollText, Mic2, BookOpen, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPlayerView = pathname.startsWith("/player");

  return (
    <QueryClientProvider client={queryClient}>
      {isPlayerView ? (
        <Outlet />
      ) : (
        <div className="min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      )}
    </QueryClientProvider>
  );
}

type NavItem = {
  to: "/" | "/prep" | "/post-session" | "/campaign";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/prep", label: "Session Prep", icon: ScrollText },
  { to: "/post-session", label: "Post-Session", icon: Mic2 },
  { to: "/campaign", label: "Campaign", icon: BookOpen },
];

function TopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/40">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-lg bg-arcane grid place-items-center glow-arcane">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg tracking-widest text-gold">GRIMOIRE</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground -mt-0.5">
              DM's Companion
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 " +
                  (active
                    ? "text-gold bg-secondary/60 shadow-[inset_0_0_0_1px_var(--gold)]/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40")
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {active && (
                  <span className="absolute -bottom-[9px] left-4 right-4 h-px bg-gold-gradient" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <PlayerViewQR />
        </div>
      </div>
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap " +
                (active ? "text-gold bg-secondary/60" : "text-muted-foreground")
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function PlayerViewQR() {
  const playerUrl = typeof window !== "undefined" ? `${window.location.origin}/player` : "/player";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/40 text-gold hover:text-gold hover:bg-primary/10">
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">Player View</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gold tracking-wider">
            Player View
          </DialogTitle>
          <DialogDescription>
            Scan with a phone to open the table-side view players use across the table.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="p-4 rounded-xl bg-parchment ornate-frame glow-gold">
            <QRCodeSVG value={playerUrl} size={200} bgColor="transparent" fgColor="#1a1108" level="M" />
          </div>
          <a
            href="/player"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-gold underline underline-offset-4"
          >
            Open in new tab
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
