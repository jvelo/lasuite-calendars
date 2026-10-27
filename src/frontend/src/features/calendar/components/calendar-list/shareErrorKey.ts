type ShareErrorResult = {
  error?: string;
  status?: number;
};

/** Translation key for a failed share. The two texts come from `MailboxPlugin.php`. */
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
