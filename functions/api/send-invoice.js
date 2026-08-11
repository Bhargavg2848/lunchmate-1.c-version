export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { to_email, customer_name, pdf_base64, order_id } = body;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.VITE_RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Lunchmate <orders@lunchmate.live>', // We will update this later!
        to: [to_email],
        subject: `Lunchmate Subscription Invoice - ${customer_name}`,
        html: `<p>Hi ${customer_name},</p><p>Thank you for choosing Lunchmate! Please find your subscription invoice and delivery receipt attached.</p>`,
        attachments: [
          {
            filename: `Invoice_${order_id}.pdf`,
            content: pdf_base64
          }
        ]
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { 
      status: res.status, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}



