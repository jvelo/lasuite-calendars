type ShareErrorResult = {
  error?: string;
  status?: number;
};

/**
 * Return the translation key for a failed share request.
 *
 * The CalDAV server writes its error messages in English, so the UI
 * never shows them as they are. The two texts below come from
 * `src/caldav/src/MailboxPlugin.php`.
 */
export const getShareErrorKey = ({ error, status }: ShareErrorResult, fallbackKey: string) => {
  if (error?.includes("managed by Messages")) {
    return "calendar.shareCalendar.errorSyncManaged";
  }
  if (error?.includes("only be shared with read-only access")) {
    return "calendar.shareCalendar.errorMailboxReadOnly";
  }
  if (status === 403) {
    return "calendar.shareCalendar.errorForbidden";
  }
  return fallbackKey;
};
