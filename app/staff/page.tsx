import { PreferenceScreen } from "@/components/PreferenceScreen";
import { SiteHeader } from "@/components/SiteHeader";

export default function StaffPage() {
  return (
    <>
      <SiteHeader current="staff" />
      <PreferenceScreen />
    </>
  );
}
