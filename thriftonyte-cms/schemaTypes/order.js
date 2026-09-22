// Orders are created by the website's checkout (api/create-order.js), never by
// hand. Their IDs start with "order." — Sanity treats any document ID that
// contains a dot as private, so orders (names, phones, addresses) can only be
// read with a token or in this Studio, never through the public API that the
// website uses for products.
export default {
  name: 'order',
  title: 'Order',
  type: 'document',
  fields: [
    { name: 'orderId', title: 'Order ID', type: 'string', readOnly: true },
    {
      name: 'status',
      title: 'Payment status',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          { title: 'Awaiting payment', value: 'pending' },
          { title: 'Paid', value: 'paid' },
          { title: 'Refunded (piece already sold)', value: 'refunded' },
          { title: 'Failed / abandoned', value: 'failed' },
        ],
      },
    },
    {
      name: 'fulfilment',
      title: 'Fulfilment',
      type: 'string',
      initialValue: 'to_ship',
      options: {
        list: [
          { title: 'To ship', value: 'to_ship' },
          { title: 'Shipped', value: 'shipped' },
          { title: 'Delivered', value: 'delivered' },
          { title: 'Cancelled', value: 'cancelled' },
        ],
        layout: 'radio',
      },
    },
    { name: 'trackingNumber', title: 'Tracking number / link', type: 'string' },
    { name: 'amount', title: 'Amount (₹)', type: 'number', readOnly: true },
    {
      name: 'items',
      title: 'Items',
      type: 'array',
      readOnly: true,
      of: [{
        type: 'object',
        fields: [
          { name: 'productId', type: 'string', title: 'Product ID' },
          { name: 'title', type: 'string', title: 'Title' },
          { name: 'price', type: 'number', title: 'Price' },
          { name: 'tagSize', type: 'string', title: 'Tag size' },
        ],
        preview: { select: { title: 'title', subtitle: 'price' } },
      }],
    },
    {
      name: 'customer',
      title: 'Customer',
      type: 'object',
      readOnly: true,
      fields: [
        { name: 'name', type: 'string', title: 'Name' },
        { name: 'phone', type: 'string', title: 'Phone' },
        { name: 'email', type: 'string', title: 'Email' },
        { name: 'address', type: 'text', title: 'Address', rows: 3 },
        { name: 'city', type: 'string', title: 'City' },
        { name: 'state', type: 'string', title: 'State' },
        { name: 'pincode', type: 'string', title: 'Pincode' },
      ],
    },
    {
      name: 'policyAck',
      title: 'Policy acknowledgement',
      description: 'The buyer ticked "all sales are final" before paying. Useful evidence if a payment is disputed.',
      type: 'object',
      readOnly: true,
      fields: [
        { name: 'acceptedAt', type: 'datetime', title: 'Accepted at' },
        { name: 'policyVersion', type: 'string', title: 'Policy version' },
      ],
    },
    { name: 'cfOrderId', title: 'Cashfree order ID', type: 'string', readOnly: true },
    { name: 'paidAt', title: 'Paid at', type: 'datetime', readOnly: true },
    { name: 'note', title: 'System note', type: 'text', rows: 2, readOnly: true },
  ],
  orderings: [
    { title: 'Newest first', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
  ],
  preview: {
    select: { id: 'orderId', name: 'customer.name', amount: 'amount', status: 'status', fulfilment: 'fulfilment' },
    prepare({ id, name, amount, status, fulfilment }) {
      return {
        title: `${id || 'Order'} · ${name || ''}`,
        subtitle: `₹${amount ?? '–'} · ${status || ''}${status === 'paid' ? ` · ${fulfilment || 'to_ship'}` : ''}`,
      };
    },
  },
};
