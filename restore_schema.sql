-- =============================================================
-- CLEAN RESTORE SCRIPT
-- Source: db_cluster-06-10-2025_01-48-31_backup.gz
-- Database: Supabase / PostgreSQL cluster dump (public schema)
-- Generated: 2025-06-06
--
-- RESTORE ORDER:
--   1. Setup & extensions
--   2. Custom ENUM types
--   3. Stored functions
--   4. Tables (no FKs yet)
--   5. Primary keys & unique constraints
--   6. Indexes
--   7. Foreign key constraints
--   8. Triggers
--   9. Row Level Security (enable + policies)
--  10. Schema grants
-- =============================================================

-- Stop on error
\set ON_ERROR_STOP on

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- =============================================================
-- SECTION 1: SCHEMA & EXTENSIONS
-- =============================================================

CREATE SCHEMA IF NOT EXISTS public;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- pg_graphql and supabase_vault are Supabase-managed; skip if restoring to plain Postgres
-- CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;
-- CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- =============================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- =============================================================

-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'error',
    'success'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'credit'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'manager',
    'cashier',
    'viewer'
);


ALTER TYPE public.user_role OWNER TO postgres;

--


-- =============================================================
-- SECTION 3: STORED FUNCTIONS & PROCEDURES
-- =============================================================

CREATE FUNCTION public.assign_user_code(p_user_id uuid, p_code character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE user_codes 
  SET is_assigned = true, 
      assigned_to = p_user_id,
      assigned_at = NOW()
  WHERE code = p_code AND NOT is_assigned;
  
  IF FOUND THEN
    UPDATE users 
    SET user_code = p_code 
    WHERE id = p_user_id;
    v_success := true;
  END IF;
  
  RETURN v_success;
END;
$$;


ALTER FUNCTION public.assign_user_code(p_user_id uuid, p_code character varying) OWNER TO postgres;

--
-- Name: audit_user_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_user_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, old_values, new_values, changed_by, created_at
    ) VALUES (
      'users', NEW.id, 'update',
      to_jsonb(OLD) - 'updated_at',
      to_jsonb(NEW) - 'updated_at' - 'last_login',
      COALESCE(auth.uid(), NEW.id),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, new_values, changed_by, created_at
    ) VALUES (
      'users', NEW.id, 'insert',
      to_jsonb(NEW) - 'created_at' - 'updated_at',
      COALESCE(auth.uid(), NEW.id),
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_user_changes() OWNER TO postgres;

--
-- Name: block_ip_address(inet, text, integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.block_ip_address(p_ip_address inet, p_reason text, p_duration_hours integer DEFAULT 24, p_auto_blocked boolean DEFAULT true) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    blocked_id UUID;
BEGIN
    INSERT INTO blocked_ips (
        ip_address, reason, blocked_until, auto_blocked
    ) VALUES (
        p_ip_address, p_reason, 
        NOW() + (p_duration_hours || ' hours')::INTERVAL,
        p_auto_blocked
    ) 
    ON CONFLICT (ip_address) 
    DO UPDATE SET 
        reason = EXCLUDED.reason,
        blocked_until = EXCLUDED.blocked_until,
        auto_blocked = EXCLUDED.auto_blocked
    RETURNING id INTO blocked_id;
    
    RETURN blocked_id;
END;
$$;


ALTER FUNCTION public.block_ip_address(p_ip_address inet, p_reason text, p_duration_hours integer, p_auto_blocked boolean) OWNER TO postgres;

--
-- Name: check_auth_config(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_auth_config() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN 'Email confirmation should be disabled in Supabase Dashboard: Authentication > Settings > Email Auth > Disable "Enable email confirmations"';
END;
$$;


ALTER FUNCTION public.check_auth_config() OWNER TO postgres;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_cleaned INTEGER;
BEGIN
  UPDATE user_sessions 
  SET is_active = false, logout_reason = 'expired'
  WHERE is_active = true AND expires_at < NOW();
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  RETURN v_cleaned;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO postgres;

--
-- Name: cleanup_security_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_security_data() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old security events (keep last 90 days)
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired blocked IPs
    DELETE FROM blocked_ips 
    WHERE blocked_until IS NOT NULL AND blocked_until < NOW();
    
    -- Delete old failed login attempts (keep last 30 days)
    DELETE FROM failed_login_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Deactivate expired sessions
    UPDATE user_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_security_data() OWNER TO postgres;

--
-- Name: generate_user_code(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_user_code(p_station_id uuid, p_role text) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_prefix VARCHAR(2);
  v_counter INTEGER;
  v_code VARCHAR(10);
  v_exists BOOLEAN;
BEGIN
  CASE p_role
    WHEN 'admin' THEN v_prefix := 'AD';
    WHEN 'manager' THEN v_prefix := 'MG';
    WHEN 'attendant' THEN v_prefix := 'AT';
    WHEN 'transporter' THEN v_prefix := 'TR';
    ELSE v_prefix := 'US';
  END CASE;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ ('^' || v_prefix || '[0-9]+$') 
      THEN CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_counter
  FROM user_codes
  WHERE station_id = p_station_id AND role = p_role;
  
  v_code := v_prefix || LPAD(v_counter::TEXT, 3, '0');
  
  SELECT EXISTS(SELECT 1 FROM user_codes WHERE code = v_code) INTO v_exists;
  IF v_exists THEN
    v_counter := v_counter + 1;
    v_code := v_prefix || LPAD(v_counter::TEXT, 3, '0');
  END IF;
  
  INSERT INTO user_codes (code, station_id, role)
  VALUES (v_code, p_station_id, p_role);
  
  RETURN v_code;
END;
$_$;


ALTER FUNCTION public.generate_user_code(p_station_id uuid, p_role text) OWNER TO postgres;

--
-- Name: handle_failed_login(text, inet, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_failed_login(p_identifier text, p_ip_address inet, p_user_agent text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    attempt_record failed_login_attempts%ROWTYPE;
    should_lock BOOLEAN := false;
    max_attempts INTEGER := 5;
    lockout_duration INTEGER := 30; -- minutes
BEGIN
    -- Get or create failed attempt record
    SELECT * INTO attempt_record 
    FROM failed_login_attempts 
    WHERE identifier = p_identifier AND ip_address = p_ip_address;
    
    IF attempt_record.id IS NULL THEN
        -- First failed attempt
        INSERT INTO failed_login_attempts (
            identifier, ip_address, user_agent, attempt_count
        ) VALUES (
            p_identifier, p_ip_address, p_user_agent, 1
        );
    ELSE
        -- Increment attempt count
        UPDATE failed_login_attempts 
        SET 
            attempt_count = attempt_count + 1,
            last_attempt = NOW(),
            locked_until = CASE 
                WHEN attempt_count + 1 >= max_attempts 
                THEN NOW() + (lockout_duration || ' minutes')::INTERVAL
                ELSE locked_until
            END
        WHERE id = attempt_record.id;
        
        should_lock := (attempt_record.attempt_count + 1) >= max_attempts;
    END IF;
    
    -- Auto-block IP if too many attempts
    IF should_lock THEN
        PERFORM block_ip_address(
            p_ip_address, 
            'Too many failed login attempts', 
            1, -- 1 hour
            true
        );
    END IF;
    
    RETURN should_lock;
END;
$$;


ALTER FUNCTION public.handle_failed_login(p_identifier text, p_ip_address inet, p_user_agent text) OWNER TO postgres;

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

--
-- Name: is_ip_blocked(inet); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_ip_blocked(p_ip_address inet) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_ips 
        WHERE ip_address = p_ip_address 
        AND (blocked_until IS NULL OR blocked_until > NOW())
    );
END;
$$;


ALTER FUNCTION public.is_ip_blocked(p_ip_address inet) OWNER TO postgres;

--
-- Name: log_security_event(uuid, text, jsonb, inet, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_success boolean DEFAULT true, p_risk_score integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (
        user_id, event_type, event_data, ip_address, 
        user_agent, success, risk_score
    ) VALUES (
        p_user_id, p_event_type, p_event_data, p_ip_address,
        p_user_agent, p_success, p_risk_score
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;


ALTER FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_event_data jsonb, p_ip_address inet, p_user_agent text, p_success boolean, p_risk_score integer) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: unlock_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unlock_users() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE v_unlocked INTEGER;
BEGIN
  UPDATE users 
  SET locked_until = NULL, failed_attempts = 0
  WHERE locked_until IS NOT NULL AND locked_until < NOW();
  GET DIAGNOSTICS v_unlocked = ROW_COUNT;
  RETURN v_unlocked;
END;
$$;


ALTER FUNCTION public.unlock_users() OWNER TO postgres;

--
-- Name: update_session_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_session_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_session_activity() OWNER TO postgres;

--
-- Name: update_stock_items_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stock_items_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stock_items_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_pin(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_pin(p_user_code character varying, p_pin character varying) RETURNS TABLE(success boolean, user_id uuid, station_id uuid, role text, full_name text, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT u.id, u.station_id, u.role, u.full_name, u.pin_hash, 
         u.failed_attempts, u.locked_until, u.is_active,
         u.shift_start, u.shift_end
  INTO v_user
  FROM users u
  WHERE u.user_code = UPPER(p_user_code);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Invalid user code';
    RETURN;
  END IF;
  
  IF NOT v_user.is_active THEN
    RETURN QUERY SELECT false, v_user.id, v_user.station_id, v_user.role, v_user.full_name, 'User account is disabled';
    RETURN;
  END IF;
  
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
    RETURN QUERY SELECT false, v_user.id, v_user.station_id, v_user.role, v_user.full_name, 'Account is temporarily locked';
    RETURN;
  END IF;
  
  IF v_user.shift_start IS NOT NULL AND v_user.shift_end IS NOT NULL THEN
    IF CURRENT_TIME NOT BETWEEN v_user.shift_start AND v_user.shift_end THEN
      RETURN QUERY SELECT false, v_user.id, v_user.station_id, v_user.role, v_user.full_name, 'Outside shift hours';
      RETURN;
    END IF;
  END IF;
  
  IF v_user.pin_hash = crypt(p_pin, v_user.pin_hash) THEN
    UPDATE users 
    SET failed_attempts = 0, locked_until = NULL, last_login = NOW()
    WHERE id = v_user.id;
    
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by, created_at)
    VALUES ('users', v_user.id, 'login', jsonb_build_object('login_time', NOW()), v_user.id, NOW());
    
    RETURN QUERY SELECT true, v_user.id, v_user.station_id, v_user.role, v_user.full_name, 'Login successful';
  ELSE
    UPDATE users 
    SET failed_attempts = v_user.failed_attempts + 1,
        locked_until = CASE 
          WHEN v_user.failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
          ELSE locked_until
        END
    WHERE id = v_user.id;
    
    INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by, created_at)


-- =============================================================
-- SECTION 4: TABLE DEFINITIONS
-- Note: generated columns and computed fields are preserved.
-- Foreign key constraints are deferred to Section 7.
-- =============================================================

CREATE TABLE public.account_payables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_name character varying(255) NOT NULL,
    amount_usd numeric(15,2) DEFAULT 0,
    amount_cdf numeric(15,2) DEFAULT 0,
    due_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.account_payables OWNER TO postgres;

--
-- Name: account_receivables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_receivables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name character varying(255) NOT NULL,
    amount_usd numeric(15,2) DEFAULT 0,
    amount_cdf numeric(15,2) DEFAULT 0,
    due_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.account_receivables OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    currency text NOT NULL,
    station_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounts_currency_check CHECK ((currency = ANY (ARRAY['CDF'::text, 'USD'::text]))),
    CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['operating'::text, 'transit'::text, 'tax'::text, 'creditor'::text, 'supplier'::text])))
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    session_id uuid,
    device_info text,
    ip_address inet,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text])))
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: blocked_ips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocked_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    reason text NOT NULL,
    blocked_until timestamp with time zone,
    blocked_by uuid,
    auto_blocked boolean DEFAULT false,
    failed_attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blocked_ips OWNER TO postgres;

--
-- Name: creditors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.creditors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact text,
    credit_limit numeric(12,2),
    current_balance numeric(12,2) DEFAULT 0,
    due_date date,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creditors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'overdue'::text])))
);


ALTER TABLE public.creditors OWNER TO postgres;

--
-- Name: daily_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_date date NOT NULL,
    total_pump_sales_usd numeric(15,2) DEFAULT 0,
    total_pump_sales_cdf numeric(15,2) DEFAULT 0,
    total_drum_sales_usd numeric(15,2) DEFAULT 0,
    total_drum_sales_cdf numeric(15,2) DEFAULT 0,
    total_sales_usd numeric(15,2) DEFAULT 0,
    total_sales_cdf numeric(15,2) DEFAULT 0,
    exchange_rate_used numeric(15,8),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pump_number integer,
    sale_type character varying(50) DEFAULT 'fuel'::character varying,
    fuel_type character varying(50) DEFAULT 'petrol'::character varying,
    volume_liters numeric(10,2),
    station_id uuid,
    quantity numeric(10,2) DEFAULT 0,
    price_per_liter numeric(10,2),
    price_per_drum numeric(10,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    payment_method character varying(50) DEFAULT 'cash'::character varying
);


ALTER TABLE public.daily_sales OWNER TO postgres;

--
-- Name: daily_sales_drum; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_sales_drum (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid,
    product_id text,
    sale_date date DEFAULT CURRENT_DATE NOT NULL,
    drums_sold integer NOT NULL,
    total_litres integer GENERATED ALWAYS AS ((drums_sold * 205)) STORED,
    price_per_litre_cdf numeric(10,2) NOT NULL,
    total_amount_cdf numeric(15,2) NOT NULL,
    total_amount_usd numeric(15,2),
    exchange_rate numeric(10,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price_per_liter numeric(10,2),
    price_per_drum numeric(10,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0
);


ALTER TABLE public.daily_sales_drum OWNER TO postgres;

--
-- Name: daily_sales_pump; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_sales_pump (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid,
    pump_id uuid,
    product_id text,
    reading_date date DEFAULT CURRENT_DATE NOT NULL,
    opening_reading numeric(12,3) NOT NULL,
    closing_reading numeric(12,3) NOT NULL,
    fuel_sold numeric(12,3) GENERATED ALWAYS AS ((closing_reading - opening_reading)) STORED,
    dipping_level numeric(12,3),
    variance numeric(12,3) GENERATED ALWAYS AS ((dipping_level - (closing_reading - opening_reading))) STORED,
    variance_alert boolean GENERATED ALWAYS AS ((abs((dipping_level - (closing_reading - opening_reading))) >= (200)::numeric)) STORED,
    total_amount_cdf numeric(15,2) NOT NULL,
    total_amount_usd numeric(15,2),
    exchange_rate numeric(10,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.daily_sales_pump OWNER TO postgres;

--
-- Name: daily_stock_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_stock_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    station_id uuid,
    opening_stock numeric DEFAULT 0,
    purchases numeric DEFAULT 0,
    sales numeric DEFAULT 0,
    closing_stock numeric DEFAULT 0,
    variance numeric DEFAULT 0,
    entry_date date DEFAULT CURRENT_DATE,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.daily_stock_entries OWNER TO postgres;

--
-- Name: daily_stock_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_stock_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    station_id uuid,
    transaction_type text NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric,
    total_amount numeric,
    reference_number text,
    notes text,
    transaction_date timestamp with time zone DEFAULT now(),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.daily_stock_transactions OWNER TO postgres;

--
-- Name: drum_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drum_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    station_id uuid,
    drum_type character varying(100) NOT NULL,
    quantity integer NOT NULL,
    price_per_drum numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    sale_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.drum_sales OWNER TO postgres;

--
-- Name: emergency_access_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emergency_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    emergency_code character varying(10),
    used_by uuid,
    reason text,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.emergency_access_logs OWNER TO postgres;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_date date DEFAULT CURRENT_DATE NOT NULL,
    usd_to_cdf numeric(15,8) DEFAULT 2880.00000000 NOT NULL,
    cdf_to_usd numeric(15,8) DEFAULT 0.00034722 NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    rate numeric(12,6) DEFAULT 1.0,
    from_currency character varying(10) DEFAULT 'USD'::character varying,
    to_currency character varying(10) DEFAULT 'KES'::character varying,
    effective_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.exchange_rates OWNER TO postgres;

--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(100) NOT NULL,
    subcategory character varying(100),
    amount numeric(12,2) NOT NULL,
    description text,
    receipt_number character varying(100),
    payment_method public.payment_method NOT NULL,
    expense_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: failed_login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failed_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    ip_address inet NOT NULL,
    user_agent text,
    attempt_count integer DEFAULT 1,
    last_attempt timestamp with time zone DEFAULT now(),
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.failed_login_attempts OWNER TO postgres;

--
-- Name: fuel_deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fuel_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid,
    product_id text,
    expected_litres numeric(12,3) NOT NULL,
    actual_received numeric(12,3) NOT NULL,
    delivery_variance numeric(12,3) GENERATED ALWAYS AS ((expected_litres - actual_received)) STORED,
    delivery_date date DEFAULT CURRENT_DATE NOT NULL,
    border_crossing_date date,
    tax_amount_cdf numeric(12,2),
    tax_account_id uuid,
    payment_account_id uuid,
    transporter_id uuid,
    proof_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fuel_deliveries OWNER TO postgres;

--
-- Name: fuel_stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fuel_stock (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    station_id text NOT NULL,
    product_id text NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    opening_stock numeric(12,3) DEFAULT 0 NOT NULL,
    received_stock numeric(12,3) DEFAULT 0 NOT NULL,
    sales numeric(12,3) DEFAULT 0 NOT NULL,
    adjustments numeric(12,3) DEFAULT 0 NOT NULL,
    closing_stock numeric(12,3) DEFAULT 0 NOT NULL,
    physical_stock numeric(12,3),
    variance numeric(12,3) GENERATED ALWAYS AS ((physical_stock - closing_stock)) STORED,
    variance_percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (closing_stock > (0)::numeric) THEN (((physical_stock - closing_stock) / closing_stock) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    variance_reason text,
    variance_approved_by uuid,
    variance_approved_at timestamp with time zone,
    temperature numeric(4,1),
    density numeric(6,4),
    quality_check boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fuel_stock OWNER TO postgres;

--
-- Name: fund_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fund_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_account character varying(255) NOT NULL,
    to_account character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    amount_usd numeric(12,2),
    amount_cdf numeric(12,2),
    exchange_rate numeric(15,8),
    purpose text,
    transfer_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    converted_amount numeric(12,2)
);


ALTER TABLE public.fund_transfers OWNER TO postgres;

--
-- Name: internal_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    account_name character varying(255),
    account_type character varying(100),
    balance numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true
);


ALTER TABLE public.internal_accounts OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type public.notification_type NOT NULL,
    is_read boolean DEFAULT false,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: pin_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pin_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pin_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pin_history OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sku text,
    description text,
    unit character varying(50) DEFAULT 'liters'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: pump_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pump_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    station_id uuid,
    pump_number integer NOT NULL,
    fuel_type character varying(100) NOT NULL,
    volume_liters numeric(10,2) NOT NULL,
    price_per_liter numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    sale_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pump_sales OWNER TO postgres;

--
-- Name: pumps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pumps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    station_id uuid,
    product_id text,
    pump_number integer NOT NULL
);


ALTER TABLE public.pumps OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text NOT NULL,
    station_id uuid,
    generated_for_date date NOT NULL,
    pdf_url text NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reports_report_type_check CHECK ((report_type = ANY (ARRAY['daily_sales'::text, 'stock_variance'::text, 'expenses_summary'::text])))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    ip_address inet,
    user_agent text,
    event_data jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.security_events OWNER TO postgres;

--
-- Name: security_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_name text NOT NULL,
    policy_type text NOT NULL,
    policy_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT security_policies_policy_type_check CHECK ((policy_type = ANY (ARRAY['rate_limiting'::text, 'ip_blocking'::text, 'device_restriction'::text, 'location_restriction'::text, 'time_restriction'::text, 'mfa_requirement'::text])))
);


ALTER TABLE public.security_policies OWNER TO postgres;

--
-- Name: session_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    station_id uuid,
    event text NOT NULL,
    ip_address inet,
    device_info text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_logs_event_check CHECK ((event = ANY (ARRAY['login'::text, 'logout'::text])))
);


ALTER TABLE public.session_logs OWNER TO postgres;

--
-- Name: station_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_products (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    station_id text NOT NULL,
    product_id text NOT NULL,
    current_price numeric(10,2) NOT NULL,
    currency text DEFAULT 'CDF'::text NOT NULL,
    minimum_stock numeric(10,2) DEFAULT 0,
    maximum_stock numeric(10,2),
    reorder_point numeric(10,2),
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT station_products_currency_check CHECK ((currency = ANY (ARRAY['CDF'::text, 'USD'::text])))
);


ALTER TABLE public.station_products OWNER TO postgres;

--
-- Name: station_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.station_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    station_id uuid,
    setting_name character varying(255) NOT NULL,
    setting_value text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.station_settings OWNER TO postgres;

--
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    station_name character varying(255),
    status character varying(50) DEFAULT 'active'::character varying
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- Name: stock_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    station_id uuid,
    balance_date date DEFAULT CURRENT_DATE NOT NULL,
    opening_balance numeric DEFAULT 0,
    purchases numeric DEFAULT 0,
    sales numeric DEFAULT 0,
    adjustments numeric DEFAULT 0,
    closing_balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_balances OWNER TO postgres;

--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    station_id uuid,
    item_name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    unit character varying(50) DEFAULT 'liters'::character varying NOT NULL,
    current_stock numeric(10,2) DEFAULT 0 NOT NULL,
    minimum_stock numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    last_updated timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_items OWNER TO postgres;

--
-- Name: stock_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    station_id uuid NOT NULL,
    current_stock numeric DEFAULT 0,
    minimum_threshold numeric DEFAULT 100,
    maximum_capacity numeric DEFAULT 10000,
    unit text DEFAULT 'liters'::text,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stock_levels OWNER TO postgres;

--
-- Name: stock_variances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_variances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    stock_item_id uuid,
    station_id uuid,
    expected_quantity numeric(10,2) NOT NULL,
    actual_quantity numeric(10,2) NOT NULL,
    variance numeric(10,2) NOT NULL,
    variance_reason text,
    variance_date date DEFAULT CURRENT_DATE,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    reason character varying(255)
);


ALTER TABLE public.stock_variances OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact text,
    credit_terms text,
    current_balance numeric(12,2) DEFAULT 0,
    due_date date,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT suppliers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'overdue'::text])))
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: tax_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    station_id uuid,
    tax_type character varying(100),
    amount numeric(12,2),
    payment_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.tax_payments OWNER TO postgres;

--
-- Name: transporters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transporters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    vehicle_plate text,
    license_number text,
    insurance_expiry date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    transporter_name character varying(255)
);


ALTER TABLE public.transporters OWNER TO postgres;

--
-- Name: truck_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.truck_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    station_id uuid,
    transaction_type character varying(50),
    amount numeric(12,2)
);


ALTER TABLE public.truck_transactions OWNER TO postgres;

--
-- Name: user_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(10) NOT NULL,
    station_id uuid,
    role text NOT NULL,
    is_assigned boolean DEFAULT false,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now(),
    assigned_at timestamp with time zone
);


ALTER TABLE public.user_codes OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    station_id uuid,
    session_token character varying(255) NOT NULL,
    login_time timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '08:00:00'::interval),
    ip_address inet,
    device_info text,
    is_active boolean DEFAULT true,
    logout_reason text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role public.user_role DEFAULT 'viewer'::public.user_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_code character varying(20),
    phone character varying(20),
    last_login timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,


-- =============================================================
-- SECTION 5: PRIMARY KEYS & UNIQUE CONSTRAINTS
-- =============================================================

ALTER TABLE ONLY public.account_payables
    ADD CONSTRAINT account_payables_pkey PRIMARY KEY (id);


--
-- Name: account_receivables account_receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_receivables
    ADD CONSTRAINT account_receivables_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_ips blocked_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: blocked_ips blocked_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_pkey PRIMARY KEY (id);


--
-- Name: creditors creditors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditors
    ADD CONSTRAINT creditors_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_drum daily_sales_drum_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales_drum
    ADD CONSTRAINT daily_sales_drum_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_drum daily_sales_drum_station_id_product_id_sale_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales_drum
    ADD CONSTRAINT daily_sales_drum_station_id_product_id_sale_date_key UNIQUE (station_id, product_id, sale_date);


--
-- Name: daily_sales daily_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales
    ADD CONSTRAINT daily_sales_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_pump daily_sales_pump_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales_pump
    ADD CONSTRAINT daily_sales_pump_pkey PRIMARY KEY (id);


--
-- Name: daily_sales_pump daily_sales_pump_station_id_pump_id_reading_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales_pump
    ADD CONSTRAINT daily_sales_pump_station_id_pump_id_reading_date_key UNIQUE (station_id, pump_id, reading_date);


--
-- Name: daily_sales daily_sales_sale_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales
    ADD CONSTRAINT daily_sales_sale_date_key UNIQUE (sale_date);


--
-- Name: daily_stock_entries daily_stock_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_entries
    ADD CONSTRAINT daily_stock_entries_pkey PRIMARY KEY (id);


--
-- Name: daily_stock_transactions daily_stock_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_transactions
    ADD CONSTRAINT daily_stock_transactions_pkey PRIMARY KEY (id);


--
-- Name: drum_sales drum_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drum_sales
    ADD CONSTRAINT drum_sales_pkey PRIMARY KEY (id);


--
-- Name: emergency_access_logs emergency_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emergency_access_logs
    ADD CONSTRAINT emergency_access_logs_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: failed_login_attempts failed_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_login_attempts
    ADD CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: fuel_deliveries fuel_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_deliveries
    ADD CONSTRAINT fuel_deliveries_pkey PRIMARY KEY (id);


--
-- Name: fuel_stock fuel_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_stock
    ADD CONSTRAINT fuel_stock_pkey PRIMARY KEY (id);


--
-- Name: fuel_stock fuel_stock_station_id_product_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_stock
    ADD CONSTRAINT fuel_stock_station_id_product_id_date_key UNIQUE (station_id, product_id, date);


--
-- Name: fund_transfers fund_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_transfers
    ADD CONSTRAINT fund_transfers_pkey PRIMARY KEY (id);


--
-- Name: internal_accounts internal_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_accounts
    ADD CONSTRAINT internal_accounts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pin_history pin_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pin_history
    ADD CONSTRAINT pin_history_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: pump_sales pump_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_sales
    ADD CONSTRAINT pump_sales_pkey PRIMARY KEY (id);


--
-- Name: pumps pumps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_pkey PRIMARY KEY (id);


--
-- Name: pumps pumps_station_id_pump_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT pumps_station_id_pump_number_key UNIQUE (station_id, pump_number);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: security_policies security_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_policies
    ADD CONSTRAINT security_policies_pkey PRIMARY KEY (id);


--
-- Name: security_policies security_policies_policy_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_policies
    ADD CONSTRAINT security_policies_policy_name_key UNIQUE (policy_name);


--
-- Name: session_logs session_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_logs
    ADD CONSTRAINT session_logs_pkey PRIMARY KEY (id);


--
-- Name: station_products station_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_products
    ADD CONSTRAINT station_products_pkey PRIMARY KEY (id);


--
-- Name: station_products station_products_station_id_product_id_currency_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_products
    ADD CONSTRAINT station_products_station_id_product_id_currency_key UNIQUE (station_id, product_id, currency);


--
-- Name: station_settings station_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.station_settings
    ADD CONSTRAINT station_settings_pkey PRIMARY KEY (id);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: stock_balances stock_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_balances
    ADD CONSTRAINT stock_balances_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_pkey PRIMARY KEY (id);


--
-- Name: stock_variances stock_variances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_variances
    ADD CONSTRAINT stock_variances_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tax_payments tax_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_payments
    ADD CONSTRAINT tax_payments_pkey PRIMARY KEY (id);


--
-- Name: transporters transporters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_pkey PRIMARY KEY (id);


--
-- Name: truck_transactions truck_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.truck_transactions
    ADD CONSTRAINT truck_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_codes user_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_codes
    ADD CONSTRAINT user_codes_code_key UNIQUE (code);


--
-- Name: user_codes user_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_codes
    ADD CONSTRAINT user_codes_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_user_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_code_key UNIQUE (user_code);


--


-- =============================================================
-- SECTION 6: INDEXES
-- =============================================================

CREATE INDEX idx_account_payables_due_date ON public.account_payables USING btree (due_date);


--
-- Name: idx_account_payables_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_payables_status ON public.account_payables USING btree (status);


--
-- Name: idx_account_receivables_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_receivables_due_date ON public.account_receivables USING btree (due_date);


--
-- Name: idx_account_receivables_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_receivables_status ON public.account_receivables USING btree (status);


--
-- Name: idx_blocked_ips_blocked_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocked_ips_blocked_until ON public.blocked_ips USING btree (blocked_until);


--
-- Name: idx_blocked_ips_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocked_ips_ip_address ON public.blocked_ips USING btree (ip_address);


--
-- Name: idx_daily_sales_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_sales_date ON public.daily_sales USING btree (sale_date DESC);


--
-- Name: idx_daily_sales_pump; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_sales_pump ON public.daily_sales USING btree (pump_number);


--
-- Name: idx_daily_sales_sale_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_sales_sale_type ON public.daily_sales USING btree (sale_type);


--
-- Name: idx_daily_stock_entries_product_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_stock_entries_product_date ON public.daily_stock_entries USING btree (product_id, entry_date);


--
-- Name: idx_daily_stock_transactions_product_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_stock_transactions_product_date ON public.daily_stock_transactions USING btree (product_id, transaction_date);


--
-- Name: idx_drum_sales_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drum_sales_date ON public.drum_sales USING btree (sale_date);


--
-- Name: idx_drum_sales_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drum_sales_product ON public.drum_sales USING btree (product_id);


--
-- Name: idx_exchange_rates_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exchange_rates_active ON public.exchange_rates USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_exchange_rates_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exchange_rates_date ON public.exchange_rates USING btree (rate_date DESC);


--
-- Name: idx_exchange_rates_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_exchange_rates_unique_active ON public.exchange_rates USING btree (rate_date) WHERE (is_active = true);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_failed_attempts_identifier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_failed_attempts_identifier ON public.failed_login_attempts USING btree (identifier);


--
-- Name: idx_failed_attempts_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_failed_attempts_ip ON public.failed_login_attempts USING btree (ip_address);


--
-- Name: idx_failed_attempts_locked_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_failed_attempts_locked_until ON public.failed_login_attempts USING btree (locked_until);


--
-- Name: idx_fuel_stock_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_stock_product ON public.fuel_stock USING btree (product_id);


--
-- Name: idx_fuel_stock_station_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_stock_station_date ON public.fuel_stock USING btree (station_id, date);


--
-- Name: idx_fuel_stock_variance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_stock_variance ON public.fuel_stock USING btree (variance_percentage) WHERE (abs(variance_percentage) > (2)::numeric);


--
-- Name: idx_fund_transfers_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fund_transfers_date ON public.fund_transfers USING btree (transfer_date);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_pin_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pin_history_user ON public.pin_history USING btree (user_id, created_at);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_pump_sales_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pump_sales_date ON public.pump_sales USING btree (sale_date);


--
-- Name: idx_pump_sales_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pump_sales_product ON public.pump_sales USING btree (product_id);


--
-- Name: idx_security_events_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_timestamp ON public.security_events USING btree ("timestamp");


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_sessions_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_active ON public.user_sessions USING btree (user_id, is_active);


--
-- Name: idx_stations_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stations_active ON public.stations USING btree (is_active);


--
-- Name: idx_stock_balances_product_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_balances_product_date ON public.stock_balances USING btree (product_id, balance_date);


--
-- Name: idx_stock_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_product ON public.stock_items USING btree (product_id);


--
-- Name: idx_stock_items_station; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_station ON public.stock_items USING btree (station_id);


--
-- Name: idx_stock_levels_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_levels_product ON public.stock_levels USING btree (product_id);


--
-- Name: idx_stock_variances_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_variances_date ON public.stock_variances USING btree (variance_date);


--
-- Name: idx_stock_variances_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_variances_product ON public.stock_variances USING btree (product_id);


--
-- Name: idx_stock_variances_reason; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_variances_reason ON public.stock_variances USING btree (reason);


--
-- Name: idx_user_codes_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_codes_available ON public.user_codes USING btree (is_assigned, station_id);


--
-- Name: idx_user_codes_station_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_codes_station_role ON public.user_codes USING btree (station_id, role);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active, expires_at);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_user_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_user_code ON public.users USING btree (user_code);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: fuel_stock fuel_stock_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER fuel_stock_updated_at BEFORE UPDATE ON public.fuel_stock FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: user_sessions trigger_update_session_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_session_activity BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.update_session_activity();


--
-- Name: daily_sales update_daily_sales_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_daily_sales_updated_at BEFORE UPDATE ON public.daily_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exchange_rates update_exchange_rates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stations update_stations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_balances update_stock_balances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_balances_updated_at BEFORE UPDATE ON public.stock_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



-- =============================================================
-- SECTION 7: FOREIGN KEY CONSTRAINTS
-- =============================================================

    ADD CONSTRAINT audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id);


--
-- Name: blocked_ips blocked_ips_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_ips
    ADD CONSTRAINT blocked_ips_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id);


--
-- Name: daily_sales_pump daily_sales_pump_pump_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_sales_pump
    ADD CONSTRAINT daily_sales_pump_pump_id_fkey FOREIGN KEY (pump_id) REFERENCES public.pumps(id);


--
-- Name: daily_stock_entries daily_stock_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_entries
    ADD CONSTRAINT daily_stock_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: daily_stock_entries daily_stock_entries_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_entries
    ADD CONSTRAINT daily_stock_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: daily_stock_entries daily_stock_entries_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_entries
    ADD CONSTRAINT daily_stock_entries_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: daily_stock_transactions daily_stock_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_transactions
    ADD CONSTRAINT daily_stock_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: daily_stock_transactions daily_stock_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_transactions
    ADD CONSTRAINT daily_stock_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: daily_stock_transactions daily_stock_transactions_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stock_transactions
    ADD CONSTRAINT daily_stock_transactions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: drum_sales drum_sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drum_sales
    ADD CONSTRAINT drum_sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: drum_sales drum_sales_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drum_sales
    ADD CONSTRAINT drum_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: drum_sales drum_sales_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drum_sales
    ADD CONSTRAINT drum_sales_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: exchange_rates exchange_rates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: fuel_deliveries fuel_deliveries_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_deliveries
    ADD CONSTRAINT fuel_deliveries_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES public.accounts(id);


--
-- Name: fuel_deliveries fuel_deliveries_tax_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_deliveries
    ADD CONSTRAINT fuel_deliveries_tax_account_id_fkey FOREIGN KEY (tax_account_id) REFERENCES public.accounts(id);


--
-- Name: fuel_deliveries fuel_deliveries_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_deliveries
    ADD CONSTRAINT fuel_deliveries_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id);


--
-- Name: fund_transfers fund_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fund_transfers
    ADD CONSTRAINT fund_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: pump_sales pump_sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_sales
    ADD CONSTRAINT pump_sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pump_sales pump_sales_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_sales
    ADD CONSTRAINT pump_sales_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: pump_sales pump_sales_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_sales
    ADD CONSTRAINT pump_sales_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: security_policies security_policies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_policies
    ADD CONSTRAINT security_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: stock_balances stock_balances_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_balances
    ADD CONSTRAINT stock_balances_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_balances stock_balances_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_balances
    ADD CONSTRAINT stock_balances_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: stock_items stock_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_items stock_items_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: stock_items stock_items_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: stock_levels stock_levels_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE CASCADE;


--
-- Name: stock_variances stock_variances_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_variances
    ADD CONSTRAINT stock_variances_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_variances stock_variances_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_variances
    ADD CONSTRAINT stock_variances_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_variances stock_variances_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_variances
    ADD CONSTRAINT stock_variances_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;


--
-- Name: stock_variances stock_variances_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_variances
    ADD CONSTRAINT stock_variances_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE SET NULL;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--



-- =============================================================
-- SECTION 8: TRIGGERS
-- =============================================================

--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();




-- =============================================================
-- SECTION 9: ROW LEVEL SECURITY
-- Enable RLS and attach policies on all public tables.
-- =============================================================

CREATE POLICY account_payables_all ON public.account_payables USING (true);


--
-- Name: account_receivables; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_receivables ENABLE ROW LEVEL SECURITY;

--
-- Name: account_receivables account_receivables_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_receivables_all ON public.account_receivables USING (true);


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: account_payables allow_all_account_payables; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_account_payables ON public.account_payables USING (true) WITH CHECK (true);


--
-- Name: account_receivables allow_all_account_receivables; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_account_receivables ON public.account_receivables USING (true) WITH CHECK (true);


--
-- Name: daily_sales_drum allow_all_daily_sales_drum; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_daily_sales_drum ON public.daily_sales_drum USING (true) WITH CHECK (true);


--
-- Name: exchange_rates allow_all_exchange_rates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_exchange_rates ON public.exchange_rates USING (true) WITH CHECK (true);


--
-- Name: stock_items allow_all_stock_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_stock_items ON public.stock_items USING (true) WITH CHECK (true);


--
-- Name: users allow_all_users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_users ON public.users USING (true) WITH CHECK (true);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_ips; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

--
-- Name: creditors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_sales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_sales_drum; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_sales_drum ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_sales_pump; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_sales_pump ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_stock_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_stock_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_stock_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_stock_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: drum_sales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.drum_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_access_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.emergency_access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: failed_login_attempts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: fuel_deliveries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fuel_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: fuel_stock; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fuel_stock ENABLE ROW LEVEL SECURITY;

--
-- Name: fund_transfers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pin_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pin_history ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: pump_sales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pump_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: pumps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: security_policies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: session_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: station_products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.station_products ENABLE ROW LEVEL SECURITY;

--
-- Name: station_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.station_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: station_settings station_settings_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY station_settings_all ON public.station_settings USING (true);


--
-- Name: stations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_balances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_variances; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_variances ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: transporters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

--
-- Name: user_codes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_all_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_all_access ON public.users USING (true);



-- =============================================================
-- SECTION 10: SCHEMA GRANTS
-- Adjust roles below if restoring to a non-Supabase environment.
-- =============================================================

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;


-- =============================================================
-- END OF RESTORE SCRIPT
-- =============================================================
-- To restore (Supabase):
--   psql -h <host> -U postgres -d postgres -f restore_schema.sql
--
-- To restore (plain Postgres):
--   psql -U postgres -d <your_db> -f restore_schema.sql
--
-- If you see errors about missing roles (anon, authenticated, etc.),
-- run the Supabase role creation block from the original dump first,
-- or comment out the GRANT statements in Section 10.
-- =============================================================
