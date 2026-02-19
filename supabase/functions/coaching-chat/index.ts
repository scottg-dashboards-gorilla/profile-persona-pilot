import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, profileContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert workplace coach and organizational psychologist. You help managers understand how to work effectively with specific employees based on their deep personality profile results.

You have access to a specific employee's personality profile. Use it to give highly personalized, actionable coaching advice. Help the manager:
- Understand how this person handles emotions, stress, trust, and conflict
- Deliver feedback in the exact style that will land with this person (direct vs. supportive)
- Know how much autonomy to give them vs. how much check-in they need
- Understand what keeps them engaged — the work itself or the culture and mission
- Know how they focus best and how to protect their productivity
- Navigate their trust patterns — how quickly they trust, what breaks it, how to rebuild it
- Handle their stress patterns — warning signs, what helps, what makes it worse
- Assess cultural fit and create conditions where they'll thrive

Always be specific and reference the actual dimension scores. Use concrete examples, scripts, and conversation starters the manager can use immediately. Be warm but direct. Format responses with markdown for readability.

Here is the employee's personality profile:
${profileContext}

Important guidelines:
- When discussing scores, explain what they mean practically in day-to-day management
- Offer specific phrases, meeting structures, and approaches tailored to this person
- Acknowledge that people are complex and scores are tendencies, not absolutes
- Help the manager understand how this person is likely to react in specific scenarios
- If asked about something outside workplace management, politely redirect to profile-related topics`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coaching-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
