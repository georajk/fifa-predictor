import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getFlagEmoji } from "@/lib/teamFlags";
import { formatKickoff } from "@/lib/date";
import PlayerPicker from "./components/PlayerPicker";

export const dynamic = "force-dynamic";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  stage: string | null;
  result: string | null;
}

const championPicks = [
  { user_name: "Krishna", team: "Spain" },
  { user_name: "Rahul", team: "Argentina" },
  { user_name: "Tom", team: "France" },
  { user_name: "Geo", team: "England" },
] as const;

const knockoutKeywords = ["round of 16", "quarter", "semi", "final", "knockout"];

function isKnockoutStage(stage: string | null) {
  if (!stage) {
    return false;
  }

  const normalizedStage = stage.toLowerCase();
  return knockoutKeywords.some((keyword) => normalizedStage.includes(keyword));
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
        .select("id, home_team, away_team, kickoff, stage, result")
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
    supabase.from("matches").select("id, home_team, away_team, kickoff, stage, result"),
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
  const predictionsByMatch = new Map<string, typeof predictions>();

  (predictions ?? []).forEach((prediction) => {
    const matchPredictions = predictionsByMatch.get(prediction.match_id) ?? [];
    matchPredictions.push(prediction);
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

  const championByTeam = new Map<string, string[]>();
  championPicks.forEach((pick) => {
    const users = championByTeam.get(pick.team) ?? [];
    users.push(pick.user_name);
    championByTeam.set(pick.team, users);
  });

  (matches ?? [])
    .filter((match) => match.result !== null && isKnockoutStage(match.stage))
    .forEach((match) => {
      const winningTeam =
        match.result === "HOME"
          ? match.home_team
          : match.result === "AWAY"
            ? match.away_team
            : null;
      const losingTeam =
        match.result === "HOME"
          ? match.away_team
          : match.result === "AWAY"
            ? match.home_team
            : null;

      if (!winningTeam || !losingTeam) {
        return;
      }

      const penalizedUsers = championByTeam.get(losingTeam) ?? [];
      const survivingUsers = championByTeam.get(winningTeam) ?? [];

      if (penalizedUsers.length === 0 || survivingUsers.length === 0) {
        return;
      }

      const sharePerSurvivor = 10 / survivingUsers.length;

      penalizedUsers.forEach((userName) => {
        scoreMap.set(userName, (scoreMap.get(userName) ?? 0) - 10);
      });

      survivingUsers.forEach((userName) => {
        scoreMap.set(userName, (scoreMap.get(userName) ?? 0) + sharePerSurvivor);
      });
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const pageSize = 5;
  const requestedPage = Number(resolvedSearchParams.page ?? 1);

  const { matches, predictionsByMatch } = await getMatches();
  const leaderboard = await getLeaderboard();
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedMatches = matches.slice(startIndex, startIndex + pageSize);

  const championPicks = [
    { user: "Krishna", team: "Spain", position: 1, isEliminated: false },
    { user: "Rahul", team: "Argentina", position: 2, isEliminated: false },
   
    { user: "Geo", team: "England", position: 3, isEliminated: true },
    { user: "Tom", team: "France", position: 4, isEliminated: true },
  ];

  const positionStyles: Record<number, string> = {
    1: "bg-green-100 ring-green-200 text-green-900",
    2: "bg-amber-100 ring-amber-200 text-amber-800",
    3: "bg-orange-50 ring-orange-200 text-orange-800",
    4: "bg-rose-50 ring-rose-200 text-rose-800",
  };

  return (
    <main className="mx-auto max-w-6xl p-6">


      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-6">
          <div className="lg:hidden">
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
                <>
                  {pagedMatches.map((match) => {
                    const placedBets = predictionsByMatch.get(match.id) ?? [];

                    return (
                      <Link
                        key={match.id}
                        href={`/match/${match.id}`}
                        className="block rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                {(() => {
                                  const homeFlag = getFlagEmoji(match.home_team);
                                  const isHomeFlagUrl = homeFlag.startsWith("http");
                                  return isHomeFlagUrl ? (
                                    <img src={homeFlag} alt={`${match.home_team} flag`} className="h-4 w-6 rounded-sm object-cover" />
                                  ) : (
                                    <span>{homeFlag}</span>
                                  );
                                })()}
                                {match.home_team}
                              </span>
                              <span className="text-slate-500">vs</span>
                              <span className="inline-flex items-center gap-1">
                                {(() => {
                                  const awayFlag = getFlagEmoji(match.away_team);
                                  const isAwayFlagUrl = awayFlag.startsWith("http");
                                  return isAwayFlagUrl ? (
                                    <img src={awayFlag} alt={`${match.away_team} flag`} className="h-4 w-6 rounded-sm object-cover" />
                                  ) : (
                                    <span>{awayFlag}</span>
                                  );
                                })()}
                                {match.away_team}
                              </span>
                            </span>
                          </h3>
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                            Match #{match.id}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Kickoff: {formatKickoff(match.kickoff)}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          Stage: {match.stage ?? "Stage TBD"}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
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
                  })}

                  {matches.length > pageSize && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + pageSize, matches.length)} of {matches.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Link
                          href={currentPage === 1 ? "/" : `/?page=${currentPage - 1}`}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium ${currentPage === 1 ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                        >
                          Previous
                        </Link>
                        <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                          {currentPage} / {totalPages}
                        </span>
                        <Link
                          href={currentPage === totalPages ? `/?page=${totalPages}` : `/?page=${currentPage + 1}`}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium ${currentPage === totalPages ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                        >
                          Next
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="lg:hidden rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">FIFA champions picks</h3>
            <div className="mt-4 space-y-2">
              {championPicks.map((pick) => {
                const flagValue = getFlagEmoji(pick.team);
                const isFlagUrl = flagValue.startsWith("http");
                const isEliminated = pick.isEliminated;
                const positionColor = positionStyles[pick.position] ?? "bg-slate-50 ring-slate-200 text-slate-700";

                return (
                  <div
                    key={`${pick.user}-${pick.team}`}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2.5 ring-1 ${
                      isEliminated ? "bg-rose-50 ring-rose-200" : positionColor
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                        isEliminated ? "bg-rose-100 text-rose-700" : "bg-white/80 text-slate-700"
                      }`}>
                        #{pick.position}
                      </span>
                      <span className={`text-sm font-medium ${isEliminated ? "text-rose-700" : "text-slate-900"}`}>
                        {pick.user}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 text-sm ${isEliminated ? "text-rose-700" : "text-slate-600"}`}>
                      {isFlagUrl ? (
                        <img
                          src={flagValue}
                          alt={`${pick.team} flag`}
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      ) : (
                        <span>{flagValue}</span>
                      )}
                      <span className={isEliminated ? "font-semibold" : ""}>{pick.team}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <section className="hidden lg:block rounded-3xl border border-indigo-100 bg-white/95 p-6 shadow-sm shadow-indigo-100/50">
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

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">FIFA champions picks</h3>
            <div className="mt-3 space-y-2">
              {championPicks.map((pick) => {
                const flagValue = getFlagEmoji(pick.team);
                const isFlagUrl = flagValue.startsWith("http");
                const isEliminated = pick.isEliminated;
                const positionColor = positionStyles[pick.position] ?? "bg-slate-50 ring-slate-200 text-slate-700";

                return (
                  <div
                    key={`${pick.user}-${pick.team}`}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ring-1 ${
                      isEliminated ? "bg-rose-50 ring-rose-200" : positionColor
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                        isEliminated ? "bg-rose-100 text-rose-700" : "bg-white/80 text-slate-700"
                      }`}>
                        #{pick.position}
                      </span>
                      <span className={`text-sm font-medium ${isEliminated ? "text-rose-700" : "text-slate-900"}`}>
                        {pick.user}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 text-sm ${isEliminated ? "text-rose-700" : "text-slate-600"}`}>
                      {isFlagUrl ? (
                        <img
                          src={flagValue}
                          alt={`${pick.team} flag`}
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      ) : (
                        <span>{flagValue}</span>
                      )}
                      <span className={isEliminated ? "font-semibold" : ""}>{pick.team}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
