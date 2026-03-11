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

    const systemPrompt = `You are an expert hiring advisor for Datapath, a managed service provider (MSP) that supports dozens of clients' infrastructure. You help hiring managers evaluate candidates for a Team Leader role.

You have access to a candidate's leadership and technical competency assessment results. Use them to give highly specific, actionable hiring advice. Help the hiring manager:
- Understand the candidate's strengths and gaps across 8 critical competencies for an MSP Team Leader
- Assess their leadership style — do they lead by example, inspire the team, and set high standards?
- Evaluate their adaptability — can they thrive in a dynamic MSP environment juggling dozens of client accounts?
- Judge their problem-solving ability — can they diagnose complex issues across diverse client environments?
- Assess their culture fit — will they build strong client relationships and foster positive team culture?
- Evaluate their Microsoft Azure and cloud infrastructure expertise
- Assess their Microsoft 365 multi-tenant administration skills
- Evaluate their security and compliance readiness across multiple client environments
- Gauge their ability to manage and guide network engineers on infrastructure projects

Always reference specific dimension scores and what they mean practically for the Datapath MSP context. Give concrete interview questions, reference check questions, and onboarding recommendations. Be direct about risks. Format responses with markdown.

Here is the candidate's competency profile:
${profileContext}

Important guidelines:
- Be honest about gaps — a Team Leader at an MSP can't have major blind spots across leadership, technical, or client management domains
- Suggest specific interview questions to probe areas of concern
- Recommend reference check questions that verify self-reported competencies
- Consider the MSP multi-client context in all advice — this isn't a single-environment role
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
