import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import SubmissionStatus from '../components/SubmissionStatus';

export const SubmissionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  if (!id) {
    return (
      <div className="page-panel">
        <p className="validation" role="alert">Invalid submission link.</p>
      </div>
    );
  }

  return <SubmissionStatus id={id} token={token} />;
};

export default SubmissionPage;
