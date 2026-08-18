import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { className: 'recharts-responsive-container' }, children),
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { className: 'recharts-barchart' }, children),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));
