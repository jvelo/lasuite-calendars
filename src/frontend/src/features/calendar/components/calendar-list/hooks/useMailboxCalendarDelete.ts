/**
 * useMailboxCalendarDelete hook.
 * Manages the confirmation of a mailbox calendar delete for every user.
 */

import { useState, useCallback } from "react";

import type { CalDavCalendar } from "../../../services/dav/types/caldav-service";

interface UseMailboxCalendarDeleteProps {
  deleteMailboxCalendar: (
    calendarUrl: string,
    mailboxEmail: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onError: () => void;
}

export const useMailboxCalendarDelete = ({
  deleteMailboxCalendar,
  onError,
}: UseMailboxCalendarDeleteProps) => {
  const [calendar, setCalendar] = useState<CalDavCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback((target: CalDavCalendar) => setCalendar(target), []);

  const close = useCallback(() => {
    setCalendar(null);
    setIsLoading(false);
  }, []);

  const confirm = useCallback(async () => {
    if (!calendar?.mailboxEmail) return;

    setIsLoading(true);
    const result = await deleteMailboxCalendar(calendar.url, calendar.mailboxEmail);
    close();
    if (!result.success) {
      console.error("Failed to delete mailbox calendar:", result.error);
      onError();
    }
  }, [calendar, deleteMailboxCalendar, close, onError]);

  return { calendar, isLoading, open, close, confirm };
};
