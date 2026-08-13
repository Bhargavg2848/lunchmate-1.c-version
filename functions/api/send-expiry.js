export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { email, customerName, planName, orderId } = body;

    const resendKey = env.VITE_RESEND_API_KEY; 
    if (!resendKey) throw new Error("Missing Resend API Key in Cloudflare");

    if (!email) throw new Error("Customer has no email address on file.");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-w-xl; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f97316; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Action Required: Subscription Expiring</h2>
        </div>
        <div style="padding: 20px; color: #374151;">
          <p>Hi <strong>${customerName}</strong>,</p>
          <p>This is a quick reminder that your Lunchmate subscription for the <strong>${planName}</strong> (Order: ${orderId}) will expire in exactly <strong>3 days</strong>.</p>
          <p>Please let us know if you would like to renew your plan to continue enjoying seamless, home-made food delivery without interruption.</p>
          <br/>
          <p>Thank you,<br/><strong>The Lunchmate Team</strong></p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Lunchmate Billing <billing@lunchmate.live>',
        to: email,
        subject: '⚠️ Your Lunchmate Subscription expires in 3 days!',
        html: htmlContent
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.ok ? 200 : 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
