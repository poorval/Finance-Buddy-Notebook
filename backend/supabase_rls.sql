
-- Enable RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own transactions"
ON transactions
FOR ALL
USING (auth.uid() = user_id::uuid);

-- Enable RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own categories"
ON categories
FOR ALL
USING (auth.uid() = user_id::uuid);

-- Enable RLS for debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own debts"
ON debts
FOR ALL
USING (auth.uid() = user_id::uuid);
