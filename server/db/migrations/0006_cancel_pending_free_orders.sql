-- Free (Rp 0) packages are now activated at checkout; pending Rp 0 orders
-- from the old flow can never be paid, so close them.
UPDATE "transactions"
SET "status" = 'cancelled', "notes" = 'Paket gratis kini langsung aktif saat dipilih', "updated_at" = now()
WHERE "status" = 'pending' AND "amount" = 0;
