import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/auth/Login";

export const routes = createBrowserRouter([
  { path: "login", element: <Login /> },
]);