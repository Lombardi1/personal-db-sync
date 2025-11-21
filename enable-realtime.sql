<<<<<<< HEAD
-- Abilita RLS per tutte le tabelle
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE giacenza ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE esauriti ENABLE ROW LEVEL SECURITY;
ALTER TABLE storico ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordini_acquisto ENABLE ROW LEVEL SECURITY; -- Abilita RLS per la nuova tabella

-- Policy per app_users: gli amministratori possono fare tutto, gli utenti possono leggere il proprio profilo
CREATE POLICY "Admins can manage app_users" ON app_users FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Users can view their own app_user profile" ON app_users FOR SELECT USING (auth.uid() = id);

-- Policy per user_roles: gli amministratori possono fare tutto
CREATE POLICY "Admins can manage user_roles" ON user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Users can view their own user_roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Policy per giacenza: gli amministratori possono fare tutto, la produzione può leggere e scaricare
CREATE POLICY "Admins can manage giacenza" ON giacenza FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Produzione can read giacenza" ON giacenza FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);
CREATE POLICY "Produzione can update giacenza" ON giacenza FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);
CREATE POLICY "Produzione can delete giacenza" ON giacenza FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);

-- Policy per ordini: gli amministratori possono fare tutto, la produzione può leggere
CREATE POLICY "Admins can manage ordini" ON ordini FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Produzione can read ordini" ON ordini FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);

-- Policy per esauriti: gli amministratori possono fare tutto, la produzione può leggere e inserire
CREATE POLICY "Admins can manage esauriti" ON esauriti FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Produzione can read esauriti" ON esauriti FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);
CREATE POLICY "Produzione can insert esauriti" ON esauriti FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);

-- Policy per storico: gli amministratori possono fare tutto, la produzione può inserire e leggere
CREATE POLICY "Admins can manage storico" ON storico FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);
CREATE POLICY "Produzione can insert storico" ON storico FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);
CREATE POLICY "Produzione can read storico" ON storico FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'produzione')
);

-- Policy per clienti: gli amministratori possono fare tutto
CREATE POLICY "Admins can manage clienti" ON clienti FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);

-- Policy per fornitori: gli amministratori possono fare tutto
CREATE POLICY "Admins can manage fornitori" ON fornitori FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);

-- Policy per ordini_acquisto: gli amministratori possono fare tutto
CREATE POLICY "Admins can manage ordini_acquisto" ON ordini_acquisto FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'amministratore')
);

-- Abilita la pubblicazione delle modifiche in tempo reale per le tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE giacenza;
ALTER PUBLICATION supabase_realtime ADD TABLE ordini;
ALTER PUBLICATION supabase_realtime ADD TABLE esauriti;
ALTER PUBLICATION supabase_realtime ADD TABLE storico;
ALTER PUBLICATION supabase_realtime ADD TABLE clienti;
ALTER PUBLICATION supabase_realtime ADD TABLE fornitori;
ALTER PUBLICATION supabase_realtime ADD TABLE ordini_acquisto; -- Aggiungi la nuova tabella
=======
-- Abilita realtime per tutte le tabelle
ALTER TABLE giacenza REPLICA IDENTITY FULL;
ALTER TABLE ordini REPLICA IDENTITY FULL;
ALTER TABLE esauriti REPLICA IDENTITY FULL;
ALTER TABLE storico REPLICA IDENTITY FULL;

-- Aggiungi le tabelle alla pubblicazione realtime
ALTER PUBLICATION supabase_realtime ADD TABLE giacenza;
ALTER PUBLICATION supabase_realtime ADD TABLE ordini;
ALTER PUBLICATION supabase_realtime ADD TABLE esauriti;
ALTER PUBLICATION supabase_realtime ADD TABLE storico;
>>>>>>> b5a480e9aeca8f5735c360358d599f8d06f1b9bf
