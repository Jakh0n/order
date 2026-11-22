// The landing explainer: one silent "video" built from live UI, played on a clock so it can be
// paused, sought and resumed. Each scene shows one owner problem and how the store solves it.

export type Chapter = "problem" | "store" | "order" | "report";
export type SceneId =
  | "hook"
  | "dm"
  | "collapse"
  | "open"
  | "menu"
  | "share"
  | "order"
  | "arrive"
  | "status"
  | "report"
  | "end";

export interface Scene {
  id: SceneId;
  chapter: Chapter;
  /** Seconds */
  dur: number;
  /** Whose phone is on screen (pill above the phone) */
  who: "owner" | "customer" | null;
}

export const SCENES: readonly Scene[] = [
  { id: "hook", chapter: "problem", dur: 6, who: "owner" },
  { id: "dm", chapter: "problem", dur: 12, who: "owner" },
  { id: "collapse", chapter: "problem", dur: 5, who: "owner" },
  { id: "open", chapter: "store", dur: 9, who: "owner" },
  { id: "menu", chapter: "store", dur: 10, who: "owner" },
  { id: "share", chapter: "store", dur: 8, who: "owner" },
  { id: "order", chapter: "order", dur: 13, who: "customer" },
  { id: "arrive", chapter: "order", dur: 9, who: "owner" },
  { id: "status", chapter: "order", dur: 8, who: "customer" },
  { id: "report", chapter: "report", dur: 9, who: "owner" },
  { id: "end", chapter: "report", dur: 5, who: null },
];

export const CHAPTERS: readonly Chapter[] = ["problem", "store", "order", "report"];

export const TOTAL = SCENES.reduce((s, x) => s + x.dur, 0);

/** Scene playing at `time` and how far into it we are */
export function locate(time: number): { index: number; scene: Scene; local: number } {
  let start = 0;
  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    if (time < start + scene.dur || i === SCENES.length - 1) {
      return { index: i, scene, local: Math.min(Math.max(0, time - start), scene.dur) };
    }
    start += scene.dur;
  }
  throw new Error("unreachable");
}

/** Second at which scene `index` starts (index = SCENES.length → the end) */
export function sceneStart(index: number): number {
  return SCENES.slice(0, index).reduce((s, x) => s + x.dur, 0);
}

/** [start, end) of a chapter in seconds */
export function chapterSpan(chapter: Chapter): [number, number] {
  let start = 0;
  let from = -1;
  let to = 0;
  for (const s of SCENES) {
    if (s.chapter === chapter && from < 0) from = start;
    start += s.dur;
    if (s.chapter === chapter) to = start;
  }
  return [from, to];
}

/** 0..1 as `t` goes from a to b, eased out */
export function ramp(t: number, a: number, b: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return 1 - (1 - x) ** 3;
}

export function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
