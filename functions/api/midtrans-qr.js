export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { amount, orderId, name, email } = body;

        const serverKey = env.MIDTRANS_SERVER_KEY;
        if (!serverKey) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Server configuration error: Missing MIDTRANS_SERVER_KEY env variable'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';
        if (env.MIDTRANS_IS_PRODUCTION === undefined || env.MIDTRANS_IS_PRODUCTION === null) {
            isProduction = serverKey.startsWith('Mid-server-');
        }

        const url = isProduction ? 'https://api.midtrans.com/v2/charge' : 'https://api.sandbox.midtrans.com/v2/charge';

        // Base64 encode server key Auth header
        const authString = btoa(`${serverKey}:`);

        const payload = {
            payment_type: "qris",
            transaction_details: {
                order_id: orderId || `PX-${Date.now()}`,
                gross_amount: Math.floor(Number(amount))
            },
            customer_details: {
                first_name: name || "Pixenze",
                email: email || "hello@pixenze.com"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.status_code === "201") {
            const action = data.actions.find(a => a.name === "generate-qr-code");
            return new Response(JSON.stringify({
                success: true,
                order_id: data.order_id,
                qr_url: action ? action.url : null
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.error("Midtrans API Error:", data);
        return new Response(JSON.stringify({
            success: false,
            message: 'Midtrans API Error',
            detail: data
        }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error creating midtrans qr:', error);
        return new Response(JSON.stringify({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
