import MD5 from './md5.js';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { name, message, amount, email } = body;

        // Validate required fields
        if (!name || !message || !amount || !email) {
            return new Response(JSON.stringify({
                success: false,
                message: 'Missing required fields'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const merchantCode = env.BAGIBAGI_MERCHANT_CODE;
        const apiKey = env.BAGIBAGI_API_KEY;
        const webhookUrl = env.BAGIBAGI_WEBHOOK_URL || 'https://bagibagi.co/api/partnerintegration/create-qris-transaction';

        if (!merchantCode || !apiKey) {
            console.error('Missing configuration: BAGIBAGI_MERCHANT_CODE or BAGIBAGI_API_KEY');
            return new Response(JSON.stringify({
                success: false,
                message: 'Server configuration error: Missing Environment Variables'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // MD5 Signature Generation
        // Formula: MD5(name + message + amount + email + webhookUrl + merchantCode + apiKey)
        const rawString = `${name}${message}${amount}${email}${webhookUrl}${merchantCode}${apiKey}`;
        const token = MD5(rawString);

        const payload = {
            name,
            message,
            amount,
            email,
            merchantCode,
            token,
            webhookUrl
        };

        const response = await fetch('https://bagibagi.co/api/partnerintegration/create-qris-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // Check if the external API call failed
        if (!response.ok) {
            const errorText = await response.text();
            console.error('BagiBagi API Error:', response.status, errorText);
            return new Response(JSON.stringify({
                success: false,
                message: 'BagiBagi API Error',
                detail: errorText
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error creating QRIS transaction:', error);
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
