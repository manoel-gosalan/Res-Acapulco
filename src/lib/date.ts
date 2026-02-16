export function lisbonYYYYMMDD(baseDate = new Date()) {
  // en-CA => YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(baseDate);
}

export function addLisbonDaysYYYYMMDD(days: number, from = new Date()) {
  // pega "hoje" em Lisbon e soma dias
  const ymd = lisbonYYYYMMDD(from); // YYYY-MM-DD
  const dt = new Date(`${ymd}T00:00:00`); // base neutra
  dt.setDate(dt.getDate() + days);
  return lisbonYYYYMMDD(dt);
}
