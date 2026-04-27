import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden rounded-[40px] px-8 py-20 text-center md:px-12">
        <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-[rgba(255,255,255,0.45)] via-[rgba(244,241,251,0.75)] to-[rgba(232,222,253,0.85)]" />
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[rgba(245,215,223,0.5)] blur-3xl" />
        <div className="absolute -right-12 bottom-4 h-64 w-64 rounded-full bg-[rgba(232,222,253,0.7)] blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <p className="section-kicker">Dream Journal Archive Service</p>
          <h1 className="page-title mt-6">A gentle home for your memories.</h1>
          <p className="page-copy mx-auto mt-6 max-w-2xl">
            떠오른 장면과 감정을 꿈일기로 남기고, 시간이 지난 뒤에도 다시 꺼내 읽어보세요. 마음에 남는 기록은 골라서 한 권의 책으로
            차분히 엮을 수 있어요.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dreams/new" className="primary-button min-w-[180px]">
              꿈 기록 시작하기
            </Link>
            <Link href="/dreams" className="secondary-button min-w-[180px]">
              아카이브 둘러보기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
