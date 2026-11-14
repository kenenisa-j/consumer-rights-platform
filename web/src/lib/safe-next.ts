/** Only same-site paths are accepted as a return address, so a link cannot send people to another site. */
export function safeNext(value: string | undefined | null): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}
