import { supabase } from "@/integrations/supabase/client";

/** Server-masked reads; base tables remain write targets, never read targets. */
export function reviewData(table: "performance_reviews" | "review_value_ratings" | "review_question_responses") {
  // Views preserve the base row shape; generated types catch up on regeneration.
  return supabase.from(`${table}_visible` as "performance_reviews");
}