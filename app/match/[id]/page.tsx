import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PredictionForm from "../../components/PredictionForm";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  result: string | null;
}

interface MatchPageProps {
  params: {
    id: string;
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: match, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff, result")
    .eq("id", id)
    .single();

  if (error || !match) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold">Match not found</h1>
        <p className="mt-3 text-slate-600">Please return to the home page and choose a valid match.</p>
        <Link className="mt-5 inline-block text-sky-700 hover:underline" href="/">
          Back to home
        </Link>
      </main>
    );
  }

  const kickoff = new Date(match.kickoff);
  const locked = new Date() > kickoff;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <Link className="text-sm font-medium text-sky-700 hover:underline" href="/">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          {match.home_team} vs {match.away_team}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Kickoff: {kickoff.toLocaleString()}
        </p>
      </div>

      <PredictionForm match={match as MatchRow} locked={locked} />
    </main>
  );
}
