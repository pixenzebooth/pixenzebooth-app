-- RPC for Secure Automatic Device Registration
-- This allows the Booth App (anon) to register itself using ONLY a license token
-- without requiring direct INSERT permissions on the devices table.

CREATE OR REPLACE FUNCTION register_device_with_token(
    p_token TEXT,
    p_hardware_id TEXT,
    p_device_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check limits and insert
AS $$
DECLARE
    v_tenant_id UUID;
    v_device_limit INTEGER;
    v_current_count INTEGER;
    v_existing_id UUID;
    v_existing_status TEXT;
BEGIN
    -- 1. Validate Token
    SELECT tenant_id INTO v_tenant_id
    FROM license_tokens
    WHERE token = UPPER(TRIM(p_token))
      AND status = 'active';

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid or deactivated license token');
    END IF;

    -- 2. Check if device already registered
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM devices
    WHERE tenant_id = v_tenant_id
      AND hardware_id = p_hardware_id;

    IF v_existing_id IS NOT NULL THEN
        IF v_existing_status = 'inactive' THEN
            RETURN jsonb_build_object('valid', false, 'error', 'This device has been deactivated.');
        END IF;
        
        -- Already registered and active
        RETURN jsonb_build_object('valid', true, 'tenant_id', v_tenant_id);
    END IF;

    -- 3. New Device - Check Limits
    SELECT device_limit INTO v_device_limit
    FROM subscriptions
    WHERE tenant_id = v_tenant_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Default limit if no subscription found
    IF v_device_limit IS NULL THEN
        v_device_limit := 1;
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM devices
    WHERE tenant_id = v_tenant_id;

    IF v_current_count >= v_device_limit THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'error', 'Device limit reached (' || v_current_count || '/' || v_device_limit || '). Please deactivate another device first.'
        );
    END IF;

    -- 4. Perform Registration
    INSERT INTO devices (tenant_id, hardware_id, device_name, status)
    VALUES (v_tenant_id, p_hardware_id, p_device_name, 'active');

    RETURN jsonb_build_object('valid', true, 'tenant_id', v_tenant_id, 'registered', true);
END;
$$;

-- Grant access to anon and authenticated users
GRANT EXECUTE ON FUNCTION register_device_with_token(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION register_device_with_token(TEXT, TEXT, TEXT) TO authenticated;
