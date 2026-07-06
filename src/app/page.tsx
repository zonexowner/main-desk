import { DeskView } from "@/components/DeskView";
import { getDeskPayload } from "@/lib/services/desk-data";

export const dynamic = "force-dynamic";

export default async function MainDeskPage() {
  const initial = await getDeskPayload();
  return <DeskView initial={initial} />;
}
