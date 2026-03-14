export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { amount, orderId, name, email } = body;

        const serverKey = env.MIDTRANS_SERVER_KEY;
        const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';

        if (!serverKey) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Server configuration error: Missing MIDTRANS_SERVER_KEY env variable'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const url = isProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        // Base64 encode server key Auth header
        const authString = btoa(`${serverKey}:`);

        const payload = {
            transaction_details: {
                order_id: orderId || `PX-${Date.now()}`,
                gross_amount: amount
            },
            customer_details: {
                first_name: name || "Pixenze",
                email: email || "hello@pixenze.com"
            },
            enabled_payments: ["gopay", "qris", "shopeepay"]
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

        if (!response.ok) {
            console.error("Midtrans API Error:", data);
            return new Response(JSON.stringify({
                success: false,
                message: 'Midtrans API Error',
                detail: data
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            token: data.token,
            redirect_url: data.redirect_url
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error creating midtrans token:', error);
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
