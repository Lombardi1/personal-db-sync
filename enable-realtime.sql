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
