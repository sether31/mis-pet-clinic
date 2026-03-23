// views
import BranchAdminView from "./views/BranchAdminView";
import ClinicAdminView from "./views/ClinicAdminView";
// hooks (assuming you have a custom hook for user data)
import { useUser } from "../../../hooks/useUser"; 

export default function Analytics() {
  const { user } = useUser();

  return (
    <>
      {/* Conditionally render based on role */}
      {user?.role == 'clinic_admin' ? (
        <ClinicAdminView />
      ) : (
        <BranchAdminView />
      )}
    </>
  );
}