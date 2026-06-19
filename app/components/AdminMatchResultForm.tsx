"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  result: string | null;
}

export default function AdminMatchResultForm({ matches }: { matches: MatchRow[] }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [result, setResult] = useState("HOME");
  const [status, setStatus] = useState<string>("");

  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  const handleMatchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMatchId(event.target.value);
    const nextMatch = matches.find((match) => match.id === event.target.value);
    if (nextMatch?.result) {
      setResult(nextMatch.result);
    }
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

    setStatus("Updating result...");

    const { error } = await supabase
      .from("matches")
      .update({ result })
      .eq("id", selectedMatchId);

    if (error) {
      setStatus(`Failed to save result: ${error.message}`);
    } else {
      setStatus("Result updated successfully. Refresh the page to see the latest value.");
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
              <option value="">Select a match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.home_team} vs {match.away_team} • {new Date(match.kickoff).toLocaleString()}
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
              <option value="HOME">HOME</option>
              <option value="DRAW">DRAW</option>
              <option value="AWAY">AWAY</option>
            </select>
          </label>

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
