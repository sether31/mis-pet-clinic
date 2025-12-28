import { RouterProvider } from "react-router-dom"
import { routes } from "./routes/routes"

export default function App() {
  return (
    <div className="text-(--clr-text-primary) bg-(--clr-bg-page) text-base">
      <RouterProvider router={routes} />
    </div>
  )
}
