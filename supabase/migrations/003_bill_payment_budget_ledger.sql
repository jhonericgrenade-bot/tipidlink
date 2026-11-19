-- A bill payment is an expense. Keep the payment ledger and the financial
-- transaction ledger linked at the database layer so budget totals cannot drift
-- when a client is offline, closed early, or uses an older app version.

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS bill_payment_id UUID REFERENCES public.bill_payments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_bill_payment_unique
ON public.transactions (bill_payment_id)
WHERE bill_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_bill_payment_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    linked_bill RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.transactions
        WHERE bill_payment_id = OLD.id;
        RETURN NULL;
    END IF;

    SELECT id, household_id, category_id, title
    INTO linked_bill
    FROM public.bills
    WHERE id = NEW.bill_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.transactions (
        household_id,
        category_id,
        user_id,
        bill_payment_id,
        type,
        amount,
        description,
        transaction_date,
        payment_method,
        notes,
        updated_at
    ) VALUES (
        linked_bill.household_id,
        linked_bill.category_id,
        NEW.paid_by,
        NEW.id,
        'expense',
        NEW.amount,
        'Bill Payment: ' || linked_bill.title,
        NEW.payment_date,
        NEW.payment_method,
        NULLIF(CONCAT_WS(' ',
            CASE
                WHEN NULLIF(BTRIM(NEW.reference_number), '') IS NOT NULL
                THEN 'Ref: ' || BTRIM(NEW.reference_number)
            END,
            NULLIF(BTRIM(NEW.notes), '')
        ), ''),
        timezone('utc'::text, now())
    )
    ON CONFLICT (bill_payment_id) WHERE bill_payment_id IS NOT NULL
    DO UPDATE SET
        household_id = EXCLUDED.household_id,
        category_id = EXCLUDED.category_id,
        user_id = EXCLUDED.user_id,
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        transaction_date = EXCLUDED.transaction_date,
        payment_method = EXCLUDED.payment_method,
        notes = EXCLUDED.notes,
        updated_at = timezone('utc'::text, now());

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_bill_payment_expense ON public.bill_payments;
CREATE TRIGGER trigger_sync_bill_payment_expense
    AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
    FOR EACH ROW EXECUTE FUNCTION public.sync_bill_payment_expense();

-- If a bill is recategorized or renamed, keep all of its linked expenses in
-- the same category and with an understandable transaction description.
CREATE OR REPLACE FUNCTION public.sync_bill_expense_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.transactions AS transaction_row
    SET
        category_id = NEW.category_id,
        description = 'Bill Payment: ' || NEW.title,
        updated_at = timezone('utc'::text, now())
    WHERE transaction_row.bill_payment_id IN (
        SELECT payment.id
        FROM public.bill_payments AS payment
        WHERE payment.bill_id = NEW.id
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_bill_expense_metadata ON public.bills;
CREATE TRIGGER trigger_sync_bill_expense_metadata
    AFTER UPDATE OF category_id, title ON public.bills
    FOR EACH ROW
    WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id OR OLD.title IS DISTINCT FROM NEW.title)
    EXECUTE FUNCTION public.sync_bill_expense_metadata();

-- Link legacy rows written by earlier clients before creating anything new.
WITH legacy_matches AS (
    SELECT DISTINCT ON (payment.id)
        payment.id AS payment_id,
        transaction_row.id AS transaction_id
    FROM public.bill_payments AS payment
    INNER JOIN public.bills AS bill ON bill.id = payment.bill_id
    INNER JOIN public.transactions AS transaction_row
        ON transaction_row.household_id = payment.household_id
        AND transaction_row.type = 'expense'
        AND transaction_row.amount = payment.amount
        AND transaction_row.transaction_date = payment.payment_date
        AND transaction_row.bill_payment_id IS NULL
        AND LOWER(BTRIM(transaction_row.description)) IN (
            LOWER('Bill Payment: ' || bill.title),
            LOWER('Payment for ' || bill.title)
        )
    ORDER BY payment.id, transaction_row.created_at, transaction_row.id
)
UPDATE public.transactions AS transaction_row
SET bill_payment_id = legacy_matches.payment_id
FROM legacy_matches
WHERE transaction_row.id = legacy_matches.transaction_id;

-- Backfill any payment whose companion transaction was missing. The unique
-- payment link prevents duplicate deductions when this migration is replayed.
INSERT INTO public.transactions (
    household_id,
    category_id,
    user_id,
    bill_payment_id,
    type,
    amount,
    description,
    transaction_date,
    payment_method,
    notes
)
SELECT
    payment.household_id,
    bill.category_id,
    payment.paid_by,
    payment.id,
    'expense',
    payment.amount,
    'Bill Payment: ' || bill.title,
    payment.payment_date,
    payment.payment_method,
    NULLIF(CONCAT_WS(' ',
        CASE
            WHEN NULLIF(BTRIM(payment.reference_number), '') IS NOT NULL
            THEN 'Ref: ' || BTRIM(payment.reference_number)
        END,
        NULLIF(BTRIM(payment.notes), '')
    ), '')
FROM public.bill_payments AS payment
INNER JOIN public.bills AS bill ON bill.id = payment.bill_id
LEFT JOIN public.transactions AS transaction_row ON transaction_row.bill_payment_id = payment.id
WHERE transaction_row.id IS NULL
ON CONFLICT (bill_payment_id) WHERE bill_payment_id IS NOT NULL DO NOTHING;
