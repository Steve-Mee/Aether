import { Navigate } from 'react-router-dom';
import React from 'react';

/** Legacy route — command center is home. */
export default function Dashboard() {
  return <Navigate to="/" replace />;
}
