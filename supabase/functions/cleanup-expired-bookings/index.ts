import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("Starting cleanup of expired bookings...");

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all pending bookings older than 7 days
    const { data: expiredBookings, error: fetchError } = await supabaseClient
      .from("booking_requests")
      .select("id, student_id, property_id, properties:property_id(title)")
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${expiredBookings?.length || 0} expired bookings`);

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired bookings to clean up",
          expiredCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Update all expired bookings to 'expired' status
    const { error: updateError } = await supabaseClient
      .from("booking_requests")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (updateError) {
      throw updateError;
    }

    // Send notifications to students about expired bookings
    let notificationsSent = 0;
    for (const booking of expiredBookings) {
      const propertyTitle = booking.properties?.title || "a property";
      
      const { error: notificationError } = await supabaseClient
        .from("notifications")
        .insert({
          user_id: booking.student_id,
          title: "Booking Expired",
          body: `Your booking request for "${propertyTitle}" has expired due to inactivity.`,
        });

      if (notificationError) {
        console.error(`Error sending notification for booking ${booking.id}:`, notificationError);
      } else {
        notificationsSent++;
      }
    }

    console.log(`Cleanup complete. Expired ${expiredBookings.length} bookings and sent ${notificationsSent} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        expiredCount: expiredBookings.length,
        notificationsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in cleanup-expired-bookings function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
