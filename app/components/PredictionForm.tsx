"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const players = ["Geo", "Krishna", "Rahul","Tom"];
const storageKey = "fifa-predictor-user";

interface MatchProps {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
}

interface PredictionFormProps {
  match: MatchProps;
  locked: boolean;
}

export default function PredictionForm({ match, locked }: PredictionFormProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [prediction, setPrediction] = useState("HOME");
  const [amount, setAmount] = useState("0.50");
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) ?? "";
    setUserName(stored);
  }, []);

  useEffect(() => {
    if (userName) {
      window.localStorage.setItem(storageKey, userName);
    }
  }, [userName]);

  const handlePredictionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPrediction(event.target.value);
  };

  const handleAmountChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setAmount(event.target.value);
  };

  const handlePlayerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setUserName(value);
    window.localStorage.setItem(storageKey, value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userName) {
      setStatus({ type: "error", message: "Pick a player before submitting a prediction." });
      return;
    }

    if (locked) {
      setStatus({ type: "error", message: "Predictions are closed for this match." });
      return;
    }

    setStatus({ type: "info", message: "Saving prediction..." });

    const { error } = await supabase.from("predictions").insert({
      user_name: userName,
      match_id: match.id,
      prediction,
      amount: Number(amount),
    });

    if (error) {
      setStatus({ type: "error", message: `Failed to save: ${error.message}` });
      return;
    }

    setStatus({ type: "success", message: "Prediction saved successfully." });
  };

  const handleSaveAndExit = async () => {
    if (!userName) {
      setStatus({ type: "error", message: "Pick a player before submitting a prediction." });
      return;
    }

    if (locked) {
      setStatus({ type: "error", message: "Predictions are closed for this match." });
      return;
    }

    setStatus({ type: "info", message: "Saving prediction..." });

    const { error } = await supabase.from("predictions").insert({
      user_name: userName,
      match_id: match.id,
      prediction,
      amount: Number(amount),
    });

    if (error) {
      setStatus({ type: "error", message: `Failed to save: ${error.message}` });
      return;
    }

    router.push("/");
  };

  const predictionSummary =
    prediction === "HOME"
      ? `${match.home_team} (Home)`
      : prediction === "AWAY"
        ? `${match.away_team} (Away)`
        : "Draw / No winner";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/50">
      <h2 className="text-xl font-semibold text-slate-900">Submit your prediction</h2>
      <p className="mt-2 text-sm text-slate-600">
        {match.home_team} vs {match.away_team} • Kickoff {new Date(match.kickoff).toLocaleString()}
      </p>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Select player
          <select
            value={userName}
            onChange={handlePlayerChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Choose a name</option>
            {players.map((player) => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Amount
          <select
            value={amount}
            onChange={handleAmountChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="0.50">£0.50</option>
            <option value="1.00">£1.00</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Prediction
          <select
            value={prediction}
            onChange={handlePredictionChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="HOME">HOME — {match.home_team}</option>
            <option value="DRAW">DRAW — No winner</option>
            <option value="AWAY">AWAY — {match.away_team}</option>
          </select>
          <span className="text-xs text-slate-500">
            HOME = {match.home_team} • AWAY = {match.away_team}
          </span>
        </label>

        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Selected prediction</p>
          <p className="mt-1 text-sm text-slate-900">{predictionSummary}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={locked}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {locked ? "Closed" : "Save & Exit"}
          </button>
        </div>
      </form>

      {status ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            status.type === "success"
              ? "bg-emerald-100 text-emerald-900"
              : status.type === "error"
              ? "bg-rose-100 text-rose-900"
              : "bg-slate-100 text-slate-900"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      {locked ? (
        <p className="mt-4 text-sm text-amber-700">Predictions are locked for this match.</p>
      ) : null}
    </section>
  );
}
