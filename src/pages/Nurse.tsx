import { Users, AlertCircle, Pill, BedDouble } from "lucide-react";
import { NurseHeader } from "@/components/nurse/NurseHeader";
import { StatCard } from "@/components/nurse/StatCard";
import { PendingPatients } from "@/components/nurse/PendingPatients";
import { VitalsEntry } from "@/components/nurse/VitalsEntry";
import { EmergencyAlert } from "@/components/nurse/EmergencyAlert";
import { MedicineSchedule } from "@/components/nurse/MedicineSchedule";
import { RoomAssignment } from "@/components/nurse/RoomAssignment";

const Nurse = () => {
  return (
    <div className="min-h-screen">
      <NurseHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8 animate-slide-up">
          <p className="text-sm text-muted-foreground">Good morning,</p>
          <h1 className="font-display text-4xl font-extrabold mt-1">
            Nurse Sarah <span className="gradient-text">🩺</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            5 patients waiting · 2 critical alerts · 4 doses due this hour.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending Patients" value="5" icon={Users} trend="+2" tone="primary" delay={0} />
          <StatCard label="Active Alerts" value="2" icon={AlertCircle} trend="Critical" tone="destructive" delay={60} />
          <StatCard label="Doses Due" value="4" icon={Pill} trend="Today" tone="warning" delay={120} />
          <StatCard label="Rooms Occupied" value="8/12" icon={BedDouble} trend="67%" tone="accent" delay={180} />
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <PendingPatients />
            <MedicineSchedule />
          </div>

          <div className="flex flex-col gap-6">
            <EmergencyAlert />
            <VitalsEntry />
            <RoomAssignment />
          </div>
        </div>

        {/* ✅ FIXED FOOTER */}
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          CuraSense Nurse Station · Shift ends 16:00 · Stay hydrated 💧
        </footer>

      </main>
    </div>
  );
};

export default Nurse;