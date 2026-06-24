import { createFileRoute } from "@tanstack/react-router";
import { EntryEditor } from "@/components/EntryEditor";

export const Route = createFileRoute("/_authenticated/entry/")({
  component: NewEntryPage,
});

function NewEntryPage() {
  return <EntryEditor />;
}
