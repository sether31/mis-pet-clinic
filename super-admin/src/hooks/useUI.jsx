import { useContext } from "react"
import { UIContext } from "../contexts/UiProvider"

export const useUI = () => {
  const context = useContext(UIContext);
  if(!context) throw new Error("useUI must be used within a UserProvider.");

  return context;
}