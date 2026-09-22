import { SITE } from '../constants/site.js';
import { isOnlineCheckout } from '../constants/checkout.js';

/**
 * Store policies: Refund, Terms, Privacy.
 *
 * FILL THESE IN BEFORE LAUNCH. Every value in BUSINESS that still has
 * [square brackets] is a placeholder. Cashfree (and Razorpay) check these
 * pages during account activation, and the Consumer Protection (E-Commerce)
 * Rules 2020 require the seller's legal name, address and grievance officer
 * to be shown. Have a lawyer or CA review the final text. This is a
 * starting draft, not legal advice.
 */
export const BUSINESS = {
  legalName: 'Anish Bhoiya',
  address: 'Block A 23,Abhijyot Green Society, Satellite, Ahmedabad, Gujarat, India',
  gstin: '',
  grievanceOfficer: {
    name: 'Dev Soni',
    designation: 'Co-Founder',
    email: SITE.supportEmail,
    phone: SITE.whatsappNumber,
  },
  jurisdiction: 'Ahmedabad, Gujarat',
  paymentGateway: 'Cashfree Payments',
  courier: 'Shipmozo',
  // Refund-policy numbers: proposals; change them here and every page updates.
  claimWindow: '48 hours',
  measurementTolerance: '2 inches (5 cm)',
  refundDays: '7 working days',
  dispatchDays: '2-3 working days',
  deliveryDays: '3-10 working days',
  lateDeliveryDays: '16 days',
  lastUpdated: '22 September 2026',
};

const B = BUSINESS;
const support = `WhatsApp ${SITE.whatsappNumber} or email ${SITE.supportEmail}`;

/*
 * Each section: { heading, body?: string[], list?: string[], after?: string[] }
 */
export const POLICIES = {
  refund: {
    slug: 'refund',
    title: 'Refund & Cancellation Policy',
    shortTitle: 'Refunds',
    description:
      'No returns or exchanges on pre-loved, one-of-one pieces — plus exactly when we make it right: damaged, not as described, wrong piece or not delivered.',
    intro:
      'Every piece at Thriftonyte is pre-loved and one of one. There is no second size in the back, so we cannot take pieces back for fit or a change of mind. What we do instead is tell you everything before you buy, and stand behind that description.',
    sections: [
      {
        heading: 'All sales are final',
        body: [
          'We do not accept returns or exchanges for size, fit, colour preference or change of mind. Before you order, please check the listing carefully: each one has hand-taken measurements, a condition grade and photos of any flaws.',
          'If you are unsure about sizing, message us before buying and we will measure anything you need.',
        ],
      },
      {
        heading: 'When we make it right',
        body: ['You get a full refund, including shipping, if the piece:'],
        list: [
          'arrives damaged in transit;',
          `is not as described — a flaw that was not disclosed in the listing, or measurements that are off by more than ${B.measurementTolerance};`,
          'is not the piece you ordered;',
          `does not arrive, or arrives more than ${B.lateDeliveryDays} after dispatch without a reason we told you about.`,
        ],
        after: [
          'This applies no matter what the rest of this page says. It is your right under the Consumer Protection (E-Commerce) Rules, 2020.',
        ],
      },
      {
        heading: 'How to raise a claim',
        list: [
          `Contact us within ${B.claimWindow} of delivery on ${support}.`,
          'Include your order number, clear photos of the piece and the issue, and a photo of the packaging. An unboxing video helps a lot for transit damage.',
          'We reply within 1 working day. If the claim is accepted, we arrange a free pickup. Please keep the piece unworn and unwashed, with any tags it came with.',
        ],
      },
      {
        heading: 'Refund timeline',
        body: [
          `Once the piece reaches us and is checked, we refund the full amount, including shipping, to your original payment method within ${B.refundDays}. Your bank may take a few more days to show it.`,
        ],
      },
      {
        heading: 'Cancellations',
        list: [
          'You can cancel for a full refund any time before your order is dispatched. Message us with your order number.',
          'Once dispatched, the order cannot be cancelled. If it matches the listing, the all-sales-final rule applies.',
          'If two people pay for the same piece at the same moment, the second payment is refunded in full automatically and we will let you know.',
          'We may cancel an order that looks fraudulent or that we cannot deliver to. If we do, you get a full refund.',
        ],
      },
      {
        heading: 'Questions',
        body: [
          `Write to ${SITE.supportEmail} or message us on WhatsApp. For unresolved complaints, see the grievance officer details in our Terms.`,
        ],
      },
    ],
  },

  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    shortTitle: 'Terms',
    description:
      'The terms for buying from Thriftonyte: one-of-one pre-loved pieces, pricing, payments, shipping within India and how disputes are handled.',
    intro: `These terms apply when you use www.thriftonyte.com or buy from us. "Thriftonyte", "we" and "us" means ${B.legalName}, ${B.address}. By placing an order you agree to these terms.`,
    sections: [
      {
        heading: 'What we sell',
        list: [
          'Pre-loved, thrifted clothing and accessories. Most pieces have been worn before and may show normal signs of use.',
          'Each listing is a single, one-of-one piece. We describe condition, measurements and any flaws as accurately as we can, and photograph the actual piece you will receive.',
          'Colours can look slightly different on different screens.',
        ],
      },
      {
        heading: 'Prices and payment',
        list: [
          'All prices are in Indian Rupees (INR) and include applicable taxes unless shown otherwise. Shipping charges, if any, are shown before you pay.',
          isOnlineCheckout
            ? `Payments are processed securely by ${B.paymentGateway}. We never see or store your card, UPI or bank details.`
            : 'Orders are placed over WhatsApp: we confirm the piece is still available and share payment details there. We will never ask for your card number, UPI PIN, OTP or any password.',
          isOnlineCheckout
            ? 'An order is confirmed only once payment succeeds. Adding a piece to your cart does not reserve it.'
            : 'An order is confirmed only once payment reaches us. Adding a piece to your cart, or messaging us about it, does not reserve it.',
          'If two customers pay for the same piece at the same time, the first successful payment gets it and the other is refunded in full.',
          'If a price is shown incorrectly because of an obvious error, we may cancel the order and refund you in full.',
        ],
      },
      {
        heading: 'Shipping',
        list: [
          `We currently ship within India only. Orders are dispatched within ${B.dispatchDays} and usually arrive in ${B.deliveryDays}, depending on your location.`,
          `Orders are shipped with ${B.courier}. We share tracking details on WhatsApp or email once dispatched.`,
          'Please make sure your address and phone number are correct. If a parcel comes back because of a wrong address or repeated failed delivery attempts, we will refund the price of the piece minus the shipping costs.',
        ],
      },
      {
        heading: 'Returns and refunds',
        body: [
          'All sales are final, with the exceptions in our Refund & Cancellation Policy — damaged, not as described, wrong item or not delivered. That policy forms part of these terms.',
        ],
        link: { to: '/policies/refund', label: 'Read the Refund & Cancellation Policy' },
      },
      {
        heading: 'Your account and conduct',
        list: [
          'Give accurate details when ordering. You are responsible for anything done with your contact details on our site.',
          'Do not misuse the site: no scraping, automated ordering, reselling our photos or content, or trying to break its security.',
        ],
      },
      {
        heading: 'Content and intellectual property',
        body: [
          'Photos, text, logos and design on this site belong to Thriftonyte or are used with permission. Please do not copy them without asking. Brand names shown on listings belong to their owners; we are not affiliated with them unless stated.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent the law allows, our total liability for any order is limited to the amount you paid for it. We are not liable for indirect losses. Nothing in these terms limits rights you have under Indian consumer protection law.',
        ],
      },
      {
        heading: 'Grievance officer',
        body: [
          'In line with the Consumer Protection (E-Commerce) Rules, 2020, complaints can be sent to our grievance officer. We acknowledge complaints within 48 hours and aim to resolve them within one month.',
        ],
        list: [
          `Name: ${B.grievanceOfficer.name}`,
          `Designation: ${B.grievanceOfficer.designation}`,
          `Email: ${B.grievanceOfficer.email}`,
          `Phone / WhatsApp: ${B.grievanceOfficer.phone}`,
          `Address: ${B.address}`,
        ],
      },
      {
        heading: 'Governing law',
        body: [
          `These terms are governed by the laws of India. Disputes are subject to the courts in ${B.jurisdiction}, without affecting your right to approach a consumer commission where you live.`,
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We may update these terms from time to time. The version on this page when you place an order is the one that applies to that order.',
        ],
      },
    ],
  },

  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    description:
      'What personal data Thriftonyte collects, why, who we share it with, and how to access, correct or delete it.',
    intro: `This policy explains how ${B.legalName} ("Thriftonyte") handles your personal data, in line with India's Digital Personal Data Protection Act, 2023. Short version: we collect only what we need to deliver your order and talk to you, we never sell it, and you can ask us to delete it.`,
    sections: [
      {
        heading: 'What we collect',
        list: [
          'Order details: your name, phone number, email, shipping address and what you bought.',
          'Messages you send us on WhatsApp, email or Instagram.',
          'Your email address, if you join our newsletter.',
          isOnlineCheckout
            ? 'Payment status from our payment gateway: whether it succeeded, the amount and a transaction ID. We never receive your card, UPI PIN or bank login.'
            : 'Proof of payment you send us, such as a UPI reference number or a screenshot. We never receive your card details, UPI PIN or bank login.',
          'Basic technical data such as browser type and pages visited, collected by our hosting provider to keep the site running and secure.',
        ],
      },
      {
        heading: 'Why we use it',
        list: [
          'To process, ship and support your order, including refunds and claims.',
          'To reply when you contact us.',
          'To send the newsletter, only if you signed up. Every email has an unsubscribe link.',
          'To prevent fraud and meet legal, tax and accounting obligations.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: ['We share only what each service needs to do its job:'],
        list: [
          ...(isOnlineCheckout ? [`${B.paymentGateway} — to process payments.`] : []),
          `${B.courier} — your name, address and phone number, to deliver your parcel.`,
          'Vercel — hosts this website.',
          isOnlineCheckout
            ? 'Sanity — stores our product catalogue and your order record, in a private area that is not publicly accessible.'
            : 'Sanity — stores our product catalogue (it holds no customer details while orders run on WhatsApp).',
          'Google (Gmail) — sends order confirmations and replies to your emails.',
          'Brevo — sends our newsletter, only if you sign up.',
          'WhatsApp (Meta) — if you choose to message us there.',
        ],
        after: [
          'We do not sell or rent your data, and we do not share it for advertising. We may disclose it if the law requires us to.',
        ],
      },
      {
        heading: 'Cookies and storage',
        body: [
          'We do not use advertising or cross-site tracking cookies. Your cart is saved in your own browser (local storage) so it is still there when you come back. You can clear it at any time from your browser settings.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'We keep order records for as long as tax and accounting law requires (generally up to 8 years). Newsletter data is kept until you unsubscribe. Chat messages are deleted when they are no longer needed to support an order.',
        ],
      },
      {
        heading: 'Your rights',
        body: ['You can ask us to:'],
        list: [
          'tell you what personal data we hold about you;',
          'correct or update it;',
          'delete it, unless we have to keep it by law;',
          'stop sending you marketing emails.',
        ],
        after: [
          `Email ${SITE.supportEmail} from the address you used with us and we will respond within 30 days. If you are not satisfied, you can contact our grievance officer (details in our Terms) or the Data Protection Board of India.`,
        ],
      },
      {
        heading: 'Security',
        body: [
          'The site is served over HTTPS, payments are handled by a PCI-DSS compliant gateway, and access to order data is limited to the people who run Thriftonyte.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'Thriftonyte is not meant for children under 18 to buy from without a parent or guardian. We do not knowingly collect data from children.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'If we change this policy, we will update the date at the top of this page. Significant changes will be highlighted on the site.',
        ],
      },
    ],
  },
};

export const POLICY_LIST = [POLICIES.refund, POLICIES.terms, POLICIES.privacy];
