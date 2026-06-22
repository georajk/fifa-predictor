"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { formatKickoff } from "@/lib/date";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  result: string | null;
}

export default function AdminMatchResultForm({ matches }: { matches: MatchRow[] }) {
  const defaultMatchId = matches[0]?.id ?? "";
  const [selectedMatchId, setSelectedMatchId] = useState(defaultMatchId);
  const [result, setResult] = useState("HOME");
  const [status, setStatus] = useState<string>("");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);
  const resultSummary = !selectedMatch
    ? "Select a match to see the outcome"
    : result === "HOME"
      ? `${selectedMatch.home_team} (Home)`
      : result === "AWAY"
        ? `${selectedMatch.away_team} (Away)`
        : "Draw / No winner";

  const handleMatchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMatchId = event.target.value;
    setSelectedMatchId(nextMatchId);

    const nextMatch = matches.find((match) => match.id === nextMatchId);
    setResult(nextMatch?.result ?? "HOME");
  };

  const handleResultChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setResult(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMatchId) {
      setStatus("Select a match first.");
      return;
    }

    if (!selectedMatch) {
      setStatus("The selected match could not be found.");
      return;
    }

    if (!["HOME", "DRAW", "AWAY"].includes(result)) {
      setStatus("Please choose a valid result.");
      return;
    }

    setStatus("Updating result...");

    const { error } = await supabase
      .from("matches")
      .update({ result })
      .eq("id", selectedMatchId);

    if (error) {
      setStatus(`Failed to save result: ${error.message}`);
    } else {
      setStatus("Result updated successfully. Refreshing the page...");
      window.location.reload();
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/50">
      <h2 className="text-xl font-semibold text-slate-900">Admin: Enter match results</h2>
      <p className="mt-2 text-sm text-slate-600">
        Choose a match and set the final result. Predictions are scored only after the result is saved.
      </p>

      {matches.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          There are no matches waiting for a result right now.
        </div>
      ) : (
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Match
            <select
              value={selectedMatchId}
              onChange={handleMatchChange}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="" disabled>
                Select a match
              </option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.home_team} vs {match.away_team} • {formatKickoff(match.kickoff)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Result
            <select
              value={result}
              onChange={handleResultChange}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="" disabled>
                Select a result
              </option>
              <option value="HOME">HOME — {selectedMatch?.home_team ?? "Home team"}</option>
              <option value="DRAW">DRAW — No winner</option>
              <option value="AWAY">AWAY — {selectedMatch?.away_team ?? "Away team"}</option>
            </select>
          </label>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Selected result</p>
            <p className="mt-1 text-sm text-slate-900">{resultSummary}</p>
          </div>

          <button className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700" type="submit">
            Save result
          </button>
        </form>
      )}

      {status ? (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900">{status}</p>
      ) : null}

      {selectedMatch ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Current result: <span className="font-semibold">{selectedMatch.result ?? "Not set"}</span>
        </div>
      ) : null}
    </section>
  );
}
