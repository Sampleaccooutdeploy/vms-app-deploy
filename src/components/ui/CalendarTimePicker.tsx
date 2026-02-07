"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import styles from "./CalendarTimePicker.module.css";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarDaysIcon,
    ClockIcon,
    XMarkIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface CalendarTimePickerProps {
    selectedDate: string;        // "YYYY-MM-DD" or ""
    selectedTime: string;        // "HH:MM" or ""
    onDateChange: (date: string) => void;
    onTimeChange: (time: string) => void;
    minDate?: Date;              // Defaults to today
    /** Label shown above the picker trigger */
    label?: string;
    /** Hint text shown below */
    hint?: string;
}

/* ─── Helpers ─── */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
] as const;

/** Generate 15-min time slots from 09:00 to 18:00 (9 AM → 6 PM) */
const TIME_SLOTS = Array.from({ length: 37 }, (_, i) => {
    const totalMinutes = i * 15;
    const hour = Math.floor(totalMinutes / 60) + 9;
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

/** Format "HH:MM" → "9:00 AM" */
function formatTime12(time24: string): string {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
}

/** Format "YYYY-MM-DD" → "Fri, 7 Feb 2026" */
function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Strip time from date for comparison — returns "YYYY-MM-DD" */
function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get calendar grid cells for a given month/year */
function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells: { day: number; inMonth: boolean; date: Date }[] = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevDays - i;
        cells.push({ day: d, inMonth: false, date: new Date(year, month - 1, d) });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }

    // Next month leading days (fill to 42 = 6 rows)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
    }

    return cells;
}

/* ─── Component ─── */
export default function CalendarTimePicker({
    selectedDate,
    selectedTime,
    onDateChange,
    onTimeChange,
    minDate,
    label,
    hint,
}: CalendarTimePickerProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timePanelRef = useRef<HTMLDivElement>(null);

    // Calendar view state
    const today = useMemo(() => new Date(), []);
    const effectiveMinDate = minDate || today;
    const minDateKey = toDateKey(effectiveMinDate);

    const initialMonth = selectedDate
        ? new Date(selectedDate + "T00:00:00").getMonth()
        : today.getMonth();
    const initialYear = selectedDate
        ? new Date(selectedDate + "T00:00:00").getFullYear()
        : today.getFullYear();

    const [viewMonth, setViewMonth] = useState(initialMonth);
    const [viewYear, setViewYear] = useState(initialYear);

    // Calendar grid
    const calendarDays = useMemo(
        () => getCalendarDays(viewYear, viewMonth),
        [viewYear, viewMonth]
    );

    const todayKey = toDateKey(today);

    // Navigation
    const goToPrevMonth = useCallback(() => {
        setViewMonth((m) => {
            if (m === 0) {
                setViewYear((y) => y - 1);
                return 11;
            }
            return m - 1;
        });
    }, []);

    const goToNextMonth = useCallback(() => {
        setViewMonth((m) => {
            if (m === 11) {
                setViewYear((y) => y + 1);
                return 0;
            }
            return m + 1;
        });
    }, []);

    // Can't go before the min date month
    const canGoPrev = useMemo(() => {
        const minM = effectiveMinDate.getMonth();
        const minY = effectiveMinDate.getFullYear();
        return viewYear > minY || (viewYear === minY && viewMonth > minM);
    }, [viewYear, viewMonth, effectiveMinDate]);

    // Select a date
    const handleDateSelect = useCallback(
        (dateKey: string) => {
            onDateChange(dateKey);
        },
        [onDateChange]
    );

    // Select time
    const handleTimeSelect = useCallback(
        (time: string) => {
            onTimeChange(time);
        },
        [onTimeChange]
    );

    // Clear the selection
    const handleClear = useCallback(() => {
        onDateChange("");
        onTimeChange("");
    }, [onDateChange, onTimeChange]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Auto-scroll time panel to selected time
    useEffect(() => {
        if (!open || !selectedTime || !timePanelRef.current) return;
        const btn = timePanelRef.current.querySelector(`[data-time="${selectedTime}"]`) as HTMLElement | null;
        if (btn) {
            btn.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [open, selectedTime]);

    // Display text for the trigger
    const triggerText = useMemo(() => {
        if (!selectedDate && !selectedTime) return null;
        const parts: string[] = [];
        if (selectedDate) parts.push(formatDateDisplay(selectedDate));
        if (selectedTime) parts.push(formatTime12(selectedTime));
        return parts.join(" at ");
    }, [selectedDate, selectedTime]);

    return (
        <div className={styles.pickerWrapper} ref={wrapperRef}>
            {label && (
                <label className={styles.pickerLabel}>
                    <CalendarDaysIcon className={styles.labelIcon} />
                    {label}
                </label>
            )}

            {/* Trigger Row */}
            <div className={styles.triggerRow}>
                <button
                    type="button"
                    className={cn(styles.trigger, open && styles.triggerActive)}
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <CalendarDaysIcon className={styles.triggerIcon} />
                    {triggerText ? (
                        <span className={styles.triggerValue}>{triggerText}</span>
                    ) : (
                        <span className={styles.triggerPlaceholder}>Pick date &amp; time</span>
                    )}
                </button>
                {triggerText && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                        }}
                        aria-label="Clear selection"
                    >
                        <XMarkIcon className={styles.clearIcon} />
                    </button>
                )}
            </div>

            {hint && <span className={styles.pickerHint}>{hint}</span>}

            {/* Dropdown Panel */}
            {open && (
                <div className={styles.dropdown} role="dialog" aria-label="Pick date and time">
                    <div className={styles.dropdownInner}>
                        {/* Calendar Section */}
                        <div className={styles.calendarSection}>
                            {/* Month Navigation */}
                            <div className={styles.calendarNav}>
                                <button
                                    type="button"
                                    className={styles.navBtn}
                                    onClick={goToPrevMonth}
                                    disabled={!canGoPrev}
                                    aria-label="Previous month"
                                >
                                    <ChevronLeftIcon className={styles.navIcon} />
                                </button>
                                <span className={styles.monthLabel}>
                                    {MONTHS[viewMonth]} {viewYear}
                                </span>
                                <button
                                    type="button"
                                    className={styles.navBtn}
                                    onClick={goToNextMonth}
                                    aria-label="Next month"
                                >
                                    <ChevronRightIcon className={styles.navIcon} />
                                </button>
                            </div>

                            {/* Weekday Headers */}
                            <div className={styles.weekdayRow}>
                                {WEEKDAYS.map((wd) => (
                                    <div key={wd} className={styles.weekdayCell}>
                                        {wd}
                                    </div>
                                ))}
                            </div>

                            {/* Day Grid */}
                            <div className={styles.dayGrid}>
                                {calendarDays.map((cell, idx) => {
                                    const key = toDateKey(cell.date);
                                    const isPast = key < minDateKey;
                                    const isToday = key === todayKey;
                                    const isSelected = key === selectedDate;
                                    const isOutside = !cell.inMonth;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={isPast || isOutside}
                                            className={cn(
                                                styles.dayCell,
                                                isOutside && styles.dayOutside,
                                                isPast && styles.dayDisabled,
                                                isToday && !isSelected && styles.dayToday,
                                                isSelected && styles.daySelected
                                            )}
                                            onClick={() => !isPast && !isOutside && handleDateSelect(key)}
                                            aria-label={`${cell.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                                            aria-pressed={isSelected}
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Slots Section */}
                        <div className={styles.timeSection} ref={timePanelRef}>
                            <div className={styles.timeSectionHeader}>
                                <ClockIcon className={styles.timeHeaderIcon} />
                                <span>Time</span>
                            </div>
                            <div className={styles.timeSlotsList}>
                                {TIME_SLOTS.map((time) => (
                                    <button
                                        key={time}
                                        type="button"
                                        data-time={time}
                                        className={cn(
                                            styles.timeSlot,
                                            selectedTime === time && styles.timeSlotSelected
                                        )}
                                        onClick={() => handleTimeSelect(time)}
                                    >
                                        {formatTime12(time)}
                                        {selectedTime === time && (
                                            <CheckIcon className={styles.timeCheckIcon} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.dropdownFooter}>
                        <div className={styles.footerSummary}>
                            {selectedDate && selectedTime ? (
                                <>
                                    Your visit is scheduled for{" "}
                                    <strong>{formatDateDisplay(selectedDate)}</strong> at{" "}
                                    <strong>{formatTime12(selectedTime)}</strong>
                                </>
                            ) : selectedDate ? (
                                <>
                                    <strong>{formatDateDisplay(selectedDate)}</strong> — now pick a time
                                </>
                            ) : (
                                <>Select a date and time for your visit</>
                            )}
                        </div>
                        <button
                            type="button"
                            className={styles.doneBtn}
                            disabled={!selectedDate && !selectedTime}
                            onClick={() => setOpen(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
