import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => React.createElement('div', { className: 'recharts-responsive-container' }, children),
  BarChart: ({ children }) => React.createElement('div', { className: 'recharts-barchart' }, children),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));
