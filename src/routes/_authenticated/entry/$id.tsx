import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { EntryEditor } from "@/components/EntryEditor";
import { getEntry } from "@/lib/entries.functions";
import type { JournalEntry } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/entry/$id")({
  component: EditEntryPage,
});

function EditEntryPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchEntry = useServerFn(getEntry);

  const { data, isLoading } = useQuery({
    queryKey: ["entry", id],
    queryFn: () => fetchEntry({ data: { id } }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20">
        <div className="h-64 animate-pulse rounded-2xl bg-secondary/60" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-24 text-center">
        <p className="text-muted-foreground">This entry couldn't be found.</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to journal
        </button>
      </div>
    );
  }

  return <EntryEditor existing={data as JournalEntry} />;
}
