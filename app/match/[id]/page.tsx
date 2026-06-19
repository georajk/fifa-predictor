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

interface PredictionSummary {
  user_name: string;
  prediction: string;
  amount: number;
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

  const { data: predictions } = await supabase
    .from("predictions")
    .select("user_name, prediction, amount")
    .eq("match_id", id);

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

      <section className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Predictions made</h2>
        {(predictions ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No predictions yet for this match.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(predictions as PredictionSummary[]).map((prediction) => (
              <li key={`${prediction.user_name}-${prediction.prediction}-${prediction.amount}`} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{prediction.user_name}</span>{" "}
                picked <span className="font-medium">{prediction.prediction}</span> for
                <span className="font-semibold text-slate-900"> £{prediction.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PredictionForm match={match as MatchRow} locked={locked} />
    </main>
  );
}
