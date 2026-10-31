import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

let onDragEnd: ((event: unknown, info: unknown) => void) | undefined;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onDragEnd: dragEnd,
      animate: _animate,
      transition: _transition,
      ...props
    }: any) => {
      if (dragEnd) onDragEnd = dragEnd;
      return <div {...props}>{children}</div>;
    },
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined) }),
  useMotionValueEvent: vi.fn(),
  useDragControls: () => ({ start: vi.fn() }),
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
  cuisineType: 'Italian',
  mealTypes: ['Supper', 'Lunch'],
};

describe('DiscoveryCard — neutral visual parity', () => {
  it('renders cuisine and meal-type badges cluster above description', () => {
    render(<DiscoveryCard {...BASE_PROPS} />);
    expect(screen.getByTestId('discovery-card-cuisine-badge')).toBeInTheDocument();
    expect(screen.getByTestId('discovery-card-meal-type-supper')).toBeInTheDocument();
    expect(screen.getByTestId('discovery-card-meal-type-lunch')).toBeInTheDocument();
  });

  it('does not require vote-specific highlight ring when hasFamilyInterest is true', () => {
    render(<DiscoveryCard {...BASE_PROPS} hasFamilyInterest={true} />);
    expect(screen.getByTestId('discovery-card')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-card-interest-ring')).not.toBeInTheDocument();
  });

  it('renders the same card anchor when hasFamilyInterest is false', () => {
    render(<DiscoveryCard {...BASE_PROPS} hasFamilyInterest={false} />);
    expect(screen.getByTestId('discovery-card')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-card-interest-ring')).not.toBeInTheDocument();
  });

  it('renders without vote-specific highlight ring when hasFamilyInterest is omitted', () => {
    render(<DiscoveryCard {...BASE_PROPS} />);
    expect(screen.getByTestId('discovery-card')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-card-interest-ring')).not.toBeInTheDocument();
  });
});

// Raw-duration consumers retain the same units as Home.
describe('raw recipe total duration', () => {
  it.each([
    ['PT6H', '6H'],
    ['PT1H30M', '1H 30 MINS'],
    ['PT45M', '45 MINS'],
    ['PT360M', '6H'],
  ])('renders %s without losing units', (totalTime, expected) => {
    render(<DiscoveryCard {...BASE_PROPS} totalTime={totalTime} />);
    expect(screen.getByText(`READY IN ${expected}`)).toBeInTheDocument();
  });
});

beforeEach(() => vi.clearAllMocks());
describe('Discovery — preserved voting release boundaries', () => {
  it.each([
    [80, 0, null],
    [0, 500, null],
    [80.01, 0, 'right'],
    [0, 500.01, 'right'],
    [-80, 0, null],
    [0, -500, null],
    [-80.01, 0, 'left'],
    [0, -500.01, 'left'],
  ])('retains displacement %s / velocity %s policy', async (offset, velocity, direction) => {
    render(<DiscoveryCard {...BASE_PROPS} />);
    await onDragEnd!(null, { offset: { x: offset, y: 0 }, velocity: { x: velocity, y: 0 } });
    expect(BASE_PROPS.onSwipeRight).toHaveBeenCalledTimes(direction === 'right' ? 1 : 0);
    expect(BASE_PROPS.onSwipeLeft).toHaveBeenCalledTimes(direction === 'left' ? 1 : 0);
  });
});
