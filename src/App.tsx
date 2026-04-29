import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Details from "./pages/Details.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewData from "./pages/NewData.tsx";
import PreviousData from "./pages/PreviousData.tsx";
import PatientDetails from "./pages/PatientDetails.tsx";
import PatientDashboard from "./pages/PatientDashboard.tsx";
import Nurse from "./pages/Nurse.tsx";
import Lab from "./pages/Lab.tsx";
import DoctorMessages from "./pages/DoctorMessages.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/details" element={<Details />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-data" element={<NewData />} />
          <Route path="/previous-data" element={<PreviousData />} />
          <Route path="/patient-details" element={<PatientDetails />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/nurse" element={<Nurse />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/doctor-messages" element={<DoctorMessages />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
