import Link from "next/link";

const homeActions = [
  {
    href: "/dreams/new",
    eyebrow: "Fresh page",
    title: "꿈 기록 시작하기",
    description: "떠오른 장면과 감정을 바로 붙잡아 두고, 잊히기 전에 천천히 적어보세요.",
    cta: "지금 쓰기",
    accent: "from-[rgba(108,95,142,0.18)] via-[rgba(255,255,255,0.88)] to-[rgba(232,222,253,0.96)]",
    glow: "bg-[rgba(232,222,253,0.88)]",
  },
  {
    href: "/dreams",
    eyebrow: "Open archive",
    title: "아카이브 둘러보기",
    description: "기록해 둔 꿈을 다시 꺼내 읽고, 태그와 분위기로 천천히 찾아보세요.",
    cta: "기록 보러가기",
    accent: "from-[rgba(245,215,223,0.2)] via-[rgba(255,255,255,0.9)] to-[rgba(255,248,236,0.96)]",
    glow: "bg-[rgba(245,215,223,0.78)]",
  },
] as const;

const homeNotes = [
  { label: "Capture", description: "깨어난 직후 바로 기록하고" },
  { label: "Collect", description: "남는 장면만 골라 묶고" },
  { label: "Return", description: "시간이 지나 다시 꺼내보기" },
] as const;

export default function HomePage() {
  return (
    <div className="relative left-1/2 -mt-8 w-screen -translate-x-1/2">
      <section className="home-stage min-h-[calc(100vh-10rem)] px-6 py-12 md:px-10 md:py-16 lg:px-16 lg:py-20">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[rgba(245,215,223,0.5)] blur-3xl md:h-72 md:w-72" />
        <div className="absolute right-[-4rem] top-[18%] h-64 w-64 rounded-full bg-[rgba(232,222,253,0.72)] blur-3xl md:h-80 md:w-80" />
        <div className="absolute bottom-[-5rem] left-[18%] h-40 w-[32rem] rounded-full bg-[rgba(255,255,255,0.34)] blur-3xl" />

        <div className="relative mx-auto grid max-w-screen-2xl gap-12 px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end lg:px-12">
          <div className="max-w-4xl">
            <p className="section-kicker">Dream Journal Archive Service</p>
            <h1 className="page-title mt-6 max-w-4xl">A gentle home for your memories.</h1>
            <p className="page-copy mt-6 max-w-2xl">
              떠오른 장면과 감정을 꿈일기로 남기고, 시간이 지난 뒤에도 다시 꺼내 읽어보세요. 마음에 남는 기록은 골라서 한 권의
              책으로 차분히 엮을 수 있어요.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {homeNotes.map((note) => (
                <div key={note.label} className="home-memory-pill">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[rgba(95,83,105,0.72)]">{note.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--accent-strong)]">{note.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {homeActions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group block min-h-[220px] bg-gradient-to-br sm:min-h-[250px] lg:min-h-[220px] ${action.accent} home-action-link ${index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div
                  className={`absolute right-[-2.5rem] top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-2xl transition duration-500 group-hover:scale-110 ${action.glow}`}
                />

                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="max-w-[28rem]">
                    <p className="section-kicker text-[10px] text-[rgba(95,83,105,0.74)]">{action.eyebrow}</p>
                    <h2 className="mt-4 font-display text-[30px] leading-tight text-[var(--accent-strong)]">{action.title}</h2>
                    <p className="mt-4 max-w-[30ch] text-sm leading-7 text-[var(--muted-strong)]">{action.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--accent-strong)]">{action.cta}</span>
                    <span aria-hidden className="home-action-arrow">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
