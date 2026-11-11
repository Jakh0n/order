import { z } from "zod";

// Store page popup (Website → Appearance). Shown once per visitor per version of its content;
// an optional countdown ends it.

export const popupSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().max(60, "tooLong"),
  text: z.string().trim().max(300, "tooLong"),
  imageUrl: z.string().url().max(500).startsWith("https://").nullable(),
  buttonLabel: z.string().trim().max(30, "tooLong"),
  buttonLink: z
    .string()
    .trim()
    .max(300, "tooLong")
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "linkInvalid"),
  /** ISO time the countdown reaches zero (and the popup stops showing); "" = no countdown */
  endsAt: z
    .string()
    .max(40)
    .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "dateInvalid"),
});

export type Popup = z.infer<typeof popupSchema>;

export const EMPTY_POPUP: Popup = {
  enabled: false,
  title: "",
  text: "",
  imageUrl: null,
  buttonLabel: "",
  buttonLink: "",
  endsAt: "",
};

export function parsePopup(value: unknown): Popup {
  const parsed = popupSchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_POPUP;
}

/** Worth showing: on, has something to say, countdown not over */
export function popupActive(popup: Popup, now: number = Date.now()): boolean {
  if (!popup.enabled || !(popup.title || popup.text || popup.imageUrl)) return false;
  return !popup.endsAt || Date.parse(popup.endsAt) > now;
}

/** Changes whenever the content changes → an edited popup shows once more */
export function popupVersion(popup: Popup): string {
  const raw = [popup.title, popup.text, popup.imageUrl, popup.endsAt].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
