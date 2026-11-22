"use client";

import { track } from "@vercel/analytics";
import { Pause, Play, RotateCcw, Store, User, X } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { buttonVariants } from "@/components/ui/button";
import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { minutesBetween, CHAT_TIMES } from "../chat-story";
import { StatusBar } from "../phone-screens";
import {
  ArriveScene,
  CollapseScene,
  DmScene,
  dmShown,
  EndScene,
  HookScene,
  KitchenTicket,
  MenuScene,
  OpenScene,
  OrderScene,
  ReportScene,
  type SceneProps,
  ShareScene,
  StatusScene,
} from "./scenes";
import {
  CHAPTERS,
  chapterSpan,
  clock,
  locate,
  ramp,
  SCENES,
  type SceneId,
  sceneStart,
  TOTAL,
} from "./timeline";

const SCREENS: Record<SceneId, (p: SceneProps) => React.ReactNode> = {
  hook: HookScene,
  dm: DmScene,
  collapse: CollapseScene,
  open: OpenScene,
  menu: MenuScene,
  share: ShareScene,
  order: OrderScene,
  arrive: ArriveScene,
  status: StatusScene,
  report: ReportScene,
  end: EndScene,
};

/** Still frame behind the Play button: the busy chat list */
const POSTER_TIME = 5.5;
/** The phone mockup is drawn at this size and scaled */
const PHONE_W = 272;
const PHONE_H = 574;
/** Below this width Play opens the video full screen */
const PHONE_QUERY = "(max-width: 1023px)";
const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";

const subscribeNoop = () => () => {};

/**
 * Silent product video on the landing, drawn from live UI on a clock. Nothing moves until the
 * visitor presses Play. Desktop: plays in place. Phones: grows to full screen (Stories controls:
 * tap sides to skip, hold to pause, swipe down or ✕ to close) and shrinks back to its spot.
 */
export function Explainer({ demo, link }: { demo: LandingDemo; link: string }) {
  const tx = useTranslations("home.explainer");

  const root = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [full, setFull] = useState(false);
  const autoPaused = useRef(false);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  // The clock (the ref mirrors `time` so the frame loop reads it without re-subscribing)
  const timeRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(TOTAL, timeRef.current + Math.min(0.1, (now - last) / 1000));
      last = now;
      timeRef.current = next;
      setTime(next);
      if (next >= TOTAL) {
        setPlaying(false);
        track("explainer_complete");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // In place: pause when scrolled away, resume when back
  useEffect(() => {
    const el = root.current;
    if (!el || full) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && playing) {
          autoPaused.current = true;
          setPlaying(false);
        } else if (entry.isIntersecting && autoPaused.current) {
          autoPaused.current = false;
          setPlaying(true);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [playing, full]);

  const { index, scene, local } = locate(started ? time : POSTER_TIME);

  // Which chapters people reach (Vercel Analytics custom events)
  const reached = useRef(new Set<string>());
  useEffect(() => {
    if (!playing || reached.current.has(scene.chapter)) return;
    reached.current.add(scene.chapter);
    track("explainer_chapter", { chapter: scene.chapter });
  }, [playing, scene.chapter]);

  // ---------- Full screen (phones) ----------

  // Where the in-page stage is, as a clip of the screen: the overlay grows from and shrinks to it
  const [clipFrom, setClipFrom] = useState(FULL_CLIP);
  const stageRef = useRef<HTMLDivElement>(null);
  function stageClip(): string {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return FULL_CLIP;
    const px = (n: number) => `${Math.max(0, Math.round(n))}px`;
    return `inset(${px(r.top)} ${px(window.innerWidth - r.right)} ${px(window.innerHeight - r.bottom)} ${px(r.left)} round 40px)`;
  }
  /** Time shown by the in-page stage while the overlay is open (it doesn't re-render meanwhile) */
  const [frozenAt, setFrozenAt] = useState(0);
  const pushedHistory = useRef(false);

  function openFull(at: number) {
    setClipFrom(stageClip());
    setFrozenAt(at);
    setFull(true);
    // The phone's Back button closes the video instead of leaving the page
    window.history.pushState({ explainer: true }, "");
    pushedHistory.current = true;
    track("explainer_fullscreen");
  }

  function shrink() {
    setClipFrom(stageClip());
    setFrozenAt(timeRef.current);
    setPlaying(false);
    setFull(false);
  }

  function closeFull() {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      window.history.back(); // → popstate → shrink
    } else {
      shrink();
    }
  }

  useEffect(() => {
    if (!full) return;
    const onPop = () => {
      pushedHistory.current = false;
      shrink();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFull();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
    // closeFull / shrink only touch refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  function play(from?: number) {
    if (!started) track("explainer_play");
    autoPaused.current = false;
    setStarted(true);
    const at = from ?? (timeRef.current >= TOTAL ? 0 : timeRef.current);
    timeRef.current = at;
    setTime(at);
    setPlaying(true);
    if (!full && window.matchMedia(PHONE_QUERY).matches) openFull(at);
  }

  function pause() {
    setPlaying(false);
  }

  function skip(dir: 1 | -1) {
    const target =
      dir === 1
        ? sceneStart(Math.min(index + 1, SCENES.length))
        : // Back: restart this scene, or go to the previous one if it just began
          sceneStart(local > 1.5 ? index : Math.max(0, index - 1));
    play(Math.min(target, TOTAL));
  }

  const ended = started && time >= TOTAL;

  // Stable handlers, so the memoized in-page stage stays still while the overlay plays
  const actions = useRef({ play, closeFull });
  useEffect(() => {
    actions.current = { play, closeFull };
  });
  const onPlay = useCallback(() => actions.current.play(), []);
  const onReplay = useCallback(() => actions.current.play(0), []);
  const onBack = useCallback(() => actions.current.closeFull(), []);
  const stageProps = { demo, link, started, onPlay, onReplay };

  return (
    <div ref={root} className="mx-auto w-full max-w-[420px]" role="region" aria-label={tx("label")}>
      <div ref={stageRef}>
        <Stage {...stageProps} time={full ? frozenAt : started ? time : POSTER_TIME} />
      </div>

      {started && (
        <Controls
          time={full ? frozenAt : time}
          playing={playing && !full}
          ended={ended}
          onToggle={() => (playing ? pause() : play())}
          onSeek={play}
        />
      )}

      {mounted &&
        createPortal(
          <AnimatePresence custom={clipFrom}>
            {full && (
              <FullScreen
                key="full"
                clipFrom={clipFrom}
                time={time}
                playing={playing}
                ended={ended}
                onPlay={() => play()}
                onPause={pause}
                onSkip={skip}
                onSeek={play}
                onClose={closeFull}
              >
                <Stage {...stageProps} time={time} full onBack={onBack} />
              </FullScreen>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

// ---------- The picture: caption + phone (+ poster / end card) ----------

const Stage = memo(function Stage({
  demo,
  link,
  started,
  time,
  full = false,
  onPlay,
  onReplay,
  onBack,
}: {
  demo: LandingDemo;
  link: string;
  started: boolean;
  time: number;
  full?: boolean;
  onPlay: () => void;
  onReplay: () => void;
  onBack?: () => void;
}) {
  const tx = useTranslations("home.explainer");
  const tHero = useTranslations("home.hero");
  const tProblem = useTranslations("home.problem");
  const messages = tProblem.raw("messages") as string[];
  const { scene, local } = locate(time);
  const Screen = SCREENS[scene.id];
  const props: SceneProps = { t: local, demo, link };

  // Full screen: the phone as big as the space allows
  const area = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    if (!full || !area.current) return;
    const el = area.current;
    const ro = new ResizeObserver(() => {
      setFit(Math.min(1.3, el.clientHeight / PHONE_H, el.clientWidth / PHONE_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);

  // Caption under the title: live counter during the DM scene
  let sub = tx(`scenes.${scene.id}.sub`);
  if (started && scene.id === "dm") {
    const shown = Math.max(1, dmShown(local, messages.length));
    const minutes = minutesBetween(CHAT_TIMES[0], CHAT_TIMES[shown - 1] ?? CHAT_TIMES[0]);
    sub = tProblem("dmStatus", { count: shown, minutes });
  }
  const captionIn = started ? ramp(local, 0, 0.4) : 1;
  const darkStatus = !(scene.id === "order" && local < 4.9) && scene.id !== "end";

  const phone = (
    <div
      className="relative rounded-[2.75rem] bg-[#1c211f] p-[9px] shadow-[0_50px_90px_-40px_rgba(18,55,42,0.55)]"
      style={{ width: PHONE_W, height: PHONE_H }}
    >
      <div className="relative h-full overflow-hidden rounded-[2.2rem] bg-white" aria-hidden>
        <div className="absolute top-2 left-1/2 z-30 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#1c211f]" />
        <StatusBar light={!darkStatus} />
        <Screen {...props} />
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "bg-mint relative isolate overflow-hidden",
        full ? "flex min-h-0 flex-1 flex-col px-4 pb-2" : "rounded-[2.5rem] px-4 pt-5 pb-6 sm:px-6",
      )}
    >
      {/* Caption */}
      <div className={cn("shrink-0 text-center", !full && "min-h-[118px]")} aria-live="polite">
        {started ? (
          <div
            key={scene.id}
            style={{ opacity: captionIn, transform: `translateY(${(1 - captionIn) * 8}px)` }}
          >
            <span
              className={cn(
                "text-forest mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold shadow-sm",
                !scene.who && "invisible",
              )}
            >
              {scene.who === "customer" ? (
                <User className="size-3.5" />
              ) : (
                <Store className="size-3.5" />
              )}
              {tx(scene.who === "customer" ? "customer" : "you")}
            </span>
            <p className="font-display text-forest text-xl leading-tight font-bold tracking-[-0.02em] sm:text-2xl">
              {tx(`scenes.${scene.id}.title`)}
            </p>
            <p className="text-forest/70 mx-auto mt-1.5 max-w-xs text-sm leading-snug">{sub}</p>
          </div>
        ) : (
          <p className="font-display text-forest mx-auto max-w-xs pt-4 text-xl leading-tight font-bold tracking-[-0.02em] sm:text-2xl">
            {tx("posterTitle")}
          </p>
        )}
      </div>

      {/* Phone: fixed size, scaled to the space */}
      {full ? (
        <div ref={area} className="relative mt-3 min-h-0 flex-1">
          <div
            className="absolute top-0 left-1/2 origin-top"
            style={{ transform: `translateX(-50%) scale(${fit})` }}
          >
            {phone}
          </div>
          {scene.id === "arrive" && <KitchenTicket {...props} />}
        </div>
      ) : (
        <div className="relative mt-2 h-[488px] sm:h-[574px]">
          <div className="absolute top-0 left-1/2 w-[272px] origin-top -translate-x-1/2 scale-[0.85] sm:scale-100">
            {phone}
          </div>
          {started && scene.id === "arrive" && <KitchenTicket {...props} />}
        </div>
      )}

      {/* Before Play: a still frame and one big button */}
      {!started && (
        <button
          type="button"
          onClick={onPlay}
          className="group absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-[#12372a]/55 via-[#12372a]/15 to-transparent pt-24 text-white"
        >
          <span className="bg-primary flex size-20 items-center justify-center rounded-full shadow-[0_20px_40px_-12px] shadow-red-900/60 transition-transform group-hover:scale-105 group-active:scale-95">
            <Play className="ml-1 size-9 fill-current" />
          </span>
          <span className="flex flex-col items-center rounded-2xl bg-[#12372a]/80 px-4 py-2 backdrop-blur-sm">
            <span className="text-base font-semibold">{tx("play")}</span>
            <span className="text-sm text-white/80">
              {tx("posterMeta", { duration: clock(TOTAL) })}
            </span>
          </span>
        </button>
      )}

      {/* End card */}
      {scene.id === "end" && started && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 bg-gradient-to-t from-[#12372a] via-[#12372a]/85 to-transparent px-6 pt-24 text-center text-white",
            full ? "pb-6" : "pb-8",
          )}
          style={{ opacity: ramp(local, 0.2, 0.8) }}
        >
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-13 w-full max-w-xs rounded-full text-base shadow-[0_12px_30px_-12px] shadow-red-900/60",
            )}
          >
            {tHero("cta")}
          </Link>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onReplay}
              className="flex items-center gap-1.5 py-2 text-sm font-semibold text-white/85 hover:text-white"
            >
              <RotateCcw className="size-4" />
              {tx("replay")}
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="py-2 text-sm font-semibold text-white/85 hover:text-white"
              >
                {tx("back")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ---------- In-page controls: play/pause, chapters (tap to jump), time ----------

function Controls({
  time,
  playing,
  ended,
  onToggle,
  onSeek,
}: {
  time: number;
  playing: boolean;
  ended: boolean;
  onToggle: () => void;
  onSeek: (at: number) => void;
}) {
  const tx = useTranslations("home.explainer");
  const { scene } = locate(time);
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={tx(playing ? "pause" : "resume")}
        className="bg-forest flex size-10 shrink-0 items-center justify-center rounded-full text-white"
      >
        {playing ? (
          <Pause className="size-4 fill-current" />
        ) : ended ? (
          <RotateCcw className="size-4" />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <ChapterBars time={time} onSeek={onSeek} labels />
        <p className="text-forest mt-1 text-xs font-semibold sm:hidden">
          {tx(`chapters.${scene.chapter}`)}
          <span className="text-forest/45">
            {" "}
            · {CHAPTERS.indexOf(scene.chapter) + 1}/{CHAPTERS.length}
          </span>
        </p>
      </div>
      <span className="text-forest/55 shrink-0 text-xs tabular-nums">
        {clock(time)} / {clock(TOTAL)}
      </span>
    </div>
  );
}

function ChapterBars({
  time,
  onSeek,
  labels = false,
}: {
  time: number;
  onSeek: (at: number) => void;
  labels?: boolean;
}) {
  const tx = useTranslations("home.explainer");
  const { scene } = locate(time);
  return (
    <ol className="flex gap-1.5">
      {CHAPTERS.map((ch) => {
        const [from, to] = chapterSpan(ch);
        const fill = Math.min(1, Math.max(0, (time - from) / (to - from)));
        const active = scene.chapter === ch;
        return (
          <li key={ch} style={{ flexGrow: to - from }} className="min-w-0 basis-0">
            <button
              type="button"
              onClick={() => onSeek(from)}
              aria-label={tx(`chapters.${ch}`)}
              className="group block w-full py-1 text-left"
            >
              <span className="bg-forest/10 block h-1.5 overflow-hidden rounded-full">
                <span
                  className="bg-primary block h-full rounded-full"
                  style={{ width: `${fill * 100}%` }}
                />
              </span>
              {labels && (
                <span
                  className={cn(
                    "mt-1 hidden truncate text-xs font-semibold sm:block",
                    active ? "text-forest" : "text-forest/45 group-hover:text-forest/70",
                  )}
                >
                  {tx(`chapters.${ch}`)}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Full screen overlay (phones) ----------

function FullScreen({
  clipFrom,
  time,
  playing,
  ended,
  onPlay,
  onPause,
  onSkip,
  onSeek,
  onClose,
  children,
}: {
  clipFrom: string;
  time: number;
  playing: boolean;
  ended: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: (dir: 1 | -1) => void;
  onSeek: (at: number) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const tx = useTranslations("home.explainer");
  const { scene } = locate(time);
  const dragY = useMotionValue(0);
  const gesture = useRef<{
    x: number;
    y: number;
    moved: boolean;
    held: boolean;
    wasPlaying: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  // Stories controls on the picture: tap left/right = previous/next scene, hold = pause,
  // swipe down = close. Buttons and links inside keep working normally.
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("a,button")) return;
    const g = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
      held: false,
      wasPlaying: playing,
      timer: null as ReturnType<typeof setTimeout> | null,
    };
    g.timer = setTimeout(() => {
      g.held = true;
      if (g.wasPlaying) onPause();
    }, 280);
    gesture.current = g;
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > 10) {
      g.moved = true;
      if (g.timer) clearTimeout(g.timer);
    }
    if (g.moved && dy > 0 && dy > Math.abs(dx)) dragY.set(dy * 0.6);
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.timer) clearTimeout(g.timer);
    if (g.held) {
      if (g.wasPlaying) onPlay();
    } else if (dragY.get() > 90) {
      onClose();
      return;
    } else if (!g.moved) {
      onSkip(e.clientX < window.innerWidth / 3 ? -1 : 1);
    }
    animate(dragY, 0, { type: "spring", stiffness: 500, damping: 40 });
  }

  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label={tx("label")}
      className="bg-mint fixed inset-0 z-[100] flex touch-none flex-col overflow-hidden pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none"
      custom={clipFrom}
      variants={{
        hidden: (clip: string) => ({ clipPath: clip }),
        shown: { clipPath: FULL_CLIP },
      }}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
      style={{ y: dragY }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Top: chapters + close */}
      <div className="flex shrink-0 items-center gap-3 px-4 pb-2">
        <div className="min-w-0 flex-1">
          <ChapterBars time={time} onSeek={onSeek} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tx("close")}
          className="text-forest flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <X className="size-5" />
        </button>
      </div>

      {children}

      {/* Bottom: play/pause, chapter, time */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-1">
        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          aria-label={tx(playing ? "pause" : "resume")}
          className="bg-forest flex size-10 shrink-0 items-center justify-center rounded-full text-white"
        >
          {playing ? (
            <Pause className="size-4 fill-current" />
          ) : ended ? (
            <RotateCcw className="size-4" />
          ) : (
            <Play className="ml-0.5 size-4 fill-current" />
          )}
        </button>
        <p className="text-forest min-w-0 flex-1 truncate text-sm font-semibold">
          {tx(`chapters.${scene.chapter}`)}
          <span className="text-forest/45">
            {" "}
            · {CHAPTERS.indexOf(scene.chapter) + 1}/{CHAPTERS.length}
          </span>
        </p>
        <span className="text-forest/55 shrink-0 text-xs tabular-nums">
          {clock(time)} / {clock(TOTAL)}
        </span>
      </div>
    </motion.div>
  );
}
