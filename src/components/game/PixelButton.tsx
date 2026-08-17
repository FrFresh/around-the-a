import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "gold" | "green" | "ghost" | "danger";
}

export function PixelButton({
  children,
  tone = "gold",
  className = "",
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={`pixel-button pixel-button--${tone} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
