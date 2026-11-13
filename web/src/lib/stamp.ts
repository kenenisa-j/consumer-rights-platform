import type { Stamp } from "@/types/case";

/** The current moment in the three forms the case screens use: long (timeline), short (messages) and ISO. */
export function stamp(date = new Date()): Stamp {
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", o).format(date);
  const time = part({ hour: "2-digit", minute: "2-digit" });
  return {
    when: `${part({ weekday: "long", day: "numeric", month: "long" })}, ${time} ${date.getFullYear()}`,
    short: `${part({ weekday: "short", day: "numeric", month: "short" })}, ${time}`,
    iso: date.toISOString()
  };
}
