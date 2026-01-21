import { useContext } from "react"
import { PlatformContext } from "../contexts/PlatformProvider"


export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if(!context) throw new Error("usePlatform must be used within a PlatformProvider.");

  return context;
}