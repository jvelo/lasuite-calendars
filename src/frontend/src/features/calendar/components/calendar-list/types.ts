/**
 * Type definitions for CalendarList components.
 */

import type { CalDavCalendar } from "../../services/dav/types/caldav-service";

/**
 * Props for the CalendarModal component.
 */
export interface CalendarModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  calendar?: CalDavCalendar | null;
  onClose: () => void;
  onSave: (
    name: string,
    color: string,
    mailboxEmail?: string,
    includeInAvailability?: boolean,
  ) => Promise<void>;
  isOnboarding?: boolean;
}

/**
 * Props for the CalendarItemMenu component.
 */
export interface CalendarItemMenuProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEdit: () => void;
  /** Deletes the calendar for every user. Set it for the owner only. */
  onDelete?: () => void;
  /** Removes only the current user's access. Set it for a sharee only. */
  onRemove?: () => void;
  /**
   * Shows the delete or remove action as disabled, with a note.
   * Messages manages the access to this calendar, so the server
   * refuses a delete.
   */
  isManagedByMessages?: boolean;
  onShare?: () => void;
  onImport?: () => void;
  onSubscription?: () => void;
  /** Pass `undefined` when at the bucket boundary to hide the entry. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

/**
 * Props for the DeleteConfirmModal component.
 */
export interface DeleteConfirmModalProps {
  isOpen: boolean;
  calendar: CalDavCalendar | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

/**
 * Props for the CalendarListItem component.
 */
export interface CalendarListItemProps {
  calendar: CalDavCalendar;
  isVisible: boolean;
  isMenuOpen: boolean;
  /** Mailbox email if this calendar is mailbox-backed; undefined otherwise. */
  mailboxEmail?: string;
  onToggleVisibility: (url: string) => void;
  onMenuToggle: (url: string) => void;
  onEdit: (calendar: CalDavCalendar) => void;
  /** Asks to delete the calendar, or to remove it for a sharee. */
  onDelete: (calendar: CalDavCalendar) => void;
  onShare?: (calendar: CalDavCalendar) => void;
  onImport?: (calendar: CalDavCalendar) => void;
  onSubscription?: (calendar: CalDavCalendar) => void;
  /** Pass `undefined` at the bucket boundary to hide the entry. */
  onMoveUp?: (calendar: CalDavCalendar) => void;
  onMoveDown?: (calendar: CalDavCalendar) => void;
  onCloseMenu: () => void;
}

/**
 * State for the calendar modal.
 */
export interface CalendarModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  calendar: CalDavCalendar | null;
}

/**
 * State for the share modal.
 */
export interface ShareModalState {
  isOpen: boolean;
  calendar: CalDavCalendar | null;
}

/**
 * State for the delete confirmation.
 */
export interface DeleteState {
  isOpen: boolean;
  calendar: CalDavCalendar | null;
  isLoading: boolean;
}
