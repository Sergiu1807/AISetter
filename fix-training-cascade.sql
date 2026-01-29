-- Fix training_examples cascade behavior
-- This migration changes the foreign key constraint to preserve training examples
-- when a lead/conversation is deleted (instead of cascading the delete)

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE training_examples
DROP CONSTRAINT IF EXISTS training_examples_conversation_id_fkey;

-- Step 2: Re-add the foreign key with ON DELETE SET NULL
-- This will set conversation_id to NULL when the related conversation is deleted,
-- preserving the training example for prompt improvement purposes
ALTER TABLE training_examples
ADD CONSTRAINT training_examples_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES conversations(id)
ON DELETE SET NULL;

-- Verify the change (optional - run this separately to check)
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conname = 'training_examples_conversation_id_fkey';
-- Result should show confdeltype = 'n' (SET NULL) instead of 'c' (CASCADE)
