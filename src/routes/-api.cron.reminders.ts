import { createAPIFileRoute } from '@tanstack/react-start/api';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const APIRoute = createAPIFileRoute('/api/cron/reminders')({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const secret = url.searchParams.get("secret");
      
      if (secret !== process.env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }

      // Calculate tomorrow's start and end date
      const tomorrowStart = new Date();
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Fetch scheduled appointments for tomorrow that haven't been reminded yet
      const { data: appointments, error: fetchError } = await supabaseAdmin
        .from("appointments")
        .select(`
          id, start_time, reason, owner_name, pet_name, phone, patient:patient_id(owner_name, name, owner_phone)
        `)
        .eq("status", "scheduled")
        .eq("whatsapp_sent", false)
        .gte("start_time", tomorrowStart.toISOString())
        .lte("start_time", tomorrowEnd.toISOString());

      if (fetchError) throw fetchError;

      if (!appointments || appointments.length === 0) {
        return new Response(JSON.stringify({ ok: true, message: "No appointments to remind" }));
      }

      const results = [];

      for (const appt of appointments) {
        const phone = appt.phone || appt.patient?.owner_phone;
        const ownerName = appt.owner_name || appt.patient?.owner_name || "Cliente";
        const petName = appt.pet_name || appt.patient?.name || "tu mascota";
        
        if (!phone) {
          await supabaseAdmin.from("appointments").update({ whatsapp_error: "No phone number" }).eq("id", appt.id);
          results.push({ id: appt.id, status: "skipped (no phone)" });
          continue;
        }

        const dateObj = new Date(appt.start_time);
        const timeString = dateObj.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

        const message = `Hola ${ownerName}, te recordamos que ${petName} tiene una cita programada mañana a las ${timeString} por motivo de: ${appt.reason}. ¡Te esperamos!`;

        try {
          // Send via Twilio
          const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioPhone = process.env.TWILIO_PHONE_NUMBER; // e.g. whatsapp:+14155238886

          if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
            throw new Error("Twilio credentials not configured");
          }

          const params = new URLSearchParams();
          params.append('To', `whatsapp:${phone}`);
          params.append('From', twilioPhone);
          params.append('Body', message);

          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
          });

          if (!twilioRes.ok) {
            const errData = await twilioRes.text();
            throw new Error(`Twilio Error: ${errData}`);
          }

          // Mark as sent
          await supabaseAdmin.from("appointments").update({ whatsapp_sent: true, whatsapp_error: null }).eq("id", appt.id);
          results.push({ id: appt.id, status: "sent" });

        } catch (err: any) {
          console.error("WhatsApp Error:", err);
          await supabaseAdmin.from("appointments").update({ whatsapp_error: err.message }).eq("id", appt.id);
          results.push({ id: appt.id, status: "error", error: err.message });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }
});
