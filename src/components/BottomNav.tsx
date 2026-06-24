import { Link, useNavigate } from "@tanstack/react-router";
import { BookHeart, BarChart3, Plus } from "lucide-react";

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors data-[status=active]:bg-secondary data-[status=active]:text-foreground"
          aria-label="Journal"
        >
          <BookHeart className="h-5 w-5" />
        </Link>

        <button
          onClick={() => navigate({ to: "/entry" })}
          aria-label="Create an entry"
          className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>

        <Link
          to="/history"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors data-[status=active]:bg-secondary data-[status=active]:text-foreground"
          aria-label="History"
        >
          <BarChart3 className="h-5 w-5" />
        </Link>
      </div>
    </nav>
  );
}
