import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { CreateHouseholdModal, JoinHouseholdModal } from './components/HouseholdModals';
import { LoadingSpinner } from './components/LoadingSpinner';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { BillsPage } from './pages/BillsPage';
import { SavingsPage } from './pages/SavingsPage';
import { HouseholdPage } from './pages/HouseholdPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Protected Route Guard
const ProtectedLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking TipidLink session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar
          onOpenCreateHousehold={() => setIsCreateOpen(true)}
          onOpenJoinHousehold={() => setIsJoinOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route
              path="/household"
              element={
                <HouseholdPage
                  onOpenCreate={() => setIsCreateOpen(true)}
                  onOpenJoin={() => setIsJoinOpen(true)}
                />
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <MobileNav />

        {/* Global Household Modals */}
        <CreateHouseholdModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
        <JoinHouseholdModal
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
        />
      </div>
    </FinanceProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected App Routes */}
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
