import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, detail }) => {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
};

export default MetricCard;
