-- ============================================================
-- FESTIFY — Migration 007: Atualiza padrão de cores inicial
-- ============================================================
-- Define a nova paleta padrão oficial da plataforma:
-- Primária:   #1CEAFF (Ciano vibrante)
-- Secundária: #FF45FF (Magenta / Rosa vibrante)
-- Terciária:  #1F357F (Azul escuro clássico)
-- ============================================================

ALTER TABLE empresas ALTER COLUMN emp_cor_primaria SET DEFAULT '#1CEAFF';
ALTER TABLE empresas ALTER COLUMN emp_cor_secundaria SET DEFAULT '#FF45FF';
ALTER TABLE empresas ALTER COLUMN emp_cor_terciaria SET DEFAULT '#1F357F';

UPDATE empresas 
SET emp_cor_primaria = '#1CEAFF',
    emp_cor_secundaria = '#FF45FF',
    emp_cor_terciaria = '#1F357F'
WHERE emp_slug = 'mais-alegria';
