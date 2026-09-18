-- ============================================================
-- FESTIFY — Migration 006: expande emp_logo_url para TEXT
-- ============================================================
-- URLs de logos provenientes de CDNs modernos, AWS S3, Supabase,
-- Cloudinary, Unsplash ou Firebase frequentemente ultrapassam 255
-- caracteres devido a tokens, parâmetros de assinatura e dimensões.
-- ============================================================

ALTER TABLE empresas ALTER COLUMN emp_logo_url TYPE TEXT;
