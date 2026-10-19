-- ====================================================================
-- MIGRAÇÃO: REGIME DE PRONTIDÃO (TANQUE CHEIO) E AUDITORIA ANTIFRAUDE
-- Versão: 20261022000000
-- Controle para Ambulâncias (Saúde) e Ônibus (Educação / Transporte)
-- ====================================================================

-- 1. Flag de Prioridade de Urgência no Cadastro Técnico de Veículos
ALTER TABLE public.fleet_vehicles 
  ADD COLUMN IF NOT EXISTS is_emergency_priority BOOLEAN DEFAULT false;

-- 2. Campos de Prontidão e Chamado de Emergência nas Ordens de Abastecimento
ALTER TABLE public.fuel_supply_orders 
  ADD COLUMN IF NOT EXISTS is_full_tank_order BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_call_reason TEXT;

-- Índice para consultas de auditoria de urgência
CREATE INDEX IF NOT EXISTS idx_fleet_orders_emergency 
  ON public.fuel_supply_orders(is_full_tank_order) 
  WHERE is_full_tank_order = true;
