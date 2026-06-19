import Link from "next/link";
import { getFlagEmoji } from "@/lib/teamFlags";

const winnerPredictions = [
  { user: "Krishna", team: "Spain" },
  { user: "Rahul", team: "Argentina" },
  { user: "Tom", team: "France" },
  { user: "Geo", team: "England" },
];

const sortedWinnerPredictions = [...winnerPredictions].sort((a, b) =>
  a.user.localeCompare(b.user),
);

export default function WinnerPredictionsPage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">FIFA picks</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Winner predictions</h1>
        </div>
        <Link
          href="/"
          className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
        >
          Back to home
        </Link>
      </div>

      <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm shadow-indigo-100/50">
        <p className="text-sm text-slate-600">These are the four selected winner predictions.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sortedWinnerPredictions.map((pick) => {
            const flagValue = getFlagEmoji(pick.team);
            const isFlagUrl = flagValue.startsWith("http");

            return (
              <article
                key={`${pick.user}-${pick.team}`}
                className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Predicted winner</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{pick.user}</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {pick.user.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm text-slate-700">
                  {isFlagUrl ? (
                    <img
                      src={flagValue}
                      alt={`${pick.team} flag`}
                      className="h-5 w-7 rounded-sm object-cover"
                    />
                  ) : (
                    <span>{flagValue}</span>
                  )}
                  <span className="font-medium">{pick.team}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
