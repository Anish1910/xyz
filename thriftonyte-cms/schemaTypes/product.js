export default {
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: Rule => Rule.required().positive()
    },
    {
      name: 'description',
      title: 'Short Description',
      type: 'string',
      validation: Rule => Rule.required().max(200)
    },
    {
      name: 'longDescription',
      title: 'Long Description',
      type: 'text',
    },
    {
      name: 'images',
      title: 'Product Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          }
        }
      ],
      validation: Rule => Rule.required().min(1)
    },
    {
      name: 'hoverGif',
      title: 'Hover GIF (optional)',
      type: 'image',
      description: 'Image or GIF that displays on hover. Leave empty to use first product image.',
      options: {
        hotspot: true,
      }
    },
    // ---- Listing details shown on the product page ------------------------
    // All optional so existing products keep publishing; fill them in as you
    // re-list. Measurements, condition and flaws are what make the "not as
    // described" refund rule fair to both sides, so they are worth the minute.
    {
      name: 'tagSize',
      title: 'Tag size',
      type: 'string',
      description: 'Exactly what the label says, e.g. M, 32, 34W 32L. Powers the size filter in the shop.',
    },
    {
      name: 'measurements',
      title: 'Measurements (inches, garment laid flat)',
      type: 'object',
      description: 'Fill only what applies. Tops: chest, length, shoulder, sleeve. Bottoms: waist, inseam, rise, leg opening, hip.',
      options: { collapsible: true, collapsed: false },
      fields: [
        { name: 'chest', title: 'Chest (pit to pit)', type: 'number' },
        { name: 'length', title: 'Length', type: 'number' },
        { name: 'shoulder', title: 'Shoulder', type: 'number' },
        { name: 'sleeve', title: 'Sleeve', type: 'number' },
        { name: 'waist', title: 'Waist', type: 'number' },
        { name: 'hip', title: 'Hip', type: 'number' },
        { name: 'inseam', title: 'Inseam', type: 'number' },
        { name: 'rise', title: 'Rise', type: 'number' },
        { name: 'legOpening', title: 'Leg opening', type: 'number' },
      ],
    },
    {
      name: 'condition',
      title: 'Condition',
      type: 'string',
      options: {
        list: [
          { title: 'Near new', value: 'near_new' },
          { title: 'Very good', value: 'very_good' },
          { title: 'Good', value: 'good' },
          { title: 'Well-worn', value: 'well_worn' },
        ],
        layout: 'radio',
      },
    },
    {
      name: 'flaws',
      title: 'Flaws',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One line per flaw, e.g. "Small mark on left cuff (photo 5)". Leave empty if there are none.',
    },
    {
      name: 'brand',
      title: 'Brand',
      type: 'string',
    },
    {
      name: 'fabric',
      title: 'Fabric',
      type: 'string',
      description: 'e.g. 100% cotton denim',
    },
    {
      name: 'era',
      title: 'Era',
      type: 'string',
      description: 'e.g. 90s, Y2K, 2010s',
    },
    {
      name: 'badges',
      title: 'Badges',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'badge' }] }],
      description: 'Select one or more badges for this product'
    },
    {
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'gender',
      title: 'Gender',
      type: 'string',
      options: {
        list: [
          { title: 'Men', value: 'men' },
          { title: 'Women', value: 'women' },
          { title: 'Unisex', value: 'unisex' }
        ],
        layout: 'radio'
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Sold Out', value: 'sold_out' }
        ]
      },
      initialValue: 'available',
      validation: Rule => Rule.required()
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags'
      }
    },
    {
      name: 'whyThisPiece',
      title: 'Why This Piece',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Unique selling points for this product. Each item appears as a bullet point under "Why This Piece" on the product page.',
    }
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      status: 'status'
    },
    prepare(selection) {
      const { status } = selection
      return {
        ...selection,
        subtitle: status ? `[${status.toUpperCase()}]` : 'Draft'
      }
    }
  }
}
