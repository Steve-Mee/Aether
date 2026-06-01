import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import NavigationTelemetryBridge from './components/NavigationTelemetryBridge';
import { CommandProvider } from './lib/CommandContext';
import { DashboardProvider } from './lib/DashboardContext';
import Skeleton from './components/ui/Skeleton';
import React from 'react';

const CommandCenterPage = lazy(() => import('./pages/CommandCenterPage'));
const ActionTimeline = lazy(() => import('./pages/ActionTimeline'));
const Workstream = lazy(() => import('./pages/Workstream'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const Emails = lazy(() => import('./pages/Emails'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Autonomous = lazy(() => import('./pages/Autonomous'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Insights = lazy(() => import('./pages/Insights'));
const Negotiations = lazy(() => import('./pages/Negotiations'));
const Outcomes = lazy(() => import('./pages/Outcomes'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <NavigationTelemetryBridge />
      <CommandProvider>
        <DashboardProvider>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<CommandCenterPage />} />
              <Route path="/workstream" element={<Workstream />} />
              <Route path="/timeline" element={<ActionTimeline />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cockpit" element={<Navigate to="/" replace />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/autonomous" element={<Autonomous />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/negotiations" element={<Negotiations />} />
              <Route path="/history" element={<Navigate to="/timeline" replace />} />
              <Route path="/outcomes" element={<Outcomes />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
        </DashboardProvider>
      </CommandProvider>
    </Router>
  );
}

export default App;
