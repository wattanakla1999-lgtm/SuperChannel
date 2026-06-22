"use client";

import { useFormatter, useLocale } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { classNames } from "@/lib/class-names";

type DatePickerProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const weekDays = [0, 1, 2, 3, 4, 5, 6];
const DATE_PICKER_POPOVER_WIDTH = 320;
const DATE_PICKER_VIEWPORT_MARGIN = 16;

function toInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function DatePicker({
  ariaLabel,
  className,
  disabled = false,
  id,
  max,
  min,
  onChange,
  placeholder,
  value,
}: DatePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const format = useFormatter();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [horizontalAnchor, setHorizontalAnchor] = useState<"left" | "right">("left");
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? parseDate(min ?? "") ?? new Date(),
  );

  useEffect(() => {
    if (!isOpen) return;

    const updatePopoverPosition = () => {
      const rootBounds = rootRef.current?.getBoundingClientRect();
      if (!rootBounds) return;

      const availableRight = window.innerWidth - rootBounds.left - DATE_PICKER_VIEWPORT_MARGIN;
      setHorizontalAnchor(
        availableRight < DATE_PICKER_POPOVER_WIDTH && rootBounds.right > DATE_PICKER_POPOVER_WIDTH
          ? "right"
          : "left",
      );
    };

    updatePopoverPosition();

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    document.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
      document.removeEventListener("pointerdown", close);
    };
  }, [isOpen]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1, 12).getDay();
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : new Date(year, month, index - firstDay + 1, 12),
  );
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });

  const chooseDate = (date: Date) => {
    onChange(toInputValue(date));
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={classNames("relative min-w-0", className)}>
      <input
        id={controlId}
        type="date"
        aria-label={ariaLabel}
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-11 w-full opacity-0"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={disabled}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-slate-800"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={classNames(!selectedDate && "text-slate-400")}>
          {selectedDate
            ? format.dateTime(selectedDate, { day: "numeric", month: "short", year: "numeric" })
            : placeholder ?? ariaLabel}
        </span>
        <span aria-hidden="true">▦</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={classNames(
            "absolute z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950",
            horizontalAnchor === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700" onClick={() => setVisibleMonth(new Date(year, month - 1, 1, 12))} aria-label="Previous month">←</button>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              {format.dateTime(new Date(year, month, 1, 12), { month: "long", year: "numeric" })}
            </p>
            <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700" onClick={() => setVisibleMonth(new Date(year, month + 1, 1, 12))} aria-label="Next month">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <span key={day} className="py-1 text-xs font-semibold text-slate-400">
                {weekdayFormatter.format(new Date(2026, 5, 21 + day, 12))}
              </span>
            ))}
            {days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const dateValue = toInputValue(date);
              const isDisabled = Boolean((min && dateValue < min) || (max && dateValue > max));
              const isSelected = dateValue === value;
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  className={classNames(
                    "aspect-square rounded-xl text-sm transition disabled:opacity-25",
                    isSelected
                      ? "bg-slate-950 font-semibold text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                  onClick={() => chooseDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
