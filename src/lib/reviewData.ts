import { supabase } from "@/integrations/supabase/client";

/** Server-masked reads; base tables remain write targets, never read targets. */
export function reviewData(table: "performance_reviews"): ReturnType<typeof reviews>;
export function reviewData(table: "review_value_ratings"): ReturnType<typeof values>;
export function reviewData(table: "review_question_responses"): ReturnType<typeof questions>;
export function reviewData(table: "performance_reviews" | "review_value_ratings" | "review_question_responses") {
  if (table === "performance_reviews") return reviews();
  if (table === "review_value_ratings") return values();
  return questions();
}
const reviews = () => supabase.from("performance_reviews_visible");
const values = () => supabase.from("review_value_ratings_visible");
const questions = () => supabase.from("review_question_responses_visible");