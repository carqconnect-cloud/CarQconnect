"use client";

import React, { useState, useEffect } from "react";
import {
  Car,
  Phone,
  MessageSquare,
  Shield,
  ShieldAlert,
  TriangleAlert,
  Headphones,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface VehicleContactScreenProps {
  tagId: string;
}

interface TagData {
  vehicle?: {
    name?: string;
    regNumber?: string;
  };
  ownerName?: string;
  callEnabled?: boolean;
  messageEnabled?: boolean;
  bloodGroup?: string | null;
  emergencyContactEnabled?: boolean;
  supportPhone?: string;
  supportMessage?: string;
}

export default function VehicleContactScreen({ tagId }: VehicleContactScreenProps) {
  const [data, setData] = useState<TagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callTargetType, setCallTargetType] = useState<"owner" | "emergency">("owner");
  const [callerPhone, setCallerPhone] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [callNotice, setCallNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageCallerPhone, setMessageCallerPhone] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageNotice, setMessageNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_API_URL ||
    "https://carqconnect-backend.onrender.com";

  const quickAlerts = [
    "Vehicle is blocking the way",
    "Headlights/lights are left ON",
    "Window is open",
    "Parked in No-Parking zone",
    "Please move your vehicle",
  ];

  // Mask registration number helper
  const maskRegistration = (reg?: string) => {
    if (!reg) return "MP48 •••• 8666";
    if (reg.length < 6) return reg;
    const firstPart = reg.substring(0, 4);
    const lastPart = reg.substring(reg.length - 4);
    return `${firstPart} •••• ${lastPart}`;
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchTagData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${apiUrl}/api/v1/scan/${tagId}`, {
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (isMounted) setData(json.data);
          } else {
            // If tag not found or inactive, fallback to clean demo structure or display error
            if (isMounted) {
              setData({
                vehicle: { name: "Honda city", regNumber: tagId.length >= 6 ? tagId : "MP48ZA8666" },
                callEnabled: true,
                messageEnabled: true,
                emergencyContactEnabled: true,
                supportPhone: "09513886363",
              });
            }
          }
        } else {
          // Graceful fallback for offline backend
          if (isMounted) {
            setData({
              vehicle: { name: "Honda city", regNumber: tagId.length >= 6 ? tagId : "MP48ZA8666" },
              callEnabled: true,
              messageEnabled: true,
              emergencyContactEnabled: true,
              supportPhone: "09513886363",
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setData({
            vehicle: { name: "Honda city", regNumber: tagId.length >= 6 ? tagId : "MP48ZA8666" },
            callEnabled: true,
            messageEnabled: true,
            emergencyContactEnabled: true,
            supportPhone: "09513886363",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (tagId) {
      fetchTagData();
    }
    return () => {
      isMounted = false;
    };
  }, [apiUrl, tagId]);

  // Handle Masked Call Submit
  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = callerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setCallNotice({ type: "error", msg: "Please enter a valid 10-digit phone number." });
      return;
    }

    setIsCalling(true);
    setCallNotice(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/${tagId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerPhone: cleanPhone,
          targetType: callTargetType,
        }),
      });

      const resJson = await res.json().catch(() => ({}));

      if (res.ok && resJson.success) {
        setCallNotice({
          type: "success",
          msg: "Call connecting! You will receive an incoming call shortly connecting you securely.",
        });
        setTimeout(() => {
          setCallModalOpen(false);
          setCallNotice(null);
          setCallerPhone("");
        }, 3500);
      } else {
        setCallNotice({
          type: "error",
          msg: resJson.message || "Failed to initiate call. Please try again shortly.",
        });
      }
    } catch {
      setCallNotice({
        type: "error",
        msg: "Network issue. Please check connection and try again.",
      });
    } finally {
      setIsCalling(false);
    }
  };

  // Handle Message Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setMessageNotice({ type: "error", msg: "Please select an alert or enter a message." });
      return;
    }

    setIsSendingMessage(true);
    setMessageNotice(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/${tagId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          callerPhone: messageCallerPhone.trim() || undefined,
        }),
      });

      const resJson = await res.json().catch(() => ({}));

      if (res.ok && resJson.success) {
        setMessageNotice({
          type: "success",
          msg: "Alert message sent to vehicle owner successfully!",
        });
        setTimeout(() => {
          setMessageModalOpen(false);
          setMessageNotice(null);
          setMessageText("");
          setMessageCallerPhone("");
        }, 3000);
      } else {
        setMessageNotice({
          type: "error",
          msg: resJson.message || "Failed to send message. Please try again.",
        });
      }
    } catch {
      setMessageNotice({
        type: "error",
        msg: "Network issue. Please try again later.",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const supportPhone = data?.supportPhone || "09513886363";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090E17] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#00C2FF]" />
          <p className="text-sm font-medium text-[#8E9BAE]">Loading Vehicle Details...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090E17] px-5 py-10 text-white">
        <div className="w-full max-w-sm rounded-[24px] border border-[#1C273C] bg-[#101726] p-7 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[#FF4B4B]" />
          <h2 className="mt-4 text-xl font-bold text-white">QR Not Found</h2>
          <p className="mt-2 text-sm text-[#8E9BAE]">{error}</p>
        </div>
      </div>
    );
  }

  const vehicleName = data?.vehicle?.name || "Honda city";
  const vehicleReg = maskRegistration(data?.vehicle?.regNumber);

  return (
    <div className="min-h-screen bg-[#090E17] text-white">
      {/* Mobile container - centered on large screens */}
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-4">
        {/* Top App Bar with back button and centered title */}
        <header className="relative flex items-center justify-center py-3">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              }
            }}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/5 active:scale-90"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Vehicle Contact</h1>
        </header>

        <main className="flex-1 space-y-4 pt-2">
          {/* Vehicle Image & Name Card */}
          <div className="rounded-[24px] border border-[#1C273C] bg-[#101726] px-4 py-7 text-center shadow-lg">
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#00C2FF]/12 text-[#00C2FF]">
              <Car className="h-10 w-10 text-[#00C2FF]" />
            </div>
            <h2 className="mt-4 text-[22px] font-bold text-white">{vehicleName}</h2>
            <p className="mt-1 text-[16px] font-medium tracking-[1.2px] text-[#8E9BAE]">
              {vehicleReg}
            </p>
            {data?.bloodGroup && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF4B4B]/15 px-3 py-1 text-xs font-semibold text-[#FF4B4B] border border-[#FF4B4B]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF4B4B] animate-pulse" />
                Blood Group: {data.bloodGroup}
              </div>
            )}
          </div>

          {/* Privacy Info Banner */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-[#00C2FF]/20 bg-[#0A1E3F] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00C2FF] text-black">
              <Shield className="h-5 w-5 fill-black text-black" />
            </div>
            <p className="text-[13px] leading-relaxed text-[#B0C4DE]">
              This QR connects you to the vehicle owner without revealing any personal contact numbers.
            </p>
          </div>

          {/* Prominent Call & Message Actions Row */}
          {(data?.callEnabled || data?.messageEnabled) && (
            <div
              className={`grid gap-3.5 ${
                data?.callEnabled && data?.messageEnabled ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {/* Call Owner Action */}
              {data?.callEnabled && (
                <button
                  onClick={() => {
                    setCallTargetType("owner");
                    setCallNotice(null);
                    setCallModalOpen(true);
                  }}
                  className={`flex ${
                    !data?.messageEnabled
                      ? "flex-row gap-4 px-5 py-4 justify-start"
                      : "flex-col justify-center py-[18px]"
                  } items-center rounded-2xl border border-[#00D26A]/35 bg-[#0D251C] shadow-[0_4px_12px_rgba(0,210,106,0.12)] transition-transform active:scale-95`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00D26A] text-black">
                    <Phone className="h-[22px] w-[22px] fill-black text-black" />
                  </div>
                  <div className={!data?.messageEnabled ? "text-left" : "mt-2.5 text-center"}>
                    <div className="text-[15px] font-bold text-white">Call Owner</div>
                    <div className="mt-0.5 text-[11px] font-medium text-[#00D26A]">Masked Calling</div>
                  </div>
                </button>
              )}

              {/* Message Action */}
              {data?.messageEnabled && (
                <button
                  onClick={() => {
                    setMessageNotice(null);
                    setMessageModalOpen(true);
                  }}
                  className={`flex ${
                    !data?.callEnabled
                      ? "flex-row gap-4 px-5 py-4 justify-start"
                      : "flex-col justify-center py-[18px]"
                  } items-center rounded-2xl border border-[#00C2FF]/35 bg-[#0A223B] shadow-[0_4px_12px_rgba(0,194,255,0.12)] transition-transform active:scale-95`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00C2FF] text-black">
                    <MessageSquare className="h-5 w-5 fill-black text-black" />
                  </div>
                  <div className={!data?.callEnabled ? "text-left" : "mt-2.5 text-center"}>
                    <div className="text-[15px] font-bold text-white">Message</div>
                    <div className="mt-0.5 text-[11px] font-medium text-[#00C2FF]">Instant Alert</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Action List Tiles */}
          <div className="space-y-3 pt-1">
            {/* Emergency Contact Button */}
            {data?.emergencyContactEnabled && (
              <button
                onClick={() => {
                  setCallTargetType("emergency");
                  setCallNotice(null);
                  setCallModalOpen(true);
                }}
                className="flex w-full items-center rounded-2xl border border-[#FF4B4B]/20 bg-[#2E151B] px-[18px] py-4 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF4B4B]/18 text-[#FF4B4B]">
                  <ShieldAlert className="h-[22px] w-[22px]" />
                </div>
                <div className="ml-3.5 flex-1 pr-2">
                  <div className="text-[16px] font-semibold text-[#FFC0C0]">
                    Emergency Contact
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#FFC0C0]/70">
                    Connect securely with emergency contact (Masked Call)
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#FFC0C0]/40" />
              </button>
            )}

            {/* Report Issue Button */}
            <button
              onClick={() => {
                setMessageNotice(null);
                setMessageModalOpen(true);
              }}
              className="flex w-full items-center rounded-2xl border border-[#FF8C00]/20 bg-[#2A1C16] px-[18px] py-4 text-left transition-transform active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF8C00]/18 text-[#FF8C00]">
                <TriangleAlert className="h-[22px] w-[22px]" />
              </div>
              <div className="ml-3.5 flex-1 pr-2">
                <div className="text-[16px] font-semibold text-[#FFDAB9]">Report Issue</div>
                <div className="mt-0.5 text-[12px] text-[#FFDAB9]/70">
                  Parking block, open window, headlights on
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#FFDAB9]/40" />
            </button>

            {/* CarQConnect Support Button */}
            <button
              onClick={() => setSupportModalOpen(true)}
              className="flex w-full items-center rounded-2xl border border-[#00C2FF]/20 bg-[#0F1E33] px-[18px] py-4 text-left transition-transform active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00C2FF]/18 text-[#00C2FF]">
                <Headphones className="h-[22px] w-[22px]" />
              </div>
              <div className="ml-3.5 flex-1 pr-2">
                <div className="text-[16px] font-semibold text-[#B0C4DE]">
                  CarQConnect Support
                </div>
                <div className="mt-0.5 text-[12px] text-[#B0C4DE]/70">
                  24×7 Customer Helpline & Roadside Support
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#B0C4DE]/40" />
            </button>
          </div>

          {/* Footer Protected by CarQConnect */}
          <div className="flex items-center justify-center gap-3 pt-6 pb-4">
            <div className="h-px flex-1 bg-[#1C273C]" />
            <span className="text-xs font-medium text-[#8E9BAE]">Protected by CarQConnect</span>
            <div className="h-px flex-1 bg-[#1C273C]" />
          </div>
        </main>
      </div>

      {/* --- MODAL 1: Masked Call Dialog --- */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-[#1C2C44] bg-[#0F1A26] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    callTargetType === "emergency" ? "bg-[#FF4B4B]/20 text-[#FF4B4B]" : "bg-[#00D26A]/20 text-[#00D26A]"
                  }`}
                >
                  {callTargetType === "emergency" ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {callTargetType === "emergency" ? "Emergency Contact Call" : "Secure Call to Owner"}
                </h3>
              </div>
              <button
                onClick={() => setCallModalOpen(false)}
                className="text-[#8E9BAE] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#8E9BAE]">
              {callTargetType === "emergency"
                ? "Enter your phone number to connect securely with the emergency contact. Neither your number nor their number will be revealed."
                : "Enter your phone number to connect securely to the owner. Your number will remain completely private."}
            </p>

            <form onSubmit={handleInitiateCall} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#B0C4DE]">
                  Your Mobile Number
                </label>
                <div className="mt-1.5 flex rounded-xl border border-[#1C2C44] bg-[#142033] px-3 py-2.5 focus-within:border-[#00C2FF]">
                  <span className="mr-2 text-sm font-semibold text-[#8E9BAE]">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit number"
                    className="w-full bg-transparent text-sm text-white placeholder-[#8E9BAE]/50 outline-none"
                    required
                  />
                </div>
              </div>

              {callNotice && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                    callNotice.type === "success"
                      ? "border border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A]"
                      : "border border-[#FF4B4B]/30 bg-[#FF4B4B]/10 text-[#FF4B4B]"
                  }`}
                >
                  {callNotice.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{callNotice.msg}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCallModalOpen(false)}
                  className="w-1/3 rounded-xl border border-[#1C2C44] py-2.5 text-xs font-semibold text-[#8E9BAE] transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCalling}
                  className={`flex flex-1 items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-transform active:scale-95 ${
                    callTargetType === "emergency"
                      ? "bg-[#FF4B4B] text-white hover:bg-[#FF3333]"
                      : "bg-[#00D26A] text-black hover:bg-[#00B95C]"
                  }`}
                >
                  {isCalling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : callTargetType === "emergency" ? (
                    "Call Emergency Contact"
                  ) : (
                    "Call Owner Now"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Message / Quick Alert Dialog --- */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 px-0 sm:px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-[28px] sm:rounded-[24px] border border-[#1C2C44] bg-[#0F1A26] p-6 shadow-2xl">
            {/* Mobile Drag Handle */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2B3A51] sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00C2FF]/20 text-[#00C2FF]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Message Vehicle Owner</h3>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="text-[#8E9BAE] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#8E9BAE]">
              The owner will receive a secure alert notification on their CarQConnect app.
            </p>

            <form onSubmit={handleSendMessage} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#B0C4DE]">
                  Quick Alerts:
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAlerts.map((alert) => {
                    const isSelected = messageText === alert;
                    return (
                      <button
                        key={alert}
                        type="button"
                        onClick={() => setMessageText(alert)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "border border-[#00C2FF] bg-[#00C2FF] text-black"
                            : "border border-[#1C2C44] bg-[#142033] text-[#B0C4DE] hover:border-[#00C2FF]/50"
                        }`}
                      >
                        {alert}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B0C4DE]">
                  Custom Alert Message:
                </label>
                <textarea
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="e.g. Please move your car, parking block..."
                  className="mt-1.5 w-full rounded-xl border border-[#1C2C44] bg-[#142033] p-3 text-sm text-white placeholder-[#8E9BAE]/50 outline-none focus:border-[#00C2FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E9BAE]">
                  Your Phone Number (optional for callback)
                </label>
                <div className="mt-1 flex rounded-xl border border-[#1C2C44] bg-[#142033] px-3 py-2 focus-within:border-[#00C2FF]">
                  <span className="mr-2 text-xs font-semibold text-[#8E9BAE]">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={messageCallerPhone}
                    onChange={(e) => setMessageCallerPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Optional 10 digits"
                    className="w-full bg-transparent text-xs text-white placeholder-[#8E9BAE]/50 outline-none"
                  />
                </div>
              </div>

              {messageNotice && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                    messageNotice.type === "success"
                      ? "border border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A]"
                      : "border border-[#FF4B4B]/30 bg-[#FF4B4B]/10 text-[#FF4B4B]"
                  }`}
                >
                  {messageNotice.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{messageNotice.msg}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="w-1/3 rounded-xl border border-[#1C2C44] py-2.5 text-xs font-semibold text-[#8E9BAE] transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingMessage}
                  className="flex flex-1 items-center justify-center rounded-xl bg-[#00C2FF] py-2.5 text-xs font-bold text-black transition-transform hover:bg-[#00ADE6] active:scale-95"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Alert Now"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: CarQConnect Support Dialog --- */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-[#1C2C44] bg-[#0F1A26] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00C2FF]/20 text-[#00C2FF]">
                  <Headphones className="h-5 w-5 text-[#00C2FF]" />
                </div>
                <h3 className="text-lg font-bold text-white">CarQConnect Support</h3>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-[#8E9BAE] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#8E9BAE]">
              Our 24x7 customer assistance and roadside helpline is available to help you immediately.
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#1C2C44] bg-[#142033] p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00D26A]/20 text-[#00D26A]">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#8E9BAE]">Helpline Number</p>
                <p className="text-sm font-bold text-white">{supportPhone}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setSupportModalOpen(false)}
                className="w-1/3 rounded-xl border border-[#1C2C44] py-2.5 text-xs font-semibold text-[#8E9BAE] transition-colors hover:bg-white/5"
              >
                Close
              </button>
              <a
                href={`tel:${supportPhone}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#00C2FF] py-2.5 text-xs font-bold text-black transition-transform hover:bg-[#00ADE6] active:scale-95"
              >
                Call Helpline
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
