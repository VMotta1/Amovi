import { createHashRouter, Navigate } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import BudgetGoals from "./pages/BudgetGoals";
import RecurringTransactions from "./pages/RecurringTransactions";
import Investments from "./pages/Investments";
import Subscriptions from "./pages/Subscriptions";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import { useAuth } from "./providers/AuthProvider";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return user ? children : <Navigate to="/auth" replace />;
};

const AuthRoute = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  return user ? <Navigate to="/" replace /> : <Auth />;
};

export const router = createHashRouter([
  {
    path: "/auth",
    Component: AuthRoute,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/expenses",
        element: <Expenses />,
      },
      {
        path: "/income",
        element: <Income />,
      },
      {
        path: "/budget-goals",
        element: <BudgetGoals />,
      },
      {
        path: "/analytics",
        element: <Analytics />,
      },
      {
        path: "/transactions",
        element: <Transactions />,
      },
      {
        path: "/recurring",
        element: <RecurringTransactions />,
      },
      {
        path: "/investments",
        element: <Investments />,
      },
      {
        path: "/subscriptions",
        element: <Subscriptions />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
  // Redirect old routes to new combined page
  {
    path: "/budget-settings",
    element: <Navigate to="/budget-goals" replace />,
  },
  {
    path: "/goals",
    element: <Navigate to="/budget-goals" replace />,
  },
]);
