import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (propertiesError) throw propertiesError;

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI
    const propertiesContext = properties.map(p => ({
      id: p.id,
      title: p.title,
      rental_type: p.rental_type,
      price: p.price,
      address: p.address,
      num_rooms: p.num_rooms,
      num_beds: p.num_beds,
      furnished: p.furnished,
      has_internet: p.has_internet,
      gender_preference: p.gender_preference
    }));

    const systemPrompt = `You are a property recommendation assistant. Based on user preferences, recommend the best 3-4 properties from the available list.
    
Consider:
- Rental type preference (apartment, room, bed)
- Price range
- Location preference
- Amenities (furnished, internet)
- Number of rooms/beds

Return ONLY a JSON array of property IDs in order of recommendation (best first). Example: ["id1", "id2", "id3"]`;

    const userPrompt = `User preferences: ${JSON.stringify(preferences)}

Available properties:
${JSON.stringify(propertiesContext, null, 2)}

Recommend 3-4 properties that best match the user's preferences. Return only the property IDs as a JSON array.`;

    console.log('Calling AI with preferences:', preferences);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse the AI response to extract property IDs
    let recommendedIds: string[] = [];
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        recommendedIds = parsed;
      }
    } catch (e) {
      // If not valid JSON, try to extract IDs from text
      const matches = content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
      if (matches) {
        recommendedIds = matches.slice(0, 4);
      }
    }

    // Filter properties to only include recommended ones
    const recommendations = properties
      .filter(p => recommendedIds.includes(p.id))
      .sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id));

    console.log('Recommended properties:', recommendations.length);

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recommend-properties:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});