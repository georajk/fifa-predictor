import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PlayerPicker from "./components/PlayerPicker";

export const dynamic = "force-dynamic";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  result: string | null;
}

interface PredictionRow {
  match_id: string;
  user_name: string;
  prediction: string;
  amount: number;
}

interface LeaderboardEntry {
  user_name: string;
  score: number;
}

async function getMatches() {
  const [{ data: matchesData, error: matchesError }, { data: predictionsData, error: predictionsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff, result")
        .order("kickoff", { ascending: true }),
      supabase
        .from("predictions")
        .select("match_id, user_name, prediction, amount"),
    ]);

  if (matchesError || predictionsError) {
    throw new Error(matchesError?.message ?? predictionsError?.message ?? "Failed to load match data.");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const matches = (matchesData ?? []).filter((match) => {
    const kickoff = new Date(match.kickoff);
    return kickoff >= startOfToday;
  });

  const predictionsByMatch = new Map<string, PredictionRow[]>();
  (predictionsData ?? []).forEach((prediction) => {
    const current = predictionsByMatch.get(prediction.match_id) ?? [];
    current.push({
      match_id: prediction.match_id,
      user_name: prediction.user_name,
      prediction: prediction.prediction,
      amount: Number(prediction.amount ?? 0),
    });
    predictionsByMatch.set(prediction.match_id, current);
  });

  return {
    matches,
    predictionsByMatch,
  };
}

async function getLeaderboard() {
  const [{ data: predictions, error: predictionsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("predictions").select("user_name, prediction, match_id, amount"),
    supabase.from("matches").select("id, result"),
  ]);

  if (predictionsError || matchesError) {
    return [] as LeaderboardEntry[];
  }

  const resultByMatch = new Map<string, string | null>();
  (matches ?? []).forEach((match) => {
    if (match.result !== null) {
      resultByMatch.set(match.id, match.result);
    }
  });

  const scoreMap = new Map<string, number>();
  (predictions ?? []).forEach((prediction) => {
    const result = resultByMatch.get(prediction.match_id);
    const amount = Number(prediction.amount ?? 0);

    if (!result) {
      return;
    }

    const delta = prediction.prediction === result ? amount : -amount;
    scoreMap.set(prediction.user_name, (scoreMap.get(prediction.user_name) ?? 0) + delta);
  });

  return [...scoreMap.entries()]
    .map(([user_name, score]) => ({ user_name, score }))
    .sort((a, b) => b.score - a.score);
}

function formatScore(score: number) {
  const abs = Math.abs(score);
  const sign = score >= 0 ? "+" : "-";
  return `${sign}£${abs.toFixed(2)}`;
}

export default async function Home() {
  const { matches, predictionsByMatch } = await getMatches();
  const leaderboard = await getLeaderboard();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col gap-4">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-lg shadow-indigo-200/50">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-50">
            League dashboard
          </span>
          <h1 className="mt-3 text-4xl font-bold">FIFA Friends League</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-50/90">
            Choose a player, predict match outcomes, and track your score across the league.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <Link href="/admin" className="rounded-full border border-indigo-200 bg-white px-4 py-2 font-medium text-indigo-700 transition hover:bg-indigo-50">
            Admin result entry
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-6">
          <PlayerPicker />

          <section className="rounded-3xl border border-indigo-100 bg-white/95 p-6 shadow-sm shadow-indigo-100/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Upcoming matches</h2>
                <p className="mt-1 text-sm text-slate-600">Tap a match to submit a prediction before kickoff.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {matches.length === 0 ? (
                <p className="text-slate-600">No matches found. Seed your database with match records.</p>
              ) : (
                matches.map((match) => {
                  const placedBets = predictionsByMatch.get(match.id) ?? [];

                  return (
                    <Link
                      key={match.id}
                      href={`/match/${match.id}`}
                      className="block rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {match.home_team} vs {match.away_team}
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          Match #{match.id}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Kickoff: {new Date(match.kickoff).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Result: {match.result ?? "Pending"}
                      </p>

                      <div className="mt-3 rounded-2xl bg-white/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bets placed</p>
                        {placedBets.length === 0 ? (
                          <p className="mt-1 text-sm text-slate-500">No bets yet</p>
                        ) : (
                          <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                            {placedBets.map((bet) => (
                              <li key={`${bet.user_name}-${bet.prediction}-${bet.amount}-${bet.match_id}`} className="text-sm text-slate-700">
                                • {bet.user_name}: {bet.prediction} (£{bet.amount.toFixed(2)})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-indigo-100 bg-white/95 p-6 shadow-sm shadow-indigo-100/50">
          <h2 className="text-xl font-semibold text-slate-900">Leaderboard</h2>
          <p className="mt-2 text-sm text-slate-600">Scores update once match results are entered.</p>

          <div className="mt-6 space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-slate-600">No scores yet. Enter match results in the admin panel.</p>
            ) : (
              leaderboard.map((row) => (
                <div
                  key={row.user_name}
                  className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50 px-4 py-3"
                >
                  <span className="font-medium text-slate-900">{row.user_name}</span>
                  <span
                    className={row.score >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}
                  >
                    {formatScore(row.score)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
