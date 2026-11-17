import React from 'react';

export const HERO_IMAGE = 'https://media.base44.com/images/public/697c6a76a32bbc3cd9c4736d/3676be7ef_generated_image.png';

export function ArkMark({ size = 28 }) {
  return <svg width={size} height={size * 0.7} viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 12 L20 3 L34 12" />
    <path d="M4 16 H36 L31 23 H9 Z" />
    <path d="M2 26 C8 24 12 28 20 26 C28 24 32 28 38 26" />
  </svg>;
}

export function BrandLockup() {
  return <span className="halo-lockup">
    <span className="halo-wordmark">HaloSuite</span>
    <span className="halo-divider" />
    <span className="halo-ark"><ArkMark size={26} />ARK</span>
  </span>;
}