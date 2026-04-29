-- Pharmacy module

CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  form TEXT,              -- tablet | capsule | syrup | injection | ointment | drops
  strength TEXT,          -- e.g. "500mg"
  unit TEXT DEFAULT 'unit',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  batch_no TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicines_staff_read" ON public.medicines FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "medicines_rx_write" ON public.medicines FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]));
CREATE TRIGGER medicines_updated_at BEFORE UPDATE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_medicines_name ON public.medicines(name);

CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  consultation_id UUID,
  doctor_id UUID,
  pharmacist_id UUID,
  status TEXT NOT NULL DEFAULT 'received', -- received | preparing | ready | dispensed | delivered | cancelled
  priority TEXT NOT NULL DEFAULT 'normal', -- normal | urgent
  notes TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispensed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescriptions_staff_read" ON public.prescriptions FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "prescriptions_patient_read" ON public.prescriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = prescriptions.patient_id AND p.account_id = auth.uid()));
CREATE POLICY "prescriptions_rx_write" ON public.prescriptions FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','pharmacy']::app_role[]));
CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_prescriptions_status ON public.prescriptions(status, received_at DESC);

CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL,
  medicine_id UUID,
  medicine_name TEXT NOT NULL,
  dosage TEXT,          -- "1 tab"
  frequency TEXT,       -- "TID after meals"
  duration_days INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx_items_staff_read" ON public.prescription_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "rx_items_patient_read" ON public.prescription_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.prescriptions pr JOIN public.patients p ON p.id = pr.patient_id
               WHERE pr.id = prescription_items.prescription_id AND p.account_id = auth.uid()));
CREATE POLICY "rx_items_write" ON public.prescription_items FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','doctor','pharmacy']::app_role[]));
CREATE INDEX idx_rx_items_rx ON public.prescription_items(prescription_id);

CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_no TEXT NOT NULL DEFAULT ('INV-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  prescription_id UUID,
  patient_id UUID NOT NULL,
  cashier_id UUID,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | paid | cancelled
  payment_method TEXT,                   -- cash | card | upi | insurance
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bills_staff_read" ON public.bills FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "bills_patient_read" ON public.bills FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = bills.patient_id AND p.account_id = auth.uid()));
CREATE POLICY "bills_rx_write" ON public.bills FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]));
CREATE TRIGGER bills_updated_at BEFORE UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_bills_status ON public.bills(status, created_at DESC);

CREATE TABLE public.bill_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL,
  medicine_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bill_items_staff_read" ON public.bill_items FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "bill_items_patient_read" ON public.bill_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bills b JOIN public.patients p ON p.id = b.patient_id
               WHERE b.id = bill_items.bill_id AND p.account_id = auth.uid()));
CREATE POLICY "bill_items_rx_write" ON public.bill_items FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]));
CREATE INDEX idx_bill_items_bill ON public.bill_items(bill_id);

CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL,
  prescription_id UUID,
  patient_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'pickup', -- pickup | home
  address TEXT,
  courier TEXT,
  tracking_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | out_for_delivery | delivered | failed
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_staff_read" ON public.deliveries FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','nurse','lab','pharmacy']::app_role[]));
CREATE POLICY "deliveries_patient_read" ON public.deliveries FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = deliveries.patient_id AND p.account_id = auth.uid()));
CREATE POLICY "deliveries_rx_write" ON public.deliveries FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','pharmacy']::app_role[]));
CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_deliveries_status ON public.deliveries(status, created_at DESC);