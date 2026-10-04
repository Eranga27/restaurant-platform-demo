import type { Brand } from "@/config/brand";

/**
 * Policy text. A starting template for a Sri Lankan restaurant, written for the
 * fictional demo brand. It is not legal advice: a client must have their own
 * policies reviewed before launch (PayHere requires these pages to be live).
 *
 * English only for now; translations would follow review (docs/PLAN.md Phase 7).
 */

export type LegalSection = { heading: string; body: string[] };
export type LegalDocument = { updated: string; intro: string; sections: LegalSection[] };

const UPDATED = "2026-10-04";

export function privacyPolicy(brand: Brand): LegalDocument {
  const { name, contact } = brand;
  return {
    updated: UPDATED,
    intro: `${name} respects your privacy. This policy explains what personal data we collect when you use our website, order food or book with us, why we collect it, and the choices you have. It is written to meet Sri Lanka's Personal Data Protection Act, No. 9 of 2022.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Contact details: your name, mobile number and email address, so we can confirm and deliver your order or booking.",
          "Delivery details: your address, landmark and the map pin you choose, so our riders can find you.",
          "Order and booking history, including what you ordered, from which branch, and how you paid.",
          "Payment status only. Card and wallet payments are handled entirely by PayHere on its own secure page. We never see or store your card number.",
          "Basic technical data such as your browser type and pages visited, used to keep the site secure and working.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To take, prepare, deliver and support your orders and bookings (performing our contract with you).",
          "To send you order updates and receipts, and, only if you agree, offers and news. You can withdraw that consent at any time.",
          "To prevent fraud and abuse, keep records required by law, and improve our service (our legitimate interests and legal obligations).",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "The branch preparing your order, and its delivery riders.",
          "Service providers who act on our instructions: PayHere (payments), our hosting and database providers, and our email provider. Some of these process data outside Sri Lanka; we only use providers that protect it to an adequate standard.",
          "Authorities, when the law requires it.",
          "We do not sell your personal data.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use only the cookies the site needs to work: keeping you signed in, remembering your language and branch, and protecting forms from bots. We do not use advertising cookies.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Order and payment records are kept for as long as tax and accounting law requires. Account details are kept while your account is open and deleted or anonymised afterwards. Guest checkout details are kept only as long as needed to complete and support the order.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask to see the personal data we hold about you, have it corrected, have it erased, withdraw consent, or object to how we use it. Contact us using the details below and we will respond within the time the Act requires.",
          "If you are not satisfied with our response, you may complain to the Data Protection Authority of Sri Lanka.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Data is encrypted in transit, access is limited to staff who need it, and staff accounts are protected with two-factor authentication.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about this policy or your data: ${contact.email}.`],
      },
    ],
  };
}

export function termsOfService(brand: Brand): LegalDocument {
  const { name, charges } = brand;
  const service = charges.serviceChargeBps / 100;
  return {
    updated: UPDATED,
    intro: `These terms apply when you use the ${name} website to browse our menu, order food or make a booking. By placing an order you agree to them.`,
    sections: [
      {
        heading: "Orders",
        body: [
          "An order is confirmed once the branch accepts it. You'll see this on your order tracking page. A branch may decline an order, for example when an item has sold out or the address is outside its delivery area; if you have already paid, you will be refunded in full.",
          "Delivery times are estimates. Traffic and weather in Sri Lanka can be unpredictable, and we will keep you updated.",
        ],
      },
      {
        heading: "Prices and charges",
        body: [
          `Menu prices are in Sri Lankan rupees. A ${service}% service charge and VAT at the prevailing rate are added to your bill, along with any delivery fee. Every charge is shown before you pay.`,
          "Prices can differ slightly between branches and may change without notice, but the price confirmed at checkout is the price you pay.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "You can pay with cash on delivery, or by card or mobile wallet through PayHere. Online payments are processed by PayHere under its own terms.",
        ],
      },
      {
        heading: "Allergies and dietary information",
        body: [
          "We mark dishes that are vegetarian, vegan, halal or contain nuts. Our kitchens handle nuts, dairy, gluten, eggs, fish and shellfish, and we cannot guarantee any dish is free of traces. If you have a serious allergy, please call the branch before ordering.",
        ],
      },
      {
        heading: "Alcohol",
        body: [
          "Alcohol is sold only to customers aged 21 and over, and is not sold on Poya days. Riders may ask for ID and may refuse to hand over alcohol.",
        ],
      },
      {
        heading: "Accounts and acceptable use",
        body: [
          "Keep your login details private. Please don't misuse the website: no false orders, automated scraping or attempts to break its security.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Nothing in these terms limits rights you have under Sri Lanka's Consumer Affairs Authority Act. Otherwise, our liability for any order is limited to the amount you paid for it.",
        ],
      },
      {
        heading: "Governing law",
        body: ["These terms are governed by the laws of Sri Lanka."],
      },
    ],
  };
}

export function refundPolicy(brand: Brand): LegalDocument {
  const { contact } = brand;
  return {
    updated: UPDATED,
    intro:
      "We want every meal to arrive right. This policy explains when you can cancel an order and how refunds work.",
    sections: [
      {
        heading: "Cancelling an order",
        body: [
          "You can cancel free of charge until the branch accepts your order. After that, the kitchen has usually started cooking, so please call the branch: we'll do our best, but we may not be able to refund food that has been prepared.",
        ],
      },
      {
        heading: "Problems with your order",
        body: [
          "If something is missing, wrong or not up to standard, contact the branch within 24 hours with your order number, and a photo if you can. We will replace the item or refund it.",
        ],
      },
      {
        heading: "How refunds are paid",
        body: [
          "Card and wallet payments are refunded through PayHere to the original payment method. Banks usually take 5 to 10 working days to show the refund.",
          "Cash on delivery orders are refunded in cash at the branch or by bank transfer, whichever you prefer.",
        ],
      },
      {
        heading: "Orders we decline",
        body: [
          "If a branch declines your order or cannot deliver it, any online payment is refunded in full automatically.",
        ],
      },
      {
        heading: "Event and catering deposits",
        body: [
          "Deposits for events and catering are refundable in full up to 14 days before the event, 50% up to 7 days before, and not refundable after that, unless we cancel.",
        ],
      },
      {
        heading: "Contact",
        body: [`Refund questions: ${contact.email}, or call the branch you ordered from.`],
      },
    ],
  };
}
