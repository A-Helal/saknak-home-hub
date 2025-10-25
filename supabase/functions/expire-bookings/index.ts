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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all pending bookings that have expired
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('booking_requests')
      .select('id, property_id')
      .eq('status', 'pending')
      .eq('payment_confirmed', false)
      .lt('expires_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    console.log('Found expired bookings:', expiredBookings?.length || 0);

    if (expiredBookings && expiredBookings.length > 0) {
      // Update expired bookings to 'expired' status
      const { error: updateError } = await supabase
        .from('booking_requests')
        .update({ status: 'expired' })
        .in('id', expiredBookings.map(b => b.id));

      if (updateError) throw updateError;

      console.log('Expired bookings updated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiredCount: expiredBookings?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error expiring bookings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});