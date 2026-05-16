// WhatsApp via click-to-chat link (no API required)
// For production, consider Twilio WhatsApp API

exports.generateWhatsAppOrderLink = (order, phoneNumber) => {
  const adminPhone = process.env.WHATSAPP_BUSINESS_NUMBER || '2349068918017';
  
  const itemsList = order.items
    .map(item => `• ${item.name} x${item.quantity} = ₦${(item.price * item.quantity).toLocaleString()}`)
    .join('\n');

  const message = encodeURIComponent(
    `🛒 *New Order - PASAM Store*\n\n` +
    `*Order #:* ${order.orderNumber}\n` +
    `*Customer:* ${order.deliveryInfo.fullname}\n` +
    `*Phone:* ${order.deliveryInfo.phone}\n` +
    `*Address:* ${order.deliveryInfo.address}, ${order.deliveryInfo.city}\n` +
    (order.deliveryInfo.landmark ? `*Landmark:* ${order.deliveryInfo.landmark}\n` : '') +
    `\n*Items:*\n${itemsList}\n\n` +
    `*Subtotal:* ₦${order.subtotal.toLocaleString()}\n` +
    `*Delivery Fee:* ₦${order.deliveryFee.toLocaleString()}\n` +
    `*Total:* ₦${order.totalAmount.toLocaleString()}\n\n` +
    `*Payment:* Bank Transfer (Pending)\n` +
    `*Status:* Pending`
  );

  return `https://wa.me/${adminPhone}?text=${message}`;
};

exports.generateCustomerWhatsAppMessage = (order) => {
  const adminPhone = process.env.WHATSAPP_BUSINESS_NUMBER || '2348012345678';
  
  const message = encodeURIComponent(
    `Hello PASAM Store! 👋\n\n` +
    `I just placed order *${order.orderNumber}* worth ₦${order.totalAmount.toLocaleString()}.\n\n` +
    `Please confirm receipt. Thank you! 🙏`
  );

  return `https://wa.me/${adminPhone}?text=${message}`;
};
