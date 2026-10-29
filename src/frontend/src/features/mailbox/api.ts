import { fetchAPI } from "@/features/api/fetchApi";

import type { MailboxSyncResult } from "./types";

export async function fetchMailboxes(): Promise<MailboxSyncResult> {
  const response = await fetchAPI("setup/mailboxes/");
  return response.json();
}

export async function setupCalendar(
  name: string,
  mailboxEmail?: string,
  color?: string,
): Promise<{
  calendar_path: string;
  principal_uri: string;
  mailbox_email?: string;
}> {
  const body: Record<string, string> = { name };
  if (mailboxEmail) body.mailbox_email = mailboxEmail;
  if (color) body.color = color;
  const response = await fetchAPI("setup/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * Deletes a mailbox calendar for every user of the mailbox.
 *
 * `calendarUri` is the URI of the user's own instance of the calendar.
 */
export async function deleteMailboxCalendar(
  mailboxEmail: string,
  calendarUri: string,
): Promise<void> {
  await fetchAPI(
    `mailboxes/${encodeURIComponent(mailboxEmail)}/calendars/${encodeURIComponent(calendarUri)}/`,
    { method: "DELETE" },
  );
}
