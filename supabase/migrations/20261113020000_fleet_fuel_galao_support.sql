-- Suporte a Abastecimento de Galões / Bombonas sem vinculação obrigatória a um veículo
ALTER TABLE public.fuel_supply_orders
  ALTER COLUMN vehicle_id DROP NOT NULL;

ALTER TABLE public.fuel_supply_orders
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'veiculo',
  ADD COLUMN IF NOT EXISTS galao_label TEXT;

