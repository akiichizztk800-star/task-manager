import { EmployeeScreen } from "@/components/EmployeeScreen";
import { SiteHeader } from "@/components/SiteHeader";

export default function EmployeesPage() {
  return (
    <>
      <SiteHeader current="employees" />
      <EmployeeScreen />
    </>
  );
}
