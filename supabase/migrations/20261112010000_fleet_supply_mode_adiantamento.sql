-- Amplia os valores aceitos em supply_mode de fuel_supply_orders para suportar adiantamento_viagem e canhoto_legado
ALTER TABLE public.fuel_supply_orders
  DROP CONSTRAINT IF EXISTS fuel_supply_orders_supply_mode_check;

ALTER TABLE public.fuel_supply_orders
  ADD CONSTRAINT fuel_supply_orders_supply_mode_check
  CHECK (supply_mode IN ('litragem_fixa', 'encher_tanque', 'canhoto_legado', 'adiantamento_viagem'));

