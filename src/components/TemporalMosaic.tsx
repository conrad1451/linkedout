import type { CSSProperties } from 'react';
import {
  createYearMosaic,
  type YearMosaicDay,
  type YearMosaicMonth,
} from '../lib/datetime/yearMosaic';

export type TemporalMosaicSelection = { kind: 'month'; key: string } | { kind: 'day'; key: string };

export interface TemporalMosaicProps {
  year: number;
  countsByDay: ReadonlyMap<string, number> | Readonly<Record<string, number>>;
  selected?: TemporalMosaicSelection;
  itemLabel?: string;
  itemPluralLabel?: string;
  ariaLabel?: string;
  onMonthSelect?: (monthKey: string) => void;
  onDaySelect?: (dayKey: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short' });
const FULL_MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const WEEKDAY_TOP_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SELECTED_BORDER_COLOR = 'color-mix(in oklch, var(--color-primary) 62%, white)';
const TILE_SIZE_REM = 0.75;
const TILE_GAP_REM = 0.125;
const WEEKDAY_LABEL_WIDTH_REM = 1.5;
const HORIZONTAL_SECTION_GAP_REM = 0.5;
const MONTH_ROW_HEIGHT_REM = 1;
const MONTH_LABEL_WIDTH_REM = 2.25;
const TILE_SIZE = `${TILE_SIZE_REM}rem`;
const MONTH_ROW_HEIGHT = `${MONTH_ROW_HEIGHT_REM}rem`;
const MONTH_LABEL_WIDTH = `${MONTH_LABEL_WIDTH_REM}rem`;
const LEVEL_CLASSES = [
  'bg-base-300/70 hover:bg-base-300',
  'bg-primary/25 hover:bg-primary/35',
  'bg-primary/45 hover:bg-primary/55',
  'bg-primary/65 hover:bg-primary/75',
  'bg-primary hover:bg-primary',
] as const;

export function TemporalMosaic({
  year,
  countsByDay,
  selected,
  itemLabel = 'item',
  itemPluralLabel,
  ariaLabel,
  onMonthSelect,
  onDaySelect,
  orientation = 'horizontal',
}: TemporalMosaicProps) {
  const mosaic = createYearMosaic(year, countsByDay);
  const gridStyle =
    orientation === 'horizontal'
      ? gridTemplateStyle(mosaic.weekCount)
      : gridTemplateStyleVertical(mosaic.weekCount);
  const monthGridStyle =
    orientation === 'horizontal'
      ? monthGridTemplateStyle(mosaic.weekCount)
      : monthGridTemplateStyleVertical(mosaic.weekCount);

  return (
    <div aria-label={ariaLabel} className="m-0 p-0 bg-transparent border-0 rounded-none">
      <div className="overflow-x-auto pb-0">
        {orientation === 'horizontal' ? (
          <div
            className="grid w-full gap-x-2 gap-y-0.5"
            style={horizontalLayoutStyle(mosaic.weekCount)}
          >
            <div aria-hidden="true" />
            <div className="grid gap-0.5" style={monthGridStyle} aria-label={`${year} months`}>
              {mosaic.months.map((month, index) => (
                <MonthButton
                  key={month.key}
                  month={month}
                  nextMonth={mosaic.months[index + 1]}
                  weekCount={mosaic.weekCount}
                  selected={selected?.kind === 'month' && selected.key === month.key}
                  itemLabel={itemLabel}
                  itemPluralLabel={itemPluralLabel}
                  onClick={onMonthSelect}
                  orientation={orientation}
                />
              ))}
            </div>

            <div
              className="grid self-stretch gap-0.5 text-[0.625rem] leading-3 opacity-60"
              style={weekdayLabelGridStyle()}
              aria-hidden="true"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <div key={`${label}-${index}`} className="flex items-center justify-end text-right">
                  {label}
                </div>
              ))}
            </div>

            <div
              className="grid gap-0.5"
              style={gridStyle}
              role="group"
              aria-label={ariaLabel ?? `${year} activity mosaic`}
            >
              {mosaic.days.map((day) => (
                <DayButton
                  key={day.key}
                  day={day}
                  maxCount={mosaic.maxDayCount}
                  selected={isSelectedDay(day, selected)}
                  itemLabel={itemLabel}
                  itemPluralLabel={itemPluralLabel}
                  onClick={onDaySelect}
                  orientation={orientation}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="inline-grid min-w-max grid-cols-[auto_auto] gap-x-1 gap-y-0.5 items-start">
              {/* placeholder for weekday header alignment */}
              <div aria-hidden="true" className="h-3" />

              <div
                className="grid grid-cols-7 gap-0.5 text-[0.625rem] leading-3 opacity-60"
                aria-hidden="true"
                style={{ gridTemplateColumns: `repeat(7, ${TILE_SIZE})` }}
              >
                {WEEKDAY_TOP_LABELS.map((label, idx) => (
                  <div key={`${label}-${idx}`} className="h-3 text-center">
                    {idx === 0 || idx === WEEKDAY_TOP_LABELS.length - 1 ? label : ''}
                  </div>
                ))}
              </div>

              <div className="grid gap-0.5" style={monthGridStyle} aria-label={`${year} months`}>
                {mosaic.months.map((month, index) => (
                  <MonthButton
                    key={month.key}
                    month={month}
                    nextMonth={mosaic.months[index + 1]}
                    weekCount={mosaic.weekCount}
                    selected={selected?.kind === 'month' && selected.key === month.key}
                    itemLabel={itemLabel}
                    itemPluralLabel={itemPluralLabel}
                    onClick={onMonthSelect}
                    orientation={orientation}
                  />
                ))}
              </div>

              <div
                className="grid gap-0.5"
                style={gridStyle}
                role="group"
                aria-label={ariaLabel ?? `${year} activity mosaic`}
              >
                {mosaic.days.map((day) => (
                  <DayButton
                    key={day.key}
                    day={day}
                    maxCount={mosaic.maxDayCount}
                    selected={isSelectedDay(day, selected)}
                    itemLabel={itemLabel}
                    itemPluralLabel={itemPluralLabel}
                    onClick={onDaySelect}
                    orientation={orientation}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthButton({
  month,
  nextMonth,
  weekCount,
  selected,
  itemLabel,
  itemPluralLabel,
  onClick,
  orientation = 'horizontal',
}: {
  month: YearMosaicMonth;
  nextMonth?: YearMosaicMonth;
  weekCount: number;
  selected: boolean;
  itemLabel: string;
  itemPluralLabel?: string;
  onClick?: (monthKey: string) => void;
  orientation?: 'horizontal' | 'vertical';
}) {
  const date = new Date(month.year, month.monthIndex, 1);
  const label = MONTH_FORMATTER.format(date);
  const fullLabel = FULL_MONTH_FORMATTER.format(date);
  const buttonStyle: CSSProperties =
    orientation === 'horizontal'
      ? {
          gridColumn: monthLabelGridColumn(month, nextMonth, weekCount),
          gridRow: 1,
          ...(selected ? { borderColor: SELECTED_BORDER_COLOR } : null),
        }
      : {
          gridColumn: 1,
          gridRow: monthLabelGridRow(month, nextMonth, weekCount),
          ...(selected ? { borderColor: SELECTED_BORDER_COLOR } : null),
        };

  const baseClasses =
    'h-4 truncate rounded-sm border border-transparent px-0.5 text-[0.625rem] font-semibold opacity-70 transition hover:border-primary/40 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-base-100';
  const orientationClasses =
    orientation === 'vertical' ? 'text-right justify-self-end pr-1' : 'text-left';

  return (
    <button
      type="button"
      className={`${baseClasses} ${orientationClasses}`}
      style={buttonStyle}
      title={`${fullLabel}, ${countLabel(month.count, itemLabel, itemPluralLabel)}`}
      aria-label={`${fullLabel}, ${countLabel(month.count, itemLabel, itemPluralLabel)}`}
      aria-pressed={selected}
      data-selected={selected ? 'true' : undefined}
      onClick={() => onClick?.(month.key)}
    >
      {label}
    </button>
  );
}

function DayButton({
  day,
  maxCount,
  selected,
  itemLabel,
  itemPluralLabel,
  onClick,
  orientation = 'horizontal',
}: {
  day: YearMosaicDay;
  maxCount: number;
  selected: boolean;
  itemLabel: string;
  itemPluralLabel?: string;
  onClick?: (dayKey: string) => void;
  orientation?: 'horizontal' | 'vertical';
}) {
  const label = DAY_FORMATTER.format(day.date);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(day.date);
  const buttonStyle: CSSProperties =
    orientation === 'horizontal'
      ? {
          gridColumn: day.weekIndex + 1,
          gridRow: day.weekdayIndex + 1,
          ...(selected ? { borderColor: SELECTED_BORDER_COLOR } : null),
        }
      : {
          gridRow: day.weekIndex + 1,
          gridColumn: day.weekdayIndex + 1,
          ...(selected ? { borderColor: SELECTED_BORDER_COLOR } : null),
        };

  return (
    <button
      type="button"
      className={`${orientation === 'horizontal' ? 'aspect-square h-auto w-full' : 'h-3 w-3'} rounded-xs border border-transparent p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-base-100 ${levelClass(day.count, maxCount)}`}
      style={buttonStyle}
      title={`${weekday}, ${label}, ${countLabel(day.count, itemLabel, itemPluralLabel)}`}
      aria-label={`${label}, ${countLabel(day.count, itemLabel, itemPluralLabel)}`}
      aria-pressed={selected}
      data-selected={selected ? 'true' : undefined}
      onClick={() => onClick?.(day.key)}
    />
  );
}

function isSelectedDay(day: YearMosaicDay, selected: TemporalMosaicSelection | undefined): boolean {
  if (!selected) return false;
  if (selected.kind === 'day') return selected.key === day.key;
  return selected.key === day.monthKey;
}

function levelClass(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) return LEVEL_CLASSES[0];
  const level = Math.max(1, Math.ceil((count / maxCount) * (LEVEL_CLASSES.length - 1)));
  return LEVEL_CLASSES[Math.min(LEVEL_CLASSES.length - 1, level)] ?? LEVEL_CLASSES[0];
}

function countLabel(count: number, itemLabel: string, itemPluralLabel?: string): string {
  return `${count.toLocaleString()} ${count === 1 ? itemLabel : (itemPluralLabel ?? pluralize(itemLabel))}`;
}

function monthLabelGridColumn(
  month: YearMosaicMonth,
  nextMonth: YearMosaicMonth | undefined,
  weekCount: number,
): string {
  const startLine = month.startWeek + 1;
  const nextMonthStartLine = nextMonth ? nextMonth.startWeek + 1 : weekCount + 1;
  const endLine = Math.max(startLine + 1, nextMonthStartLine);
  return `${startLine} / ${endLine}`;
}

function monthLabelGridRow(
  month: YearMosaicMonth,
  nextMonth: YearMosaicMonth | undefined,
  weekCount: number,
): string {
  const startLine = month.startWeek + 1;
  const nextMonthStartLine = nextMonth ? nextMonth.startWeek + 1 : weekCount + 1;
  const endLine = Math.max(startLine + 1, nextMonthStartLine);
  return `${startLine} / ${endLine}`;
}

function pluralize(label: string): string {
  if (label.endsWith('y')) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
}

function gridTemplateStyle(weekCount: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
  };
}

function gridTemplateStyleVertical(weekCount: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(7, ${TILE_SIZE})`,
    gridTemplateRows: `repeat(${weekCount}, ${TILE_SIZE})`,
  };
}

function monthGridTemplateStyle(weekCount: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))`,
    gridTemplateRows: MONTH_ROW_HEIGHT,
  };
}

function monthGridTemplateStyleVertical(weekCount: number): CSSProperties {
  return {
    gridTemplateColumns: MONTH_LABEL_WIDTH,
    gridTemplateRows: `repeat(${weekCount}, ${TILE_SIZE})`,
  };
}

function horizontalLayoutStyle(weekCount: number): CSSProperties {
  return {
    gridTemplateColumns: `${WEEKDAY_LABEL_WIDTH_REM}rem minmax(0, 1fr)`,
    minWidth: `${WEEKDAY_LABEL_WIDTH_REM + HORIZONTAL_SECTION_GAP_REM + weekCount * TILE_SIZE_REM + Math.max(0, weekCount - 1) * TILE_GAP_REM}rem`,
  };
}

function weekdayLabelGridStyle(): CSSProperties {
  return {
    gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
  };
}
