import { supabase } from "@/lib/supabase";
import AdminMatchResultForm from "../components/AdminMatchResultForm";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  result: string | null;
}

export default async function AdminPage() {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff, result")
    .is("result", null)
    .order("kickoff", { ascending: true });

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-4 text-red-600">Failed to load matches: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Admin Result Entry</h1>
        <p className="text-slate-600">
          Use this page to update match outcomes after the game finishes.
        </p>
      </div>

      <AdminMatchResultForm matches={(matches ?? []) as MatchRow[]} />
    </main>
  );
}
