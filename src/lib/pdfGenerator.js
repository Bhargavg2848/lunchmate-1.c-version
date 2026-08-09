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

// Rs. 8 Base + (Distance * 8) formula
const calculateDeliveryFee = (d) => {
  const distance = Number(d);
  if (isNaN(distance) || distance <= 0) return 0;
  return 8.0 + (distance * 8.0);
};

export async function generateSubscriptionInvoice(subscription) {
  try {
    let distance = 0;
    let addonPrice = 0;
    let addonName = '';

    // FIX: Properly capture the order ID from the overview page
    const targetOrderId = subscription.order_id || subscription.subscription_order_id;
    
    if (targetOrderId) {
        const { data: orderData } = await supabase
            .from('orders')
            .select('delivery_distance_km, snack_addon_offer_id')
            .eq('order_id', targetOrderId)
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

    // CLEAN SINGLE WATERMARK
    const logo = await loadImage('/logo.jpeg');
    if (logo) {
      doc.setGState(new doc.GState({ opacity: 0.08 })); // Light, elegant opacity
      doc.addImage(logo, 'JPEG', 65, 90, 80, 80); // Perfectly centered
      doc.setGState(new doc.GState({ opacity: 1.0 }));
    }

    // HEADER - Modern Dark Mode Style
    doc.setFillColor(17, 24, 39); doc.rect(0, 0, 210, 35, 'F');
    doc.setFontSize(24); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('Lunchmate', 15, 18);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
    doc.text('Subscription Invoice & Delivery Receipt', 15, 25);
    doc.text(`Order ID: ${targetOrderId || 'N/A'}`, 195, 18, { align: 'right' });
    doc.text(`Date: ${new Date(subscription.created_at || Date.now()).toLocaleDateString()}`, 195, 25, { align: 'right' });

    // ADDRESSES
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 20, 50);
    drawPin(doc, 22, 58);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Lunchmate Hub', 28, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize('Ramalayam street, Sriram nagar, Kondayya palem, Kakinada, Andhra Pradesh 533003', 75), 28, 62);

    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('BILLED & DELIVERED TO:', 110, 50);
    drawPin(doc, 112, 58);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(subscription.customer_name || 'N/A', 118, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(`Contact: ${subscription.customer_contact || 'N/A'}`, 118, 62);
    doc.text(doc.splitTextToSize(subscription.customer_address || 'N/A', 80), 118, 67);

    // MATH & CALCULATIONS
    const originalTotalAmount = Number(subscription.original_total_amount || 0);
    const revisedTotalAmount = Number(subscription.revised_total_amount || subscription.total_amount || originalTotalAmount);
    const amountPaid = Number(subscription.amount_received || 0);
    const balanceDue = Number(subscription.amount_due || 0);
    const credits = Number(subscription.plan_credits || 30);
    
    // Calculate fee per meal based on DB distance
    let deliveryFeePerMeal = calculateDeliveryFee(distance);
    
    // Fallback if distance is 0 but an old delivery fee was saved
    if (distance === 0 && subscription.delivery_fee_per_delivery > 0) {
        deliveryFeePerMeal = Number(subscription.delivery_fee_per_delivery);
    }

    const totalDeliveryCharge = deliveryFeePerMeal * credits;
    const subscriptionFoodAmount = Math.max(0, originalTotalAmount - totalDeliveryCharge - addonPrice);
    const taxAmount = Math.max(0, revisedTotalAmount - originalTotalAmount); 
    const grandTotal = revisedTotalAmount;

    // TABLE
    const bodyRows = [
      ["Subscription Fee", `${subscription.plan_name || 'Plan'} (${credits} Meals)\n${subscription.original_menu_item_name || ''}`, `Rs. ${subscriptionFoodAmount.toFixed(2)}`]
    ];
    if (addonPrice > 0) {
        bodyRows.push(["Snack Add-on", addonName, `Rs. ${addonPrice.toFixed(2)}`]);
    }
    
    // Clean delivery display
    bodyRows.push(["Delivery Charges", `Rate: Rs. ${deliveryFeePerMeal.toFixed(2)} x ${credits} meals\nDistance: ${distance > 0 ? distance + ' km' : 'Calculated'}`, `Rs. ${totalDeliveryCharge.toFixed(2)}`]);
    
    if (taxAmount > 0) {
        bodyRows.push(["Taxes / Adjustments", "Applied to final amount", `Rs. ${taxAmount.toFixed(2)}`]);
    }
    
    bodyRows.push(["Grand Total", "Inclusive of all charges", `Rs. ${grandTotal.toFixed(2)}`]);

    autoTable(doc, {
      startY: 85,
      head: [["Item Description", "Details", "Amount (INR)"]],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' }, 
      styles: { fontSize: 10, cellPadding: 8, lineColor: [229, 231, 235], lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', textColor: [31, 41, 55] }, 1: { cellWidth: 95, textColor: [75, 85, 99] }, 2: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] } }
    });

    // TOTALS BOX - Clean styling with borders
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFillColor(243, 244, 246); doc.rect(100, finalY - 8, 95, 45, 'F');
    doc.setDrawColor(209, 213, 219); doc.rect(100, finalY - 8, 95, 45, 'S'); 
    doc.setFontSize(11); doc.setTextColor(55, 65, 81);
    doc.text('Original Total:', 105, finalY); doc.text(`Rs. ${originalTotalAmount.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.text('Revised Total:', 105, finalY + 8); doc.text(`Rs. ${revisedTotalAmount.toFixed(2)}`, 185, finalY + 8, { align: 'right' });
    doc.text('Amount Received:', 105, finalY + 16); doc.text(`Rs. ${amountPaid.toFixed(2)}`, 185, finalY + 16, { align: 'right' });
    
    doc.setDrawColor(209, 213, 219); doc.line(105, finalY + 20, 190, finalY + 20);
    
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(balanceDue > 0 ? 220 : 22, balanceDue > 0 ? 38 : 163, balanceDue > 0 ? 38 : 74);
    doc.text('Balance Due:', 105, finalY + 28); doc.text(`Rs. ${balanceDue.toFixed(2)}`, 185, finalY + 28, { align: 'right' });

    // FOOTER
    doc.setTextColor(156, 163, 175); doc.setFontSize(9); doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing Lunchmate! Home Made Food At Your Doorsteps.', 105, 285, { align: 'center' });

    doc.save(`Invoice_${targetOrderId}.pdf`);
    return { success: true };
  } catch (err) {
    console.error("PDF Error: ", err);
    return { error: err.message };
  }
}
