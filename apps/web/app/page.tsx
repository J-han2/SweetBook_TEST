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
            DreamArchive는 꿈일기 콘텐츠를 기록하고 다시 탐색하는 경험이 중심인 서비스입니다.
            책 초안과 주문은 그 기록을 확장하는 부가 기능으로 자연스럽게 이어집니다.
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
