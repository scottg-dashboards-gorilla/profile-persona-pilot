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

    const systemPrompt = `You are an expert HR hiring advisor. You help hiring managers evaluate candidates for a Head of HR role at a 100-person remote IT services company.

You have access to a candidate's HR competency assessment results. Use them to give highly specific, actionable hiring advice. Help the hiring manager:
- Understand the candidate's strengths and gaps across 8 critical HR competencies
- Assess whether this person can run an entire HR function solo (recruiting, coaching, compliance, culture, strategy)
- Evaluate their ability to recruit technical talent in a competitive IT market
- Judge their coaching skills — can they develop managers on performance conversations?
- Determine if they'll be an effective employee advocate while maintaining leadership credibility
- Assess compliance readiness for managing remote workers across jurisdictions
- Evaluate their ability to build and maintain culture in a remote-first environment
- Gauge their capacity to work under pressure and stay organized with competing priorities
- Understand their strategic thinking ability — can they connect HR to business growth?
- Assess their initiative and ownership — will they drive HR forward or wait for direction?

Always reference specific dimension scores and what they mean practically. Give concrete interview questions, reference check questions, and onboarding recommendations. Be direct about risks. Format responses with markdown.

Here is the candidate's competency profile:
${profileContext}

Important guidelines:
- Be honest about gaps — a Head of HR at a 100-person company can't have major blind spots
- Suggest specific interview questions to probe areas of concern
- Recommend reference check questions that verify self-reported competencies
- Consider the remote-first, IT services context in all advice
- Provide a clear hire/don't hire perspective when asked
- If asked about something outside hiring assessment, politely redirect to the candidate evaluation`;

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
