const kickoffFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatKickoff(value: string | Date) {
  return kickoffFormatter.format(new Date(value));
}
