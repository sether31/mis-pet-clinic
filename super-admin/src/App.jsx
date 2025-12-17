import { RouterProvider } from "react-router-dom"
import { routes } from "./routes/routes"

export default function App() {
  return (
    <div className="text-[var(--clr-text-primary] bg-[var(--clr-bg-page)] text-base">
      <RouterProvider router={routes} />
    </div>
  )
}
