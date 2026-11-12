// Product settings read at run time (server side). Never hard-code these in pages.
// Placeholder until the Bureau supplies the real toll-free number (see documentation/open-questions.md).
export function freeCallNumber(): string {
  return process.env.FREE_CALL_NUMBER || "8070";
}

export const FREE_CALL_HOURS = { en: "Monday to Friday, 8:30 to 17:30", short: "Mon–Fri, 8:30–17:30" } as const;
