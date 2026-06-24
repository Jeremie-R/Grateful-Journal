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
  const mouthW = size * 0.46;
  const mouthH = size * 0.22;
  const stroke = Math.max(2, size * 0.055);
  // Quadratic curve: smile (curve>0) lifts the corners and drops the middle,
  // frown (curve<0) does the opposite.
  const cpY = mouthH / 2 + mood.curve * (mouthH / 2);
  const startY = mouthH / 2 - mood.curve * (mouthH / 2) * 0.5;
  const path = `M 0 ${startY} Q ${mouthW / 2} ${cpY} ${mouthW} ${startY}`;
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
        <svg
          width={mouthW}
          height={mouthH}
          viewBox={`0 0 ${mouthW} ${mouthH}`}
          fill="none"
          style={{ marginTop: size * 0.14, overflow: "visible" }}
          aria-hidden
        >
          <path
            d={path}
            className="stroke-foreground/70"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      )}
    </Wrapper>
  );
}
