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

    console.log("Starting monthly rating reminders...");

    // Get the current date
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    console.log(`Checking bookings from ${lastMonth.toISOString()} to ${currentMonth.toISOString()}`);

    // Get all accepted bookings from last month that don't have ratings yet
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("booking_requests")
      .select(`
        id,
        student_id,
        owner_id,
        property_id,
        created_at,
        properties:property_id (
          title
        )
      `)
      .eq("status", "accepted")
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", currentMonth.toISOString());

    if (bookingsError) {
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings from last month`);

    let notificationsSent = 0;

    // Process each booking
    for (const booking of bookings || []) {
      // Check if student has already rated owner for this booking
      const { data: studentRating, error: studentRatingError } = await supabaseClient
        .from("ratings")
        .select("id")
        .eq("from_user", booking.student_id)
        .eq("to_user", booking.owner_id)
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (studentRatingError) {
        console.error(`Error checking student rating:`, studentRatingError);
        continue;
      }

      // Send notification to student if they haven't rated yet
      if (!studentRating) {
        const propertyTitle = booking.properties?.title || "the property";
        
        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.student_id,
            title: "Rate Your Owner",
            body: `Please rate your experience with the owner of "${propertyTitle}". Your feedback helps our community!`,
          });

        if (notificationError) {
          console.error(`Error sending student notification:`, notificationError);
        } else {
          notificationsSent++;
          console.log(`Rating reminder sent to student for booking ${booking.id}`);
        }
      }

      // Check if owner has already rated student for this booking
      const { data: ownerRating, error: ownerRatingError } = await supabaseClient
        .from("ratings")
        .select("id")
        .eq("from_user", booking.owner_id)
        .eq("to_user", booking.student_id)
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (ownerRatingError) {
        console.error(`Error checking owner rating:`, ownerRatingError);
        continue;
      }

      // Send notification to owner if they haven't rated yet
      if (!ownerRating) {
        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.owner_id,
            title: "Rate Your Tenant",
            body: `Please rate your experience with your tenant. Your feedback helps maintain quality in our community!`,
          });

        if (notificationError) {
          console.error(`Error sending owner notification:`, notificationError);
        } else {
          notificationsSent++;
          console.log(`Rating reminder sent to owner for booking ${booking.id}`);
        }
      }
    }

    console.log(`Monthly rating reminders complete. Sent ${notificationsSent} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        bookingsChecked: bookings?.length || 0,
        notificationsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-monthly-ratings function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
