-- Add tracking columns for WhatsApp reminders
ALTER TABLE public.appointments
ADD COLUMN whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN whatsapp_error TEXT;
