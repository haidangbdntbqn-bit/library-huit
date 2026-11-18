import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import ReaderLayout from "../layouts/ReaderLayout";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Account from "../pages/reader/Account";
import BookDetail from "../pages/reader/BookDetail";
import Home from "../pages/reader/Home";
import MyLoans from "../pages/reader/MyLoans";
import ReaderRooms from "../pages/reader/Rooms";
import Search from "../pages/reader/Search";
import ReaderStore from "../pages/reader/Store";
import Dashboard from "../pages/admin/Dashboard";
import LoanCreate from "../pages/admin/LoanCreate";
import Loans from "../pages/admin/Loans";
import Returns from "../pages/admin/Returns";
import BorrowRequests from "../pages/admin/BorrowRequests";
import Readers from "../pages/admin/Readers";
import Cards from "../pages/admin/Cards";
import Violations from "../pages/admin/Violations";
import Books from "../pages/admin/Books";
import Imports from "../pages/admin/Imports";
import Liquidations from "../pages/admin/Liquidations";
import AdminRooms from "../pages/admin/Rooms";
import AdminStore from "../pages/admin/Store";
import Reports from "../pages/admin/Reports";
import StaffPage from "../pages/admin/Staff";
import Users from "../pages/admin/Users";
import SettingsPage from "../pages/admin/Settings";
import AuditLogsPage from "../pages/admin/AuditLogs";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/",
    element: <ReaderLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "books/:id", element: <BookDetail /> },
      { path: "rooms", element: <ReaderRooms /> },
      { path: "store", element: <ReaderStore /> },
      { path: "my-loans", element: <ProtectedRoute roles={["READER"]}><MyLoans /></ProtectedRoute> },
      { path: "account", element: <ProtectedRoute><Account /></ProtectedRoute> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["LIBRARIAN", "ADMIN"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "loans/new", element: <LoanCreate /> },
      { path: "loans", element: <Loans /> },
      { path: "returns", element: <Returns /> },
      { path: "borrow-requests", element: <BorrowRequests /> },
      { path: "readers", element: <Readers /> },
      { path: "cards", element: <Cards /> },
      { path: "violations", element: <Violations /> },
      { path: "books", element: <Books /> },
      { path: "imports", element: <Imports /> },
      { path: "liquidations", element: <Liquidations /> },
      { path: "rooms", element: <AdminRooms /> },
      { path: "store", element: <AdminStore /> },
      { path: "reports", element: <Reports /> },
      { path: "staff", element: <ProtectedRoute roles={["ADMIN"]}><StaffPage /></ProtectedRoute> },
      { path: "users", element: <ProtectedRoute roles={["ADMIN"]}><Users /></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute roles={["ADMIN"]}><SettingsPage /></ProtectedRoute> },
      { path: "audit-logs", element: <ProtectedRoute roles={["ADMIN"]}><AuditLogsPage /></ProtectedRoute> },
    ],
  },
]);
