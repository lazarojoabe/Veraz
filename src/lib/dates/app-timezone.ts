export const APP_TIME_ZONE = "America/Sao_Paulo";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function asDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date;
}

function dateParts(value: Date) {
  const parts = offsetFormatter.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function timeZoneOffsetMs(value: Date) {
  const parts = dateParts(value);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - Math.floor(value.getTime() / 1000) * 1000;
}

export function appDayKey(value: Date | string) {
  return dayFormatter.format(asDate(value));
}

export function addDaysToDayKey(day: string, amount: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error("Dia inválido.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount, 12));
  return date.toISOString().slice(0, 10);
}

export function appDayKeyOffset(amount: number, now = new Date()) {
  return addDaysToDayKey(appDayKey(now), amount);
}

export function startOfAppDayIso(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error("Dia inválido.");

  const wallClockUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let instant = new Date(wallClockUtc);
  instant = new Date(wallClockUtc - timeZoneOffsetMs(instant));
  instant = new Date(wallClockUtc - timeZoneOffsetMs(instant));
  return instant.toISOString();
}

export function formatAppDate(value: Date | string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: APP_TIME_ZONE }).format(asDate(value));
}

export function dayKeyAsDate(day: string) {
  return asDate(`${day}T12:00:00.000Z`);
}
