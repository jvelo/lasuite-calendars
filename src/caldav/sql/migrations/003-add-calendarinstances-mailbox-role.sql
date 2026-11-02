-- Add mailbox_role to calendarinstances.
-- The Messages sync writes the role of the user on the mailbox
-- (admin, sender, editor or viewer) on each sync-managed instance.
-- SabreDAV uses it to let mailbox admins delete a mailbox calendar.
-- Idempotent: safe to run multiple times.

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'calendarinstances'
      AND column_name = 'mailbox_role') THEN
    ALTER TABLE calendarinstances ADD COLUMN mailbox_role VARCHAR(20);
  END IF;
END $$;
