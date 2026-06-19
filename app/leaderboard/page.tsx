import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry {
  user_name: string;
  score: number;
}

interface PredictionRow {
  user_name: string;
  prediction: string;
  match_id: string;
  amount: number;
}

interface MatchRow {
  id: string;
  result: string | null;
}

export const dynamic = "force-dynamic";

async function getLeaderboard() {
  const [{ data: predictions, error: predictionsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("predictions").select("user_name, prediction, match_id, amount"),
      supabase.from("matches").select("id, result"),
    ]);

  if (predictionsError || matchesError) {
    return {
      leaderboard: [] as LeaderboardEntry[],
      totalPredictions: 0,
      resolvedMatches: 0,
      totalStake: 0,
    };
  }

  const resultByMatch = new Map<string, string | null>();
  (matches ?? []).forEach((match) => {
    if (match.result !== null) {
      resultByMatch.set(match.id, match.result);
    }
  });

  const scoreMap = new Map<string, number>();
  const predictionsByMatch = new Map<string, PredictionRow[]>();

  (predictions ?? []).forEach((prediction) => {
    const matchPredictions = predictionsByMatch.get(prediction.match_id) ?? [];
    matchPredictions.push({
      user_name: prediction.user_name,
      prediction: prediction.prediction,
      match_id: prediction.match_id,
      amount: Number(prediction.amount ?? 0),
    });
    predictionsByMatch.set(prediction.match_id, matchPredictions);
  });

  predictionsByMatch.forEach((matchPredictions, matchId) => {
    const result = resultByMatch.get(matchId);

    if (!result) {
      return;
    }

    const winningPredictions = matchPredictions.filter(
      (prediction) => prediction.prediction === result,
    );
    const losingPredictions = matchPredictions.filter(
      (prediction) => prediction.prediction !== result,
    );

    if (winningPredictions.length === 0) {
      return;
    }

    const totalLostAmount = losingPredictions.reduce(
      (sum, prediction) => sum + Number(prediction.amount ?? 0),
      0,
    );

    if (totalLostAmount === 0) {
      return;
    }

    const sharePerWinner = totalLostAmount / winningPredictions.length;

    winningPredictions.forEach((prediction) => {
      scoreMap.set(
        prediction.user_name,
        (scoreMap.get(prediction.user_name) ?? 0) + sharePerWinner,
      );
    });

    losingPredictions.forEach((prediction) => {
      scoreMap.set(
        prediction.user_name,
        (scoreMap.get(prediction.user_name) ?? 0) - Number(prediction.amount ?? 0),
      );
    });
  });

  const leaderboard = [...scoreMap.entries()]
    .map(([user_name, score]) => ({ user_name, score }))
    .sort((a, b) => b.score - a.score);

  const totalPredictions = predictions?.length ?? 0;
  const totalStake = (predictions ?? []).reduce(
    (sum, prediction) => sum + Number(prediction.amount ?? 0),
    0,
  );
  const resolvedMatches = (matches ?? []).filter((match) => match.result !== null).length;

  return {
    leaderboard,
    totalPredictions,
    resolvedMatches,
    totalStake,
  };
}

function formatScore(score: number) {
  const abs = Math.abs(score);
  const sign = score >= 0 ? "+" : "-";
  return `${sign}£${abs.toFixed(2)}`;
}

export default async function LeaderboardPage() {
  const { leaderboard, totalPredictions, resolvedMatches, totalStake } = await getLeaderboard();
  const topPlayer = leaderboard[0];

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
            ← Back to home
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track the league standings and see how each prediction is affecting the table.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Players</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{leaderboard.length}</p>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Predictions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalPredictions}</p>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Resolved matches</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{resolvedMatches}</p>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total stake</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">£{totalStake.toFixed(2)}</p>
        </div>
      </section>

      {leaderboard.length > 0 && (
        <section className="mt-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-lg shadow-indigo-200/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-100">Current leader</p>
              <h2 className="mt-2 text-3xl font-semibold">{topPlayer.user_name}</h2>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-100">Score</p>
              <p className="mt-1 text-2xl font-semibold">{formatScore(topPlayer.score)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Standings</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">League table</h2>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rank</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Player</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-600">
                      No scores yet. Enter match results in the admin panel to start the leaderboard.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => (
                    <tr key={entry.user_name} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                            index === 0
                              ? "bg-amber-100 text-amber-800"
                              : index === 1
                                ? "bg-slate-200 text-slate-800"
                                : index === 2
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-900">{entry.user_name}</span>
                      </td>
                      <td className={`px-4 py-4 text-right font-semibold ${entry.score >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {formatScore(entry.score)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">How the leaderboard works</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If a player predicts the correct result, they share the total amount staked by everyone who got it wrong.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Scoring rule</p>
              <p className="mt-1">Correct picks gain from the losing pool, while incorrect picks lose their own stake.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Quick links</h3>
            <div className="mt-4 space-y-3">
              <Link href="/active-predictions" className="block rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Open predictions
              </Link>
              <Link href="/past-predictions" className="block rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Final results
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
