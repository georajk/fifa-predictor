"use client";

import { useEffect, useState, type ChangeEvent } from "react";

const players = ["Geo", "Krishna", "Rahul","Tom"];
const storageKey = "fifa-predictor-user";

export default function PlayerPicker() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) ?? "";
    setUserName(stored);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextUser = event.target.value;
    setUserName(nextUser);
    window.localStorage.setItem(storageKey, nextUser);
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-6 shadow-sm shadow-indigo-100/50 backdrop-blur-lg">
      <h2 className="text-lg font-semibold text-slate-900">Pick your player</h2>
      <p className="mt-2 text-sm text-slate-600">
        The selected name is stored locally so you can submit predictions immediately.
      </p>
      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-700">
        Select player
        <select
          value={userName}
          onChange={handleChange}
          className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">Choose a name</option>
          {players.map((player) => (
            <option key={player} value={player}>
              {player}
            </option>
          ))}
        </select>
      </label>
      {userName ? (
        <p className="mt-3 text-sm text-slate-500">Current player: {userName}</p>
      ) : (
        <p className="mt-3 text-sm text-amber-700">Select a player before making predictions.</p>
      )}
    </section>
  );
}
