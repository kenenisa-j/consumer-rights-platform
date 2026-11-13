import type { GovLevel } from "@/types/gov";

// Pure rules for the administration pages: staff, categories and public content. Who may change what depends on the
// level (prototype/PLAN.md section 0.2). No React and no alias imports at runtime, so node:test covers it. The backend
// owns the real rules; this mirrors them for the demo.

export interface Result<T> { list: T[]; ok: boolean; notice: string }

// ---- Staff ---------------------------------------------------------------------------------------------------------

export type PersonStatus = "Active" | "On leave" | "Left the office";
export interface Person { id: string; name: string; email: string; role: string; office: string; status: PersonStatus; cases: number }
export type PersonInput = Omit<Person, "id" | "cases">;
export interface Allowed { roles: readonly string[]; offices: readonly string[] }

const isAdmin = (p: { role: string }) => /administrator/i.test(p.role);
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Add a person (no `editingId`) or change one. Roles and offices are limited to what the level manages. */
export function savePerson(list: Person[], input: PersonInput, allowed: Allowed, editingId?: string): Result<Person> {
  const refuse = (notice: string): Result<Person> => ({ list, ok: false, notice });
  const name = input.name.trim(), email = input.email.trim();
  if (name.length < 3) return refuse("Write the person's full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return refuse("Write a valid work email.");
  if (!allowed.roles.includes(input.role)) return refuse("You cannot give that role from this office.");
  if (!allowed.offices.includes(input.office)) return refuse("You cannot manage staff of that office.");
  if (list.some(p => p.id !== editingId && sameEmail(p.email, email))) return refuse("Someone already has that email.");

  const next: Person[] = editingId
    ? list.map(p => (p.id === editingId ? { ...p, ...input, name, email } : p))
    : [...list, { ...input, name, email, id: `p${list.length + 1}`, cases: 0 }];

  // An office with administrators must keep one who can sign in; otherwise nobody could manage its staff.
  if (editingId) {
    const before = list.find(p => p.id === editingId)!;
    const after = next.find(p => p.id === editingId)!;
    const active = (p: Person) => isAdmin(p) && p.status === "Active";
    const lost = active(before) && !active(after);
    if (lost && !next.some(p => p.office === before.office && active(p))) return refuse("Every office keeps at least one active administrator.");
  }
  return { list: next, ok: true, notice: editingId ? "The changes were saved." : "The person was added. They get an email to set a password." };
}

// ---- Categories ----------------------------------------------------------------------------------------------------

export interface CatItem { id: string; name: string; retired?: boolean }
const CATCH_ALL = /^(other|something else)$/i;
const visible = (list: CatItem[]) => list.filter(i => !i.retired);

/** Only the City Bureau edits the lists; every other level suggests a change instead. */
export const canEditCategories = (level: GovLevel) => level === "bureau";

export function addCategory(list: CatItem[], name: string): Result<CatItem> {
  const n = name.trim();
  if (n.length < 2) return { list, ok: false, notice: "Write a name." };
  if (visible(list).some(i => i.name.toLowerCase() === n.toLowerCase())) return { list, ok: false, notice: "That item is already in the list." };
  return { list: [...list, { id: `c${list.length + 1}`, name: n }], ok: true, notice: "Saved." };
}

export function renameCategory(list: CatItem[], id: string, name: string): Result<CatItem> {
  const n = name.trim();
  if (n.length < 2) return { list, ok: false, notice: "Write a name." };
  if (visible(list).some(i => i.id !== id && i.name.toLowerCase() === n.toLowerCase())) return { list, ok: false, notice: "That item is already in the list." };
  return { list: list.map(i => (i.id === id ? { ...i, name: n } : i)), ok: true, notice: "Saved." };
}

/** Removing never deletes: complaints already using the item keep it, it just stops showing on new forms. */
export function removeCategory(list: CatItem[], id: string): Result<CatItem> {
  const item = list.find(i => i.id === id);
  if (!item) return { list, ok: false, notice: "That item no longer exists." };
  if (CATCH_ALL.test(item.name)) return { list, ok: false, notice: "The catch-all item stays, so every form always has an option that fits." };
  return { list: list.map(i => (i.id === id ? { ...i, retired: true } : i)), ok: true, notice: "Removed from new forms. Complaints already using it keep it." };
}

// ---- Public content ------------------------------------------------------------------------------------------------

export type ContentStatus = "Draft" | "Waiting for the Sub-City" | "Published" | "Archived";
export interface ContentItem { id: string; title: string; type: string; status: ContentStatus; updated: string; body?: string; from?: string; sentBack?: string; author?: string }
export interface ContentInput { title: string; type: string; body: string; from?: string; status?: ContentStatus }

export const LOCAL_TYPES = ["Local notice", "Event", "Office closure"] as const;
export const CITY_TYPES = ["Rights article", "Law", "Guide", "News"] as const;
const typesFor = (level: GovLevel): readonly string[] => (level === "bureau" ? CITY_TYPES : LOCAL_TYPES);

/** Woreda notices wait for the Sub-City; the Sub-City publishes its own; the Bureau runs the city-wide content. */
export function saveContent(level: GovLevel, list: ContentItem[], input: ContentInput, today: string, editingId?: string): Result<ContentItem> {
  const refuse = (notice: string): Result<ContentItem> => ({ list, ok: false, notice });
  if (input.title.trim().length < 3) return refuse("Write a title.");
  if (!typesFor(level).includes(input.type)) return refuse("This office cannot publish that kind of content.");
  const status: ContentStatus = level === "woreda" ? "Waiting for the Sub-City" : level === "subcity" ? "Published" : (input.status ?? "Draft");
  const base = { title: input.title.trim(), type: input.type, body: input.body.trim(), from: input.from, status, updated: today, sentBack: undefined };
  const next = editingId
    ? list.map(i => (i.id === editingId ? { ...i, ...base } : i))
    : [{ id: `n${list.length + 1}`, ...base }, ...list];
  return { list: next, ok: true, notice: level === "woreda" ? "Saved and sent to the Sub-City for approval." : "Saved." };
}

export function approveNotice(level: GovLevel, list: ContentItem[], id: string, today: string): Result<ContentItem> {
  const item = list.find(i => i.id === id);
  if (level !== "subcity") return { list, ok: false, notice: "Only the Sub-City approves local notices." };
  if (!item || item.status !== "Waiting for the Sub-City") return { list, ok: false, notice: "There is nothing to approve." };
  return { list: list.map(i => (i.id === id ? { ...i, status: "Published", updated: today } : i)), ok: true, notice: "Approved. The notice shows on the public News page." };
}

export function sendBackNotice(level: GovLevel, list: ContentItem[], id: string, reason: string, today: string): Result<ContentItem> {
  const item = list.find(i => i.id === id);
  if (level !== "subcity") return { list, ok: false, notice: "Only the Sub-City sends a notice back." };
  if (!item || item.status !== "Waiting for the Sub-City") return { list, ok: false, notice: "There is nothing to send back." };
  if (reason.trim().length < 5) return { list, ok: false, notice: "Tell the Woreda what to change." };
  return { list: list.map(i => (i.id === id ? { ...i, status: "Draft", sentBack: reason.trim(), updated: today } : i)), ok: true, notice: "Sent back to the Woreda with your note." };
}
