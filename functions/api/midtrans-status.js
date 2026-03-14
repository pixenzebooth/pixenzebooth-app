export async function onRequestGet(context) {
    try {
        const { request, env } = context;
        const urlObj = new URL(request.url);
        const orderId = urlObj.searchParams.get('order_id');

        if (!orderId) {
            return new Response(JSON.stringify({ success: false, message: 'Missing order_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const serverKey = env.MIDTRANS_SERVER_KEY;
        const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';

        const url = isProduction ? `https://api.midtrans.com/v2/${orderId}/status` : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;
        const authString = btoa(`${serverKey}:`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${authString}`
            }
        });

        const data = await response.json();

        if (response.ok && (data.status_code === "200" || data.status_code === "201")) {
            return new Response(JSON.stringify({
                success: true,
                transaction_status: data.transaction_status // "settlement" or "capture" means success
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: false, message: 'Status query failed', detail: data }), { status: response.status, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error polling midtrans status:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
