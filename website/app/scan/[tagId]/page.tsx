import VehicleContactScreen from "@/components/qr/VehicleContactScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicle Contact | CarQConnect",
  description: "Connect securely with vehicle owner via masked call and instant alert.",
  robots: { index: false, follow: false },
};

export default function PublicScanPage({ params }: { params: { tagId: string } }) {
  return <VehicleContactScreen tagId={params.tagId} />;
}
