// Mock resolver data for the public QR portal. In production this comes
// from the QR resolution API (GET /qr/:id) — not a database lookup from
// the frontend.

export type QrStatus = "active" | "inactive" | "suspended" | "not_found";

export type QrRecord = {
  id: string;
  status: QrStatus;
  vehicleLabel: string; // masked/partial, never the full private record
  safetyStatus: string;
  actions: {
    call: boolean;
    message: boolean;
    report: boolean;
    emergency: boolean;
  };
};

const records: Record<string, QrRecord> = {
  "8F2K91": {
    id: "8F2K91",
    status: "active",
    vehicleLabel: "MP09 XX 1234",
    safetyStatus: "Active",
    actions: { call: true, message: true, report: true, emergency: true },
  },
  "INACTIVE01": {
    id: "INACTIVE01",
    status: "inactive",
    vehicleLabel: "",
    safetyStatus: "",
    actions: { call: false, message: false, report: false, emergency: false },
  },
  "SUSPENDED01": {
    id: "SUSPENDED01",
    status: "suspended",
    vehicleLabel: "",
    safetyStatus: "",
    actions: { call: false, message: false, report: false, emergency: false },
  },
};

export async function resolveQr(id: string): Promise<QrRecord> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'https://carqconnect-backend.onrender.com';
  try {
    const res = await fetch(`${apiUrl}/api/v1/scan/${id}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const item = json.data;
        return {
          id,
          status: 'active',
          vehicleLabel: item.vehicle?.regNumber || item.vehicle?.name || 'Vehicle Protected',
          safetyStatus: 'Active',
          actions: {
            call: item.callEnabled ?? true,
            message: item.messageEnabled ?? true,
            report: true,
            emergency: item.emergencyContactEnabled ?? true,
          },
        };
      }
    }
  } catch (e) {
    console.error('Error resolving QR from backend:', e);
  }

  return records[id] ?? {
    id,
    status: 'not_found',
    vehicleLabel: '',
    safetyStatus: '',
    actions: { call: false, message: false, report: false, emergency: false },
  };
}
