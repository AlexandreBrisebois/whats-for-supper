import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate: _animate, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined) }),
  useMotionValueEvent: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

import { DiscoveryCard } from './DiscoveryCard';

const BASE_PROPS = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Test Recipe',
  description: 'A test recipe',
  imageUrl: '/img/test.jpg',
  onSwipeRight: vi.fn(),
  onSwipeLeft: vi.fn(),
  isFront: true,
  stackIndex: 0,
  totalTime: 'PT30M',
  category: 'Dinner',
};

describe('DiscoveryCard — hasFamilyInterest ring', () => {
  it('renders discovery-card-interest-ring when hasFamilyInterest is true', () => {
    render(<DiscoveryCard {...BASE_PROPS} hasFamilyInterest={true} />);
    expect(screen.getByTestId('discovery-card-interest-ring')).toBeInTheDocument();
  });

  it('does NOT render discovery-card-interest-ring when hasFamilyInterest is false', () => {
    render(<DiscoveryCard {...BASE_PROPS} hasFamilyInterest={false} />);
    expect(screen.queryByTestId('discovery-card-interest-ring')).not.toBeInTheDocument();
  });

  it('does NOT render discovery-card-interest-ring when hasFamilyInterest is omitted', () => {
    render(<DiscoveryCard {...BASE_PROPS} />);
    expect(screen.queryByTestId('discovery-card-interest-ring')).not.toBeInTheDocument();
  });
});
