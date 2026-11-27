import { PlannerScreen } from "@/components/PlannerScreen";
import { SiteHeader } from "@/components/SiteHeader";

export default function ManagerPage() {
  return (
    <>
      <SiteHeader current="manager" />
      <PlannerScreen />
    </>
  );
}
