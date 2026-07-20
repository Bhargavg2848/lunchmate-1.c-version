import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

const loadImage = (url) => new Promise((resolve) => {
  const img = new Image();
  img.src = url;
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
});

const drawPin = (doc, x, y) => {
  doc.setFillColor(220, 38, 38);
  doc.circle(x, y - 2, 2, 'F');
  doc.triangle(x - 2, y - 2, x + 2, y - 2, x, y + 2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(x, y - 2.5, 0.8, 'F');
}

// Logic for exact delivery calculation used in frontend
const calculateDeliveryFee = (d) => {
  if (isNaN(d) || d <= 0) return 0;
  const rounded = Math.round(d * 10) / 10;
  if (rounded <= 1.0) return 5.0;
  const extraKm = Math.floor(rounded) - 1.0;
  const hundreds = Math.round((rounded - Math.floor(rounded)) * 10);
  return 5.0 + (extraKm * 4.0) + (hundreds * 0.30);
};

export async function generateSubscriptionInvoice(subscription) {
  try {
    let distance = 0;
    let addonPrice = 0;
    let addonName = '';
    
    if (subscription.order_id) {
        const { data: orderData } = await supabase
            .from('orders')
            .select('delivery_distance_km, snack_addon_offer_id')
            .eq('order_id', subscription.order_id)
            .maybeSingle();
            
        if (orderData) {
            distance = Number(orderData.delivery_distance_km || 0);
            if (orderData.snack_addon_offer_id) {
                const { data: addonData } = await supabase
                    .from('subscription_offers')
                    .select('package_price, menu_items(name)')
                    .eq('id', orderData.snack_addon_offer_id)
                    .maybeSingle();
                if (addonData) {
                    addonPrice = Number(addonData.package_price || 0);
                    addonName = addonData.menu_items?.name || 'Snack Add-on';
                }
            }
        }
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    // TILED WATERMARK (Even smaller and lighter)
    const logo = await loadImage('/logo.jpeg');
    if (logo) {
      doc.setGState(new doc.GState({ opacity: 0.03 }));
      const w = 10; const h = 10;
      for (let x = 5; x < 210; x += 30) {
        for (let y = 45; y < 297; y += 30) {
          doc.addImage(logo, 'JPEG', x, y, w, h);
        }
      }
      doc.setGState(new doc.GState({ opacity: 1.0 }));
    }

    // HEADER
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(26); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('Lunchmate', 15, 20);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
    doc.text('Subscription Invoice & Delivery Receipt', 15, 28);
    doc.text(`Order ID: ${subscription.order_id || 'N/A'}`, 195, 20, { align: 'right' });
    doc.text(`Date: ${new Date(subscription.created_at || Date.now()).toLocaleDateString()}`, 195, 28, { align: 'right' });

    // ADDRESSES
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, 55);
    drawPin(doc, 22, 63);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Lunchmate Hub', 28, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize('Ramalayam street, Sriram nagar, Kondayya palem, Kakinada, Andhra Pradesh 533003', 75), 28, 67);

    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('BILLED & DELIVERED TO:', 110, 55);
    drawPin(doc, 112, 63);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(subscription.customer_name || 'N/A', 118, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`Contact: ${subscription.customer_contact || 'N/A'}`, 118, 67);
    doc.text(doc.splitTextToSize(subscription.customer_address || 'N/A', 80), 118, 72);

    // MATH
    const totalAmount = Number(subscription.original_total_amount || 0);
    const amountPaid = Number(subscription.amount_received || 0);
    const balanceDue = Number(subscription.amount_due || 0);
    const credits = Number(subscription.plan_credits || 30);
    
    const deliveryFeePerMeal = calculateDeliveryFee(distance);
    const totalDeliveryCharge = deliveryFeePerMeal * credits;
    const subscriptionPrice = Math.max(0, totalAmount - totalDeliveryCharge - addonPrice);

    // TABLE
    const bodyRows = [
      ["Subscription Plan", `${subscription.plan_name || 'Plan'} (${credits} Meals)\n${subscription.original_menu_item_name || ''}`, `Rs. ${subscriptionPrice.toFixed(2)}`]
    ];
    if (addonPrice > 0) {
        bodyRows.push(["Snack Add-on", addonName, `Rs. ${addonPrice.toFixed(2)}`]);
    }
    bodyRows.push(["Delivery Charges", `Rate: Rs. ${deliveryFeePerMeal.toFixed(2)} x ${credits}`, `Rs. ${totalDeliveryCharge.toFixed(2)}`]);

    autoTable(doc, {
      startY: 97,
      head: [["Item Description", "Details", "Amount (INR)"]],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] }, 
      styles: { fontSize: 10, cellPadding: 6 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 95 }, 2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } }
    });

    // TOTALS BOX
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFillColor(243, 244, 246); doc.rect(100, finalY - 8, 95, 35, 'F');
    doc.setFontSize(11); doc.setTextColor(50, 50, 50);
    doc.text('Total Value:', 105, finalY); doc.text(`Rs. ${totalAmount.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.text('Amount Received:', 105, finalY + 8); doc.text(`Rs. ${amountPaid.toFixed(2)}`, 185, finalY + 8, { align: 'right' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(balanceDue > 0 ? 220 : 22, balanceDue > 0 ? 38 : 163, balanceDue > 0 ? 38 : 74);
    doc.text('Balance Due:', 105, finalY + 18); doc.text(`Rs. ${balanceDue.toFixed(2)}`, 185, finalY + 18, { align: 'right' });

    // FOOTER
    doc.setTextColor(150, 150, 150); doc.setFontSize(9); doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing Lunchmate! Home Made Food In Your door Steps.', 105, 285, { align: 'center' });

    doc.save(`Invoice_${subscription.order_id}.pdf`);
    return { success: true };
  } catch (err) {
    console.error("PDF Error: ", err);
    return { error: err.message };
  }
}
