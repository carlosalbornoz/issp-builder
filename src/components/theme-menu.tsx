"use client";

import { Fragment } from "react";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, isThemeId, useTheme, type ThemeId } from "@/lib/theme";

/** The theme radio list, shared by the editor's overflow menu and the public header. */
export function ThemeMenuItems({ onThemeSelected }: { onThemeSelected?: () => void }) {
  const { theme, setTheme } = useTheme();

  function handleThemeChange(value: string) {
    if (!isThemeId(value)) return;
    setTheme(value);
    onThemeSelected?.();
  }

  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
      {THEMES.map((item, index) => (
        <Fragment key={item.id}>
          {/* A rule between colour families (the light/dark pair of each), so a
              ten-item menu still reads as a short list of choices. */}
          {index > 0 &&
            item.id.split("-")[0] !== THEMES[index - 1].id.split("-")[0] && (
              <DropdownMenuSeparator />
            )}
          <DropdownMenuRadioItem value={item.id} className="gap-2">
            <ThemePreview theme={item.id} />
            {item.name}
          </DropdownMenuRadioItem>
        </Fragment>
      ))}
    </DropdownMenuRadioGroup>
  );
}

function ThemePreview({ theme }: { theme: ThemeId }) {
  const item = THEMES.find((candidate) => candidate.id === theme)!;

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border"
      style={{ backgroundColor: item.background, borderColor: item.border }}
    >
      <span
        className="h-2 w-2 rounded-full border border-black/10"
        style={{ backgroundColor: item.secondary }}
      />
    </span>
  );
}

/** Icon button + theme list for a page header. */
export function ThemeMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Theme"
        title="Theme"
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <Palette className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
