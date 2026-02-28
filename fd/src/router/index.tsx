import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminPanel from "../pages/Admin";
import ForgetPassword from "../pages/ForgetPassword";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import { AdminRoute, ProtectedRoute } from "./guards";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <Navigate to="/profile" replace />,
	},
	{
		path: "/login",
		element: <Login />,
	},
	{
		path: "/register",
		element: <Register />,
	},
	{
		path: "/forget_password",
		element: <ForgetPassword />,
	},
	{
		path: "/profile",
		element: (
			<ProtectedRoute>
				<Profile />
			</ProtectedRoute>
		),
	},
	{
		path: "/admin",
		element: (
			<AdminRoute>
				<AdminPanel />
			</AdminRoute>
		),
	},
]);
