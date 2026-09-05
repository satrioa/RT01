"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface WorkspaceTab {
  /** Stable id, doubles as the panel value, e.g. "preview". */
  id: string;
  /** Mono label, e.g. "preview". */
  label: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Optional count rendered after the label, e.g. checkpoints. */
  count?: number;
  /** Right-aligned actions shown only while this tab is active. */
  actions?: ReactNode;
  /** The pane content. */
  content: ReactNode;
  disabled?: boolean;
}

export type WorkspaceTabsProps = Omit<
  ComponentProps<typeof Tabs>,
  "children"
> & {
  tabs: WorkspaceTab[];
  /** Controlled active tab id. */
  value?: string;
  /** Uncontrolled initial tab id; defaults to the first tab. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Extra class for the TabsList (e.g. pl-5 for left gap) */
  listClassName?: string;
};

/* ─────────────────────────────────────────────────────────
 * TAB BAR STORYBOARD
 *
 *  rest     mono lowercase labels, muted; the active tab
 *           holds foreground with a primary underline
 *  switch   the underline glides to the new tab (240ms
 *           strong ease-out, transform-only) and the new
 *           pane fades up 4px; the old pane just leaves
 *  actions  each tab owns a right-aligned action slot that
 *           crossfades with the tab switch — the bar's
 *           height never changes
 *  hover    label warms to foreground, nothing moves
 * ───────────────────────────────────────────────────────── */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** The underline that glides between active tabs. */
export const GlideUnderline = ({ activeId }: { activeId: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(
    null
  );

  useEffect(() => {
    const list = ref.current?.closest('[data-slot="tabs-list"]');

    if (!(list instanceof HTMLElement)) {
      return;
    }

    const measure = () => {
      const active = list.querySelector<HTMLElement>("[data-active]");

      if (active) {
        setRect({ left: active.offsetLeft, width: active.offsetWidth });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeId]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-0 h-0.5 bg-primary motion-reduce:transition-none",
        rect ? "opacity-100" : "opacity-0"
      )}
      ref={ref}
      style={{
        left: rect?.left ?? 0,
        transition: `left 240ms ${EASE_OUT}, width 240ms ${EASE_OUT}`,
        width: rect?.width ?? 0,
      }}
    />
  );
};

export const WorkspaceTabs = ({
  className,
  defaultValue,
  onValueChange,
  tabs,
  value,
  listClassName,
  ...props
}: WorkspaceTabsProps) => {
  const fallback = defaultValue ?? tabs[0]?.id;
  const [internal, setInternal] = useState(fallback);
  const active = value ?? internal;
  const activeTab = tabs.find((tab) => tab.id === active);

  const handleChange = (next: unknown) => {
    const id = String(next as string);
    setInternal(id);
    onValueChange?.(id);
  };

  const orderedIds = tabs.map((t) => t.id);
  const activeIdx = orderedIds.indexOf(active ?? "");

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 64;
    const velocityThreshold = 500;
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    let delta = 0;
    if (offsetX < -threshold || velocityX < -velocityThreshold) delta = 1;
    else if (offsetX > threshold || velocityX > velocityThreshold) delta = -1;
    if (delta === 0) return;
    const nextIdx = Math.min(Math.max(activeIdx + delta, 0), orderedIds.length - 1);
    if (nextIdx === activeIdx) return;
    const nextId = orderedIds[nextIdx];
    setInternal(nextId);
    onValueChange?.(nextId);
  };

  return (
    <Tabs
      className={cn("gap-0", className)}
      data-slot="workspace-tabs"
      onValueChange={handleChange as never}
      value={active}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 border-border/40 border-b">
        <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList
            className={cn("relative h-9 gap-1 rounded-none bg-transparent p-0", listClassName)}
            variant="line"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                className="h-full flex-none rounded-none px-3 font-mono text-muted-foreground text-xs after:hidden hover:text-foreground data-active:bg-transparent data-active:text-foreground dark:data-active:border-transparent dark:data-active:bg-transparent"
                disabled={tab.disabled}
                key={tab.id}
                value={tab.id}
              >
                {tab.icon}
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span
                    className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-sm border border-border/60 px-[3px] pt-px text-[10px] text-muted-foreground leading-none tabular-nums transition-colors"
                    data-slot="workspace-tabs-count"
                  >
                    {tab.count}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
            <GlideUnderline activeId={active ?? ""} />
          </TabsList>
        </div>
        {activeTab?.actions ? (
          <div
            className="fade-in-0 flex animate-in items-center gap-1.5 pr-1 duration-200 motion-reduce:animate-none"
            data-slot="workspace-tabs-actions"
            key={active}
          >
            {activeTab.actions}
          </div>
        ) : null}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="touch-pan-y cursor-grab active:cursor-grabbing"
      >
        {tabs.map((tab) => (
          <TabsContent
            className="fade-in-0 slide-in-from-bottom-1 animate-in pt-4 duration-300 motion-reduce:animate-none"
            key={tab.id}
            value={tab.id}
          >
            {tab.content}
          </TabsContent>
        ))}
      </motion.div>
    </Tabs>
  );
};
