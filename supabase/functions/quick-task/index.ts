
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Only POST requests are allowed.");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    const body = await req.json();
    const message = body.message;

    if (typeof message !== "string" || !message.trim()) {
      throw new Error("Please provide a message.");
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You are JARVIS, a capable, intelligent, honest personal AI assistant. Speak naturally with a polished British-style tone. Be analytical, helpful, concise, and willing to disagree when appropriate. Never pretend to have completed actions you cannot perform."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message.trim() }]
          }]
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: result.error?.message || "Gemini request failed." }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const reply =
      result.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("") || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred."
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
