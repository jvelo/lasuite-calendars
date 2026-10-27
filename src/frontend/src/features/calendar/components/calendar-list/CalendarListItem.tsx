/**
 * CalendarListItem components.
 * Display individual calendar items in the list.
 */

import { useTranslation } from "react-i18next";
import { Checkbox } from "@gouvfr-lasuite/ui-components";
import { Mail } from "@gouvfr-lasuite/ui-components/icons";
import { CalendarItemMenu } from "./CalendarItemMenu";

import { DEFAULT_EVENT_COLOR } from "@/features/calendar/constants";
import { isCalendarOwner } from "@/features/calendar/utils/calendar-ownership";
import type { CalendarListItemProps } from "./types";

/**
 * CalendarListItem - Displays an owned or shared calendar.
 */
export const CalendarListItem = ({
  calendar,
  isVisible,
  isMenuOpen,
  mailboxEmail,
  onToggleVisibility,
  onMenuToggle,
  onEdit,
  onDelete,
  onShare,
  onImport,
  onSubscription,
  onMoveUp,
  onMoveDown,
  onCloseMenu,
}: CalendarListItemProps) => {
  const { t } = useTranslation();

  const calendarColor = typeof calendar.color === "string" ? calendar.color : DEFAULT_EVENT_COLOR;
  const isOwner = isCalendarOwner(calendar);

  return (
    <div className={`calendar-list__item ${isMenuOpen ? "calendar-list__item--menu-open" : ""}`}>
      <div
        className="calendar-list__item-checkbox"
        style={{ "--calendar-color": calendarColor } as React.CSSProperties}
      >
        <Checkbox
          checked={isVisible}
          onChange={() => onToggleVisibility(calendar.url)}
          label=""
          aria-label={t("calendar.list.showCalendar", {
            name: calendar.displayName || t("calendar.list.unnamed"),
          })}
        />
      </div>
      <div className="calendar-list__name-wrapper">
        <span className="calendar-list__name" title={calendar.displayName || undefined}>
          {calendar.displayName || t("calendar.list.unnamed")}
        </span>
        {mailboxEmail && (
          <Mail
            className="calendar-list__mailbox-icon"
            aria-label={t("calendar.list.mailboxCalendar", {
              email: mailboxEmail,
            })}
          />
        )}
      </div>
      <div className="calendar-list__item-actions">
        <CalendarItemMenu
          isOpen={isMenuOpen}
          onOpenChange={(open) => (open ? onMenuToggle(calendar.url) : onCloseMenu())}
          onEdit={() => onEdit(calendar)}
          onDelete={isOwner ? () => onDelete(calendar) : undefined}
          onRemove={isOwner ? undefined : () => onDelete(calendar)}
          onShare={onShare ? () => onShare(calendar) : undefined}
          onImport={onImport ? () => onImport(calendar) : undefined}
          onSubscription={onSubscription ? () => onSubscription(calendar) : undefined}
          onMoveUp={onMoveUp ? () => onMoveUp(calendar) : undefined}
          onMoveDown={onMoveDown ? () => onMoveDown(calendar) : undefined}
        />
      </div>
    </div>
  );
};
