import { SOCIAL_PATTERNS, socialUrl } from "@/lib/design";
import { cn } from "@/lib/utils";

// Brand glyphs (simple single-path marks; lucide has no TikTok / Telegram)
const ICONS = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2Zm0 4.6a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4Zm0 8.6a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8Zm5.4-9.9a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z",
  telegramChannel:
    "M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1.1-1 .2-1.5L20.5 2.8c.9-.3 1.7.2 1.4 1.5Z",
  tiktok:
    "M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.3 6.3 0 1 0 5.3 6.2V8.6a8 8 0 0 0 4.6 1.5V6.8a4.6 4.6 0 0 1-4.6-4.8Z",
} as const;

type Kind = keyof typeof ICONS;
const LABELS: Record<Kind, string> = {
  instagram: "Instagram",
  telegramChannel: "Telegram",
  tiktok: "TikTok",
};

/** Round icon links to the store's Instagram / Telegram / TikTok (only the ones it filled in) */
export function SocialLinks({
  links,
  className,
}: {
  links: Partial<Record<Kind, string | null>>;
  className?: string;
}) {
  const items = (Object.keys(ICONS) as Kind[]).filter(
    (k) => links[k] && SOCIAL_PATTERNS[k].test(links[k]!),
  );
  if (items.length === 0) return null;
  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {items.map((kind) => (
        <li key={kind}>
          <a
            href={socialUrl(kind, links[kind]!)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={LABELS[kind]}
            className="bg-muted text-foreground/80 hover:bg-primary hover:text-primary-foreground flex size-9 items-center justify-center rounded-full transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <path d={ICONS[kind]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
