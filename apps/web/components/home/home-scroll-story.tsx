"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const stages = [
  {
    title: "꿈 기록하기",
    copy: "꿈의 장면을 기록해두세요.",
    range: { fadeInStart: 0.18, fadeInEnd: 0.28, holdEnd: 0.44, fadeOutEnd: 0.56 },
  },
  {
    title: "꿈 다시보기",
    copy: "쌓인 기록 속에서 다시 보고 싶은 순간을 찾아보세요.",
    range: { fadeInStart: 0.4, fadeInEnd: 0.5, holdEnd: 0.66, fadeOutEnd: 0.78 },
  },
  {
    title: "책으로 만들기",
    copy: "좋아하는 꿈들을 묶어 한 권의 책으로 이어보세요.",
    range: { fadeInStart: 0.62, fadeInEnd: 0.72, holdEnd: 0.86, fadeOutEnd: 0.94 },
  },
];

function easeInOut(value: number) {
  return value * value * (3 - 2 * value);
}

function getStageVisibility(
  progress: number,
  range: { fadeInStart: number; fadeInEnd: number; holdEnd: number; fadeOutEnd: number },
) {
  let raw = 0;

  if (progress >= range.fadeInStart && progress <= range.fadeInEnd) {
    raw = (progress - range.fadeInStart) / (range.fadeInEnd - range.fadeInStart);
  } else if (progress > range.fadeInEnd && progress <= range.holdEnd) {
    raw = 1;
  } else if (progress > range.holdEnd && progress <= range.fadeOutEnd) {
    raw = 1 - (progress - range.holdEnd) / (range.fadeOutEnd - range.holdEnd);
  }

  const eased = easeInOut(Math.min(Math.max(raw, 0), 1));
  const center = (range.fadeInEnd + range.holdEnd) / 2;
  const translateY = (center - progress) * 56;
  const blur = (1 - eased) * 8;

  return {
    opacity: eased,
    transform: `translate3d(0, ${translateY}px, 0) scale(${0.985 + eased * 0.015})`,
    filter: `blur(${blur}px)`,
  };
}

export function HomeScrollStory() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const node = containerRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const total = Math.max(node.offsetHeight - window.innerHeight, 1);
      const next = Math.min(Math.max(-rect.top / total, 0), 1);
      setProgress(next);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const ctaProgress = useMemo(() => {
    const raw = Math.min(Math.max((progress - 0.89) / 0.08, 0), 1);
    return easeInOut(raw);
  }, [progress]);

  const introProgress = useMemo(() => {
    const raw = Math.min(Math.max((progress - 0.1) / 0.12, 0), 1);
    return 1 - easeInOut(raw);
  }, [progress]);

  const arrowOpacity = useMemo(() => {
    const fadeOut = easeInOut(Math.min(Math.max((progress - 0.9) / 0.08, 0), 1));
    return Math.max(0, 1 - fadeOut);
  }, [progress]);

  return (
    <div ref={containerRef} className="relative left-1/2 -mt-32 h-[640svh] w-screen -translate-x-1/2">
      <section className="home-stage sticky top-0 h-[100svh] min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/home-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_28%,rgba(46,31,95,0.12)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.18),transparent_20%),radial-gradient(circle_at_84%_22%,rgba(255,244,250,0.14),transparent_18%),linear-gradient(90deg,rgba(74,58,132,0.16)_0%,rgba(255,255,255,0)_58%)]" />

        <div className="relative h-full">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2 px-6 text-white md:px-10 lg:px-14"
            style={{
              opacity: introProgress,
              transform: `translate3d(0, ${-8 + (1 - introProgress) * -18}px, 0)`,
            }}
          >
            <div
              className="home-intro-shell max-w-3xl"
              style={{ textShadow: "0 10px 34px rgba(58, 42, 112, 0.18)" }}
            >
              <h1 className="home-intro-title">
                <span className="home-headline-line">꿈을 잊기전에</span>
                <span className="home-headline-line home-headline-line-delay mt-5">
                  <span className="inline-block pl-10">기록으로 남기세요</span>
                </span>
              </h1>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-[44%] flex -translate-y-1/2 justify-center px-6 text-center">
            <div className="home-story-shell w-full max-w-5xl">
              {stages.map((stage, index) => {
                const style = getStageVisibility(progress, stage.range);

                return (
                  <div key={stage.title} className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={style}>
                    <p className="home-story-kicker">{`0${index + 1}`}</p>
                    <h1 className="home-story-title">{stage.title}</h1>
                    <p className="home-story-copy">{stage.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/dreams/new"
            className="home-story-cta group absolute bottom-12 right-10 text-white md:bottom-16 md:right-16 lg:right-24"
            style={{
              opacity: ctaProgress,
              transform: `translate3d(${(1 - ctaProgress) * -22}px, ${(1 - ctaProgress) * 12}px, 0)`,
              pointerEvents: ctaProgress > 0.12 ? "auto" : "none",
            }}
          >
            <span className="home-story-cta-label home-story-cta-label-float">
              꿈 기록 시작하기
              <span className="absolute -bottom-2 left-0 h-px w-full bg-white/76 transition-all duration-300 group-hover:w-[calc(100%+22px)] group-hover:bg-[#ffe7f4]" />
            </span>
            <span className="home-story-cta-copy">지난 밤의 꿈을 기록해 보세요</span>
          </Link>

          <div className="home-scroll-arrow" style={{ opacity: arrowOpacity }}>
            <span />
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
