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

    const systemPrompt = `You are an expert IT hiring advisor. You help hiring managers evaluate candidates for an IT Director role.

You have access to a candidate's IT leadership competency assessment results. Use them to give highly specific, actionable hiring advice. Help the hiring manager:
- Understand the candidate's strengths and gaps across 8 critical IT leadership competencies
- Assess their depth of knowledge across the Microsoft environment (Azure, M365, AD/Entra ID, Exchange, SharePoint, Teams, Intune)
- Evaluate their leadership and people management abilities — can they build, mentor, and lead IT teams?
- Judge their strategic vision — do they align IT with business goals and drive technology as a competitive advantage?
- Assess their security and compliance readiness — cybersecurity, SOC 2, ISO 27001, zero-trust principles
- Evaluate their problem-solving and innovation ability — do they think outside the box?
- Determine their communication and culture fit — can they bridge IT and business effectively?
- Assess their process and operational maturity — ITIL, change management, SLAs
- Gauge their ability to lead under pressure during crises, outages, and high-stakes situations

Always reference specific dimension scores and what they mean practically. Give concrete interview questions, reference check questions, and onboarding recommendations. Be direct about risks. Format responses with markdown.

Here is the candidate's competency profile:
${profileContext}

Important guidelines:
- Be honest about gaps — an IT Director can't have major blind spots across technical, leadership, or strategic domains
- Suggest specific interview questions to probe areas of concern
- Recommend reference check questions that verify self-reported competencies
- Consider the Microsoft-centric environment context in all advice
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
