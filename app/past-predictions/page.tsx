import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface PredictionRecord {
  user_name: string;
  prediction: string;
  amount: number;
  match_id: string;
  match_home_team: string;
  match_away_team: string;
  match_result: string | null;
  match_kickoff: string;
  match_stage: string | null;
}

interface MatchSummary {
  id: string;
  home_team: string;
  away_team: string;
  result: string | null;
  kickoff: string;
  stage: string | null;
}

export const dynamic = "force-dynamic";

export default async function PastPredictionsPage() {
  const [{ data: predictions, error: predictionsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("predictions").select("user_name, prediction, amount, match_id"),
      supabase.from("matches").select("id, home_team, away_team, result, kickoff, stage"),
    ]);

  if (predictionsError || matchesError) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold">Past predictions</h1>
        <p className="mt-3 text-red-600">Failed to load past predictions.</p>
      </main>
    );
  }

  const matchMap = new Map<string, MatchSummary>();
  (matches ?? []).forEach((match) => {
    if (match.result !== null) {
      matchMap.set(match.id, match);
    }
  });

  const records: PredictionRecord[] = (predictions ?? [])
    .map((prediction) => {
      const match = matchMap.get(prediction.match_id);

      if (!match) {
        return null;
      }

      return {
        user_name: prediction.user_name,
        prediction: prediction.prediction,
        amount: Number(prediction.amount ?? 0),
        match_id: prediction.match_id,
        match_home_team: match.home_team,
        match_away_team: match.away_team,
        match_result: match.result,
        match_kickoff: match.kickoff,
        match_stage: match.stage,
      };
    })
    .filter(Boolean) as PredictionRecord[];

  const groupedByMatch = records.reduce<Record<string, PredictionRecord[]>>((acc, record) => {
    const list = acc[record.match_id] ?? [];
    list.push(record);
    acc[record.match_id] = list;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
            ← Back to home
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Past predictions</h1>
        </div>
      </div>

      {records.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">No past predictions found.</p>
        </section>
      ) : (
        <section className="space-y-4">
          {Object.entries(groupedByMatch).map(([matchId, matchRecords]) => {
            const firstRecord = matchRecords[0];
            const matchResult = firstRecord.match_result;
            const matchLabel = `${firstRecord.match_home_team} vs ${firstRecord.match_away_team}`;
            const isMatchWonByPrediction = (prediction: string) => prediction === matchResult;

            return (
              <article
                key={matchId}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Match</p>
                        <h2 className="text-xl font-semibold text-slate-900">{matchLabel}</h2>
                        <p className="mt-1 text-sm text-slate-500">Stage: {firstRecord.match_stage ?? "Stage TBD"}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        Result: {matchResult ?? "Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {matchRecords.map((record) => {
                      const isWon = isMatchWonByPrediction(record.prediction);
                      const statusLabel = isWon ? "Won" : "Lost";
                      const statusClass = isWon
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800";

                      return (
                        <div
                          key={`${matchId}-${record.user_name}`}
                          className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{record.user_name}</p>
                            <p className="text-sm text-slate-600">
                              Predicted {record.prediction} · £{record.amount.toFixed(2)}
                            </p>
                          </div>
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
