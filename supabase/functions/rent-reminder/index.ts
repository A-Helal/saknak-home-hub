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

    console.log("Starting rent reminder check...");

    // Get all bookings with unpaid rent
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("booking_requests")
      .select(`
        id,
        user_id,
        property_id,
        rent_due_date,
        rent_paid_date,
        status,
        properties:property_id (
          title,
          address,
          owner_id
        )
      `)
      .eq("status", "accepted")
      .is("rent_paid_date", null)
      .not("rent_due_date", "is", null);

    if (bookingsError) {
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings with unpaid rent`);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    let notificationsSent = 0;

    // Process each booking
    for (const booking of bookings || []) {
      const dueDate = new Date(booking.rent_due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      // Calculate days difference
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      console.log(`Booking ${booking.id}: ${diffDays} days until due`);

      // Send reminder if exactly 5 days before due date
      if (diffDays === 5) {
        const propertyTitle = booking.properties?.title || "your property";
        
        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.user_id,
            title: "⏰ موعد دفع الإيجار قريب",
            body: `موعد دفع إيجار "${propertyTitle}" بعد 5 أيام. ادفع خلال هذه الفترة واحصل على +10 نقاط!`,
          });

        if (notificationError) {
          console.error(`Error sending notification for booking ${booking.id}:`, notificationError);
        } else {
          notificationsSent++;
          console.log(`Notification sent for booking ${booking.id}`);
        }
      }

      // Send urgent reminder if 1 day before or on due date
      else if (diffDays <= 1 && diffDays >= 0) {
        const propertyTitle = booking.properties?.title || "your property";
        const message = diffDays === 0 
          ? `إيجار "${propertyTitle}" مستحق اليوم!`
          : `إيجار "${propertyTitle}" مستحق غداً!`;
        
        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.user_id,
            title: "🚨 عاجل: موعد دفع الإيجار",
            body: message,
          });

        if (notificationError) {
          console.error(`Error sending urgent notification for booking ${booking.id}:`, notificationError);
        } else {
          notificationsSent++;
          console.log(`Urgent notification sent for booking ${booking.id}`);
        }
      }

      // Mark as overdue if past due date
      else if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        const propertyTitle = booking.properties?.title || "your property";
        
        const { error: notificationError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.user_id,
            title: "⚠️ تأخر دفع الإيجار",
            body: `إيجار "${propertyTitle}" متأخر ${daysOverdue} يوم. يرجى الدفع في أقرب وقت ممكن.`,
          });

        if (notificationError) {
          console.error(`Error sending overdue notification for booking ${booking.id}:`, notificationError);
        } else {
          notificationsSent++;
          console.log(`Overdue notification sent for booking ${booking.id}`);
        }

        // Also notify owner
        const ownerNotificationError = await supabaseClient
          .from("notifications")
          .insert({
            user_id: booking.properties?.owner_id,
            title: "⚠️ تأخر إيجار المستأجر",
            body: `إيجار "${propertyTitle}" متأخر ${daysOverdue} يوم.`,
          });

        if (ownerNotificationError) {
          console.error(`Error sending owner notification for booking ${booking.id}:`, ownerNotificationError);
        }
      }
    }

    console.log(`Rent reminder check complete. Sent ${notificationsSent} notifications.`);

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
    console.error("Error in rent-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
