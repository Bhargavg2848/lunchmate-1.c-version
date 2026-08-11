import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

const loadImage = (url) => new Promise((resolve) => {
  const img = new Image();
  img.src = url;
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
});

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

    const targetOrderId = subscription.order_id || subscription.subscription_order_id;
    
    // Advanced Data Fetch: Check both subscription_orders and orders tables for distance
    if (targetOrderId) {
        let { data: orderData } = await supabase
            .from('subscription_orders')
            .select('delivery_distance_km, snack_addon_offer_id')
            .eq('order_id', targetOrderId)
            .maybeSingle();
            
        if (!orderData) {
            const { data: regularOrder } = await supabase
                .from('orders')
                .select('delivery_distance_km')
                .eq('order_id', targetOrderId)
                .maybeSingle();
            if (regularOrder) orderData = regularOrder;
        }
            
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
    const pageWidth = doc.internal.pageSize.width;

    // --- 1. HEADER & LOGO ---
    const logo = await loadImage('/logo.jpeg');
    if (logo) {
      doc.addImage(logo, 'JPEG', 15, 12, 25, 25);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55); 
    doc.text('LUNCHMATE', 45, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); 
    doc.text('Premium Home-Made Food Delivery', 45, 28);
    doc.text('Kakinada, Andhra Pradesh 533003', 45, 33);

    // INVOICE META 
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('TAX INVOICE', pageWidth - 15, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(`Order ID: ${targetOrderId || 'N/A'}`, pageWidth - 15, 30, { align: 'right' });
    doc.text(`Date: ${new Date(subscription.created_at || Date.now()).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}`, pageWidth - 15, 35, { align: 'right' });

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, 42, pageWidth - 15, 42);

    // --- 2. BILLING & DELIVERY DETAILS ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('BILLED TO:', 15, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.text(subscription.customer_name || 'Customer Name N/A', 15, 58);
    doc.text(`Phone: ${subscription.customer_contact || 'N/A'}`, 15, 63);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY ADDRESS:', 100, 52);
    
    doc.setFont('helvetica', 'normal');
    
    // STRICT WRAP FIX: Clean all weird spacing and enforce a strict 95mm maximum width boundary
    const cleanAddress = (subscription.customer_address || 'Address N/A').replace(/\s+/g, ' ').trim();
    doc.text(cleanAddress, 100, 58, { maxWidth: 95, align: 'left', lineHeightFactor: 1.5 });

    // --- 3. FINANCIAL MATH ---
    const originalTotalAmount = Number(subscription.original_total_amount || 0);
    const revisedTotalAmount = Number(subscription.revised_total_amount || subscription.total_amount || originalTotalAmount);
    const amountPaid = Number(subscription.amount_received || 0);
    const balanceDue = Number(subscription.amount_due || 0);
    const credits = Number(subscription.plan_credits || 1);
    
    let deliveryFeePerMeal = calculateDeliveryFee(distance);
    let totalDeliveryCharge = deliveryFeePerMeal * credits;

    if (originalTotalAmount < totalDeliveryCharge) {
        deliveryFeePerMeal = 0;
        totalDeliveryCharge = 0;
    }

    const subscriptionFoodAmount = Math.max(0, originalTotalAmount - totalDeliveryCharge - addonPrice);
    const taxAmount = Math.max(0, revisedTotalAmount - originalTotalAmount); 

    // --- 4. ITEMS TABLE ---
    const tableBody = [];
    
    tableBody.push([
        { content: 'Subscription Fee', styles: { fontStyle: 'bold' } },
        `${subscription.plan_name || 'Plan'} (${credits} Meals)\nMenu: ${subscription.original_menu_item_name || 'Standard'}`,
        `Rs. ${subscriptionFoodAmount.toFixed(2)}`
    ]);

    if (addonPrice > 0) {
        tableBody.push([
            { content: 'Snack Add-on', styles: { fontStyle: 'bold' } },
            addonName,
            `Rs. ${addonPrice.toFixed(2)}`
        ]);
    }

    tableBody.push([
        { content: 'Delivery Charges', styles: { fontStyle: 'bold' } },
        distance > 0 
            ? `Distance: ${distance} km\nRate: Rs. ${deliveryFeePerMeal.toFixed(2)} / delivery x ${credits} deliveries`
            : `Delivery Fee Waived / Included`,
        `Rs. ${totalDeliveryCharge.toFixed(2)}`
    ]);

    if (taxAmount > 0) {
        tableBody.push([
            { content: 'Taxes & Adjustments', styles: { fontStyle: 'bold' } },
            'Applied to final revised amount',
            `Rs. ${taxAmount.toFixed(2)}`
        ]);
    }

    autoTable(doc, {
        startY: 75,
        head: [['ITEM', 'DESCRIPTION', 'TOTAL']],
        body: tableBody,
        theme: 'plain',
        headStyles: { 
            fillColor: [243, 244, 246], 
            textColor: [31, 41, 55], 
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 4
        },
        bodyStyles: {
            textColor: [55, 65, 81],
            fontSize: 10,
            cellPadding: 5
        },
        columnStyles: { 
            0: { cellWidth: 50 }, 
            1: { cellWidth: 90 }, 
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] } 
        },
        willDrawCell: function(data) {
            if (data.row.section === 'body' && data.row.index !== tableBody.length - 1) {
                doc.setDrawColor(243, 244, 246);
                doc.setLineWidth(0.5);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    // --- 5. SUMMARY TOTALS ---
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(pageWidth - 95, finalY - 8, 80, 50, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text('Subtotal:', pageWidth - 90, finalY); 
    doc.text(`Rs. ${originalTotalAmount.toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });
    
    doc.text('Adjustments:', pageWidth - 90, finalY + 8); 
    doc.text(`Rs. ${taxAmount.toFixed(2)}`, pageWidth - 20, finalY + 8, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Grand Total:', pageWidth - 90, finalY + 16); 
    doc.text(`Rs. ${revisedTotalAmount.toFixed(2)}`, pageWidth - 20, finalY + 16, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Amount Paid:', pageWidth - 90, finalY + 24); 
    doc.text(`Rs. ${amountPaid.toFixed(2)}`, pageWidth - 20, finalY + 24, { align: 'right' });
    
    doc.setDrawColor(209, 213, 219);
    doc.line(pageWidth - 90, finalY + 28, pageWidth - 20, finalY + 28);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (balanceDue > 0) {
        doc.setTextColor(220, 38, 38); 
    } else {
        doc.setTextColor(22, 163, 74); 
    }
    doc.text('Balance Due:', pageWidth - 90, finalY + 35); 
    doc.text(`Rs. ${balanceDue.toFixed(2)}`, pageWidth - 20, finalY + 35, { align: 'right' });

    // --- 6. FOOTER ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('Thank you for choosing Lunchmate!', 15, pageHeight - 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('If you have any questions about this invoice, please contact us.', 15, pageHeight - 17);
    doc.text('This is a computer-generated document and does not require a signature.', 15, pageHeight - 12);

    // --- OUTPUT HANDLER (Cloudinary) ---
    if (subscription.uploadToCloudinary) {
      const pdfBase64 = doc.output('datauristring');
      
      const formData = new FormData();
      formData.append('file', pdfBase64);
      formData.append('upload_preset', 'invoice');
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/igdzn4bz/auto/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      return { success: true, url: data.secure_url };
    } 
    else if (subscription.returnBase64) {
      const base64String = doc.output('datauristring').split(',')[1];
      return { success: true, base64: base64String };
    } 
    else {
      doc.save(`Invoice_${targetOrderId || 'Receipt'}.pdf`);
      return { success: true };
    }
  } catch (err) {
    console.error("PDF Error: ", err);
    return { error: err.message };
  }
}


