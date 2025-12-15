import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

export const routes = createBrowserRouter([
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "forgotPassword", element: '' }
])