type PixelBadgeProps = { label: string; earned?: boolean };
export function PixelBadge({ label, earned = false }: PixelBadgeProps) {
  return (
    <span
      className={earned ? "pixel-badge earned" : "pixel-badge"}
      aria-label={`${label}: ${earned ? "earned" : "locked"}`}
    >
      {earned ? "A?" : "?"}
    </span>
  );
}
