import { classNames } from '@/lib/class-names';
import { useTranslations } from "next-intl";
import { LEFT_PANEL_MAX, LEFT_PANEL_MIN, PanelSide, RIGHT_PANEL_MAX, RIGHT_PANEL_MIN } from '../types/inbox';

import {
    type KeyboardEvent,
    type PointerEvent,
} from "react";

  type PanelResizeDividerProps = {
  side: PanelSide;
  value: number;
  isActive: boolean;
  onDoubleClick?: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
};
export default function PanelResizeDivider({
  side,
  value,
  isActive,
  onDoubleClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: PanelResizeDividerProps) {
  const t = useTranslations("inbox");
  const isLeft = side === "left";

  return (
    <div
      role="separator"
      aria-label={isLeft ? t("resizeConversation") : t("resizeCustomer")}
      aria-orientation="vertical"
      aria-valuemin={isLeft ? LEFT_PANEL_MIN : RIGHT_PANEL_MIN}
      aria-valuemax={isLeft ? LEFT_PANEL_MAX : RIGHT_PANEL_MAX}
      aria-valuenow={value}
      tabIndex={0}
      data-testid={`${side}-panel-divider`}
      className={classNames(
        "group hidden h-full touch-none cursor-col-resize items-center justify-center outline-none xl:flex",
        isActive && "bg-cyan-100/70 dark:bg-cyan-950/40",
      )}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <span
        aria-hidden="true"
        className={classNames(
          "h-14 w-1 rounded-full bg-slate-300 transition group-hover:bg-cyan-500 group-focus-visible:bg-cyan-500 dark:bg-slate-700",
          isActive && "bg-cyan-500 dark:bg-cyan-400",
        )}
      />
    </div>
  );
}
