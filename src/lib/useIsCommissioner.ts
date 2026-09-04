"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

/** True when the signed-in member is the commissioner (or in preview mode). */
export function useIsCommissioner(): boolean {
  const supabase = getSupabase();
  const user = useUser();
  const [is, setIs] = useState(!supabase);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("members")
      .select("is_commissioner")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIs(Boolean(data?.is_commissioner)));
  }, [supabase, user]);
  return is;
}
