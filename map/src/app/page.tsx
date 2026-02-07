import dynamic from 'next/dynamic';

const CivicLensApp = dynamic(() => import('@/components/CivicLensApp'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2a2a3e] border-t-[#6c63ff]" />
        <p className="text-sm text-[#9898b0]">Loading CivicLens…</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <CivicLensApp />;
}
