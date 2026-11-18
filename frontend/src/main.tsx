import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Providers from "./providers/Providers.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/home/Home.tsx";
import Register from "./pages/register/Register.tsx";
import Login from "./pages/login/Login.tsx";
import FoundItemsPage from "./pages/foundItems/FoundItems.tsx";
import SingleFoundItem from "./pages/foundItems/SingleFoundItem.tsx";
import LostItemsPage from "./pages/lostItems/LostItems.tsx";
import MyClaimReqPage from "./pages/myClaimRequest/MyClaimReqPage.tsx";
import ReceivedClaimsPage from "./dashboard/receivedClaims/ReceivedClaims.tsx";
import SingleLostItem from "./pages/lostItems/SingleLostItem.tsx";
import DashboardLayout from "./dashboard/DashboardLayout.tsx";
import Dashboard from "./dashboard/Dashboard.tsx";
import FoundItemsManagement from "./dashboard/pages/FoundItemsManagement.tsx";
import LostItemsManagement from "./dashboard/pages/LostItemsManagement.tsx";
import ClaimsManagement from "./dashboard/pages/ClaimsManagement.tsx";
import UsersManagement from "./dashboard/pages/UsersManagement.tsx";
import CategoriesManagement from "./dashboard/pages/CategoriesManagement.tsx";
import Settings from "./dashboard/pages/Settings.tsx";
import MyFoundItems from "./dashboard/myFoundItems/MyFoundItems.tsx";
import MyLostItems from "./dashboard/myLostItems/MyLostItems.tsx";
import ReportLostItem from "./pages/reportlostItem/ReportLostItem.tsx";
import ReportFoundItem from "./pages/reportFoundItem/ReportFoundItem.tsx";
import AiSearch from "./pages/aiSearch/AiSearch.tsx";
import Messages from "./pages/messages/Messages.tsx";
import Notifications from "./pages/notifications/Notifications.tsx";
import OAuthCallback from "./pages/auth/OAuthCallback.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import ResetPassword from "./pages/auth/ResetPassword.tsx";
import VerifyEmail from "./pages/auth/VerifyEmail.tsx";
import NotFound from "./pages/notFound/NotFound.tsx";
import { RequireAuth, RequireAdmin } from "./components/guards/ProtectedRoute.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/foundItems",
        element: <FoundItemsPage />,
      },
      {
        path: "/lostItems",
        element: <LostItemsPage />,
      },
      {
        path: "/foundItems/:foundItem",
        element: <SingleFoundItem />,
      },
      {
        path: "/lostItems/:lostItem",
        element: <SingleLostItem />,
      },
      {
        path: "/reportLostItem",
        element: (
          <RequireAuth>
            <ReportLostItem />
          </RequireAuth>
        ),
      },
      {
        path: "/reportFoundItem",
        element: (
          <RequireAuth>
            <ReportFoundItem />
          </RequireAuth>
        ),
      },
      {
        path: "/ai-search",
        element: <AiSearch />,
      },
      {
        path: "/messages",
        element: <Messages />,
      },
      {
        path: "/notifications",
        element: (
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        ),
      },
      {
        path: "/messages/:chatId",
        element: <Messages />,
      },
      {
        path: "/oauth/callback",
        element: <OAuthCallback />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },
      {
        path: "/verify-email",
        element: <VerifyEmail />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/found-items",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <FoundItemsManagement />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/lost-items",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <LostItemsManagement />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/claims",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <ClaimsManagement />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/users",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <UsersManagement />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/categories",
    element: (
      <RequireAdmin>
        <DashboardLayout>
          <CategoriesManagement />
        </DashboardLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/dashboard/settings",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/myFoundItems",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <MyFoundItems />
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/myLostItems",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <MyLostItems />
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/myClaimRequest",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <MyClaimReqPage />
        </DashboardLayout>
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/receivedClaims",
    element: (
      <RequireAuth>
        <DashboardLayout>
          <ReceivedClaimsPage />
        </DashboardLayout>
      </RequireAuth>
    ),
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
);
