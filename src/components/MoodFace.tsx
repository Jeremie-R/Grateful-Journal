import { MOODS, moodColor, type MoodLevel } from "@/lib/journal";
import { cn } from "@/lib/utils";

interface MoodFaceProps {
  level: MoodLevel;
  size?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
  showLine?: boolean;
}

/**
 * A soft colored circle with a single mouth line at a mood-specific angle.
 * Sad = frown (line angled down), Good = smile (line angled up).
 */
export function MoodFace({
  level,
  size = 56,
  selected = false,
  dimmed = false,
  onClick,
  className,
  showLine = true,
}: MoodFaceProps) {
  const mood = MOODS[level];
  const lineWidth = size * 0.42;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={mood.label}
      className={cn(
        "relative grid place-items-center rounded-full transition-all duration-300",
        onClick && "cursor-pointer",
        selected && "ring-2 ring-offset-2 ring-offset-background scale-105",
        dimmed && "opacity-30",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: moodColor(level),
        // @ts-expect-error css var for ring color
        "--tw-ring-color": moodColor(level),
      }}
    >
      {showLine && (
        <span
          className="block rounded-full bg-foreground/70"
          style={{
            width: lineWidth,
            height: Math.max(2, size * 0.05),
            transform: `rotate(${mood.angle}deg)`,
            marginTop: size * 0.16,
          }}
        />
      )}
    </Wrapper>
  );
}
