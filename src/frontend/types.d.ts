declare module "@event-calendar/core" {
  export interface Calendar {
    setOption: (name: string, value: unknown) => void;
    getOption: (name: string) => unknown;
    refetchEvents: () => void;
    addEvent: (event: unknown) => void;
    updateEvent: (event: unknown) => void;
    removeEventById: (id: string) => void;
    unselect: () => void;
  }

  export function createCalendar(
    el: HTMLElement,
    plugins: unknown[],
    options: Record<string, unknown>,
  ): Calendar;

  export function destroyCalendar(calendar: Calendar): void;

  export const TimeGrid: unknown;
  export const DayGrid: unknown;
  export const List: unknown;
  export const Interaction: unknown;
  export const ResourceTimeGrid: unknown;
  export const ResourceTimeline: unknown;
}

declare module "@event-calendar/core/index.css";
