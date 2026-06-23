"use client";

import { useEffect, useId, useRef, useState } from "react";
import { classNames } from "@/lib/class-names";

export type DropdownOption = {
  disabled?: boolean;
  label: string;
  value: string;
  group?: string;
};

type DropdownProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  testId?: string;
  value: string;
};

export function Dropdown({
  ariaLabel,
  className,
  disabled = false,
  id,
  onChange,
  options,
  testId,
  value,
}: DropdownProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group ?? "";
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, DropdownOption[]>);

  const groups = Object.keys(groupedOptions);

  return (
    <div ref={rootRef} className={classNames("relative min-w-0", className)}>
      <select
        id={controlId}
        aria-label={ariaLabel}
        data-testid={testId}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-11 w-full opacity-0"
        tabIndex={-1}
      >
        {groups.map((group) => {
          if (!group) {
            return groupedOptions[group].map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ));
          }
          return (
            <optgroup key={group} label={group}>
              {groupedOptions[group].map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800 dark:disabled:bg-slate-800"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <span aria-hidden="true" className={classNames("text-xs transition", isOpen && "rotate-180")}>
          ▼
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 mt-2 max-h-64 w-full min-w-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950"
        >
          {groups.map((group) => (
            <div key={group || "nogroup"}>
              {group && (
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {group}
                </div>
              )}
              {groupedOptions[group].map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={classNames(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition outline-none disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected
                        ? "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900",
                    )}
                    onClick={() => selectOption(option.value)}
                  >
                    <span className={classNames("truncate", isSelected && "font-medium")}>
                      {option.label}
                    </span>
                    {isSelected ? (
                      <span aria-hidden="true" className="text-cyan-600 dark:text-cyan-500">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
