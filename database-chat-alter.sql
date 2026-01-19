-- Add a function to update chat participants
CREATE OR REPLACE FUNCTION update_chat_participants(chat_id UUID, new_participants UUID[])
RETURNS VOID AS $$
BEGIN
  -- Update the chat with new participants
  UPDATE chats 
  SET participant_ids = new_participants,
      updated_at = NOW()
  WHERE id = chat_id;
  
  -- Notify all participants about the change
  -- This will trigger the real-time subscription in the frontend
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_chat_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_chat_updated_at_trigger
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_updated_at();
  END IF;
END $$;