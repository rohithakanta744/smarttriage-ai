import { cn } from "@/lib/utils";

export function SmartTriageLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="9" className="fill-primary" />
      <path
        d="M10 13.5h12.25a4.75 4.75 0 0 1 0 9.5H17.5a4.75 4.75 0 0 0 0 9.5H30"
        className="stroke-primary-foreground"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M10 20h5l2.2-4.25 4.1 9 2.2-4.25H30"
        className="stroke-primary-foreground"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}