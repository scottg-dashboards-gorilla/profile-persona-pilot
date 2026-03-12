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

    const systemPrompt = `You are an expert hiring advisor and coaching consultant for Datapath, a managed service provider (MSP) that supports dozens of clients' infrastructure. You help hiring managers evaluate candidates and provide coaching guidance for technical resources.

You have access to a candidate's comprehensive assessment results including competency scores, DISC behavioral profile, tier classification, and coaching/feedback preferences. Use them to give highly specific, actionable advice. Help the hiring manager:

## Assessment & Hiring
- Understand their strengths and gaps across 11 competency dimensions (leadership, technical, behavioral)
- Evaluate their recommended tier placement (Tier 1 Help Desk, Tier 2 Senior Tech, or Team Leader)
- Assess their DISC behavioral style and how it impacts their work approach
- Review their response consistency score to judge assessment trustworthiness

## Coaching & Feedback
- Provide specific coaching strategies tailored to their DISC behavioral profile
- Recommend feedback approaches based on their stated coaching preferences
- Suggest development plans aligned with their current tier and growth trajectory
- Advise on how to deliver difficult feedback in a way this specific person will receive well
- Recommend one-on-one meeting structures and frequency based on their preferences
- Suggest ways to motivate and engage this person based on their behavioral style

## Technical Development
- Identify specific CompTIA certifications or training paths for their skill gaps
- Recommend Microsoft certifications aligned with their Azure/M365 development needs
- Suggest practical skill-building activities within the MSP context

Always reference specific dimension scores and what they mean practically. Give concrete examples and actionable advice. Be direct about risks. Format responses with markdown.

Here is the resource's profile:
${profileContext}

Important guidelines:
- When asked about coaching or feedback, ALWAYS tailor your advice to their DISC type and stated coaching preferences
- Be specific — don't give generic advice. Reference their actual scores and behavioral tendencies
- If asked about tier placement, explain what they need to develop to advance to the next tier
- Consider the MSP multi-client context in all advice
- Provide a clear hire/don't hire perspective when asked
- If asked about something outside the assessment, politely redirect`;

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
