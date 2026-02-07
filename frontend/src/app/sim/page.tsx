'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const CivicLensApp = dynamic(
  () => import('@/components/map/CivicLensApp'),
  { ssr: false }
);

function SimPageInner() {
  const searchParams = useSearchParams();
  const buildingId = searchParams.get('building') || undefined;
  const heightOverride = searchParams.get('h')
    ? Number(searchParams.get('h'))
    : undefined;

  return (
    <CivicLensApp
      initialBuildingId={buildingId}
      heightOverride={heightOverride}
    />
  );
}

export default function SimPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#0a0a0f] flex items-center justify-center">
          <div className="text-[#6c63ff] font-mono text-sm animate-pulse">
            Loading simulation...
          </div>
        </div>
      }
    >
      <SimPageInner />
    </Suspense>
  );
}
