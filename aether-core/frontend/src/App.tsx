import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Emails from './pages/Emails';
import Suppliers from './pages/Suppliers';
import Autonomous from './pages/Autonomous';
import CommandHistory from './pages/CommandHistory';
import Settings from './pages/Settings';
import React from 'react';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/autonomous" element={<Autonomous />} />
          <Route path="/history" element={<CommandHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;