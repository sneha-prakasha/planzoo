import { supabase } from "./supabase";
import type { Member } from "./types";

/** All memberships (with profiles) for a set of projects. */
export async function fetchMembers(projectIds: string[]): Promise<Member[]> {
  if (projectIds.length === 0) return [];
  const { data } = await supabase
    .from("project_members")
    .select("*, profiles(id,email,full_name)")
    .in("project_id", projectIds);
  return (data || []) as Member[];
}

/** One entry per person, even if they are in several projects. */
export function uniquePeople(members: Member[]) {
  const map = new Map<string, NonNullable<Member["profiles"]>>();
  for (const m of members) {
    if (m.profiles && !map.has(m.user_id)) map.set(m.user_id, m.profiles);
  }
  return map;
}
