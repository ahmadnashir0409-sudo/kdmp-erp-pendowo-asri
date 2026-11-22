-- Atomic invoice creation: header, line items, and accounting journal
-- are committed together or rolled back together.
CREATE OR REPLACE FUNCTION private.create_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_invoice_type text;
  v_invoice_number text;
  v_customer_name text;
  v_supplier_name text;
  v_issue_date date;
  v_due_date date;
  v_subtotal numeric(15,2) := 0;
  v_input_subtotal numeric(15,2);
  v_discount numeric(15,2) := 0;
  v_tax numeric(15,2) := 0;
  v_total numeric(15,2) := 0;
  v_invoice_id uuid;
  v_item record;
  v_product record;
  v_line_total numeric(15,2);
  v_item_count integer := 0;
  v_journal_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak ditemukan.';
  END IF;

  v_role := private.current_user_role();
  IF COALESCE(v_role, '') NOT IN ('manajer', 'admin_keuangan') THEN
    RAISE EXCEPTION 'Hanya Manajer atau Admin Keuangan yang dapat membuat invoice.';
  END IF;

  IF jsonb_typeof(p_invoice) <> 'object' THEN
    RAISE EXCEPTION 'Data invoice tidak valid.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invoice harus memiliki minimal satu barang.';
  END IF;

  v_invoice_number := NULLIF(trim(p_invoice->>'invoice_number'), '');
  v_invoice_type := p_invoice->>'invoice_type';
  v_customer_name := NULLIF(trim(p_invoice->>'customer_name'), '');
  v_supplier_name := NULLIF(trim(p_invoice->>'supplier_name'), '');
  v_issue_date := NULLIF(p_invoice->>'issue_date', '')::date;
  v_due_date := NULLIF(p_invoice->>'due_date', '')::date;
  v_discount := round(COALESCE(NULLIF(p_invoice->>'discount','')::numeric,0),2);
  v_tax := round(COALESCE(NULLIF(p_invoice->>'tax','')::numeric,0),2);
  v_input_subtotal := round(COALESCE(NULLIF(p_invoice->>'subtotal','')::numeric,0),2);

  IF v_invoice_number IS NULL OR v_customer_name IS NULL THEN
    RAISE EXCEPTION 'Nomor invoice dan nama pelanggan/pemasok wajib diisi.';
  END IF;
  IF v_invoice_type NOT IN ('penjualan','pembelian') THEN
    RAISE EXCEPTION 'Jenis invoice tidak valid.';
  END IF;
  IF v_issue_date IS NULL OR (v_due_date IS NOT NULL AND v_due_date < v_issue_date) THEN
    RAISE EXCEPTION 'Tanggal invoice atau jatuh tempo tidak valid.';
  END IF;
  IF v_discount < 0 OR v_tax < 0 THEN
    RAISE EXCEPTION 'Diskon dan pajak tidak boleh negatif.';
  END IF;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, description text, quantity numeric, unit_price numeric)
  LOOP
    IF v_item.product_id IS NULL
       OR v_item.quantity IS NULL OR v_item.quantity <= 0
       OR v_item.unit_price IS NULL OR v_item.unit_price < 0
       OR NULLIF(trim(COALESCE(v_item.description,'')), '') IS NULL THEN
      RAISE EXCEPTION 'Rincian barang invoice tidak valid.';
    END IF;

    SELECT id, product_name, unit, is_active
    INTO v_product
    FROM public.inventory_products
    WHERE id = v_item.product_id
    FOR SHARE;

    IF NOT FOUND OR NOT COALESCE(v_product.is_active,false) THEN
      RAISE EXCEPTION 'Barang invoice tidak ditemukan atau tidak aktif di master persediaan.';
    END IF;

    IF lower(trim(v_item.description)) <> lower(trim(v_product.product_name)) THEN
      RAISE EXCEPTION 'Nama barang invoice harus sama dengan master persediaan: %.',v_product.product_name;
    END IF;

    v_line_total := round(v_item.quantity * v_item.unit_price,2);
    v_subtotal := v_subtotal + v_line_total;
    v_item_count := v_item_count + 1;
  END LOOP;

  v_subtotal := round(v_subtotal,2);
  IF v_item_count = 0 OR abs(v_subtotal-v_input_subtotal)>0.01 THEN
    RAISE EXCEPTION 'Subtotal invoice tidak sesuai dengan rincian barang.';
  END IF;
  IF v_discount > v_subtotal THEN
    RAISE EXCEPTION 'Diskon tidak boleh melebihi subtotal.';
  END IF;

  v_total := round(v_subtotal-v_discount+v_tax,2);
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total invoice harus lebih dari nol.';
  END IF;

  INSERT INTO public.invoices(
    invoice_number,customer_name,customer_phone,customer_email,customer_address,
    issue_date,due_date,subtotal,discount,tax,total,paid_amount,status,notes,
    created_by,invoice_type,supplier_name,payment_status
  )
  VALUES(
    v_invoice_number,
    v_customer_name,
    NULLIF(trim(p_invoice->>'customer_phone'),''),
    NULLIF(trim(p_invoice->>'customer_email'),''),
    NULLIF(trim(p_invoice->>'customer_address'),''),
    v_issue_date,
    v_due_date,
    v_subtotal,
    v_discount,
    v_tax,
    v_total,
    0,
    'sent',
    NULLIF(trim(p_invoice->>'notes'),''),
    v_user_id,
    v_invoice_type,
    CASE WHEN v_invoice_type='pembelian' THEN COALESCE(v_supplier_name,v_customer_name) ELSE NULL END,
    'belum_dibayar'
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items)
      AS x(product_id uuid, description text, quantity numeric, unit_price numeric)
  LOOP
    SELECT product_name,unit INTO v_product
    FROM public.inventory_products
    WHERE id=v_item.product_id AND is_active=true;

    v_line_total := round(v_item.quantity*v_item.unit_price,2);
    INSERT INTO public.invoice_items(
      invoice_id,description,quantity,unit,unit_price,line_total,product_id
    )
    VALUES(
      v_invoice_id,v_product.product_name,v_item.quantity,v_product.unit,
      v_item.unit_price,v_line_total,v_item.product_id
    );
  END LOOP;

  v_journal_result := private.record_invoice_journal(v_invoice_id);
  IF COALESCE((v_journal_result->>'success')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Jurnal invoice tidak berhasil dibuat.';
  END IF;

  RETURN jsonb_build_object(
    'success',true,
    'invoice_id',v_invoice_id,
    'invoice_number',v_invoice_number,
    'journal_id',v_journal_result->'journal_id',
    'journal_number',v_journal_result->'journal_number'
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.create_invoice_with_items(jsonb,jsonb)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.create_invoice_with_items(jsonb,jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.create_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog','private'
AS $function$
  SELECT private.create_invoice_with_items(p_invoice,p_items);
$function$;

REVOKE ALL ON FUNCTION public.create_invoice_with_items(jsonb,jsonb)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(jsonb,jsonb)
  TO authenticated;
