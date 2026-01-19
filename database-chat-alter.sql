-- Add name column to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add function to create or get named chat
CREATE OR REPLACE FUNCTION create_or_get_named_chat(
  chat_name TEXT,
  participant_ids UUID[]
)
RETURNS TABLE(chat_id UUID, created BOOLEAN) AS $$
DECLARE
  existing_chat_id UUID;
BEGIN
  -- First try to find an existing chat with the same name and participants
  SELECT c.id INTO existing_chat_id
  FROM chats c
  WHERE c.name = chat_name
    AND c.participant_ids @> participant_ids
    AND c.participant_ids <@ participant_ids;
  
  IF existing_chat_id IS NOT NULL THEN
    -- Chat already exists with same participants
    RETURN QUERY SELECT existing_chat_id, FALSE;
  ELSE
    -- Create new named chat
    INSERT INTO chats (name, participant_ids)
    VALUES (chat_name, participant_ids)
    RETURNING id, TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance on named chats
CREATE INDEX IF NOT EXISTS idx_chats_name ON chats(name);