'use client';

import dynamic from 'next/dynamic';

const CivicLensApp = dynamic(
  () => import('@/components/map/CivicLensApp'),
  { ssr: false }
);

export default function SimulatePage() {
  return <CivicLensApp />;
}
