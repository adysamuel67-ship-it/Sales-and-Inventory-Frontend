import type { PdfSection } from '@/lib/pdf'

/**
 * The how-it-works guide, kept as data so the on-screen summary and the
 * downloadable PDF can never drift apart.
 *
 * Every statement here was checked against the backend rather than guessed:
 *
 * - add_sale() refuses a sale whose quantity exceeds stock, then decrements
 *   each product by the quantity sold.
 * - delete_sale() walks the sale's line items and adds each quantity back to the
 *   product, so stock returns to exactly where it was before the sale.
 * - update_sale() restores every old line item to stock first, then deducts the
 *   new lines, so editing quantities nets out correctly.
 * - Any sale leaving amount_paid below the total creates a Debt linked by
 *   sale_id; a fully paid sale creates none. Deleting the sale deletes the
 *   debt's transactions.
 * - Debts settle oldest-first in update_customer_with_debt().
 */

export const GUIDE_SECTIONS: PdfSection[] = [
  {
    heading: '1. Recording a sale',
    body: [
      'Every sale is a list of products and quantities. The system checks your stock before saving, so you can never sell more than you actually have.',
      'Stock is reduced the moment the sale is saved. If a sale cannot go through, nothing changes - you are not left with a half-finished sale.',
    ],
    bullets: [
      'Choose the products and enter how many of each you are selling.',
      'Pick the payment method: cash, mobile money or card.',
      'Mark it fully paid, or enter part payment to put the rest on credit.',
    ],
  },
  {
    heading: '2. Credit sales and debts',
    body: [
      'If the amount paid is less than the total, the difference becomes a debt. You must select a customer when this happens, because the debt is tracked against them, not the sale.',
      'A debt is linked to the sale that created it, so the two always move together. If the sale is removed, its payment history goes with it.',
      'When you record a payment against a customer, the oldest unpaid debt is settled first. Pay off debts in order and your ledger stays honest.',
    ],
    bullets: [
      'Fully paid sales create no debt at all.',
      'Debt defaults to being due 30 days after the sale unless you set another date.',
      'Selling on credit without choosing a customer is rejected, on purpose.',
    ],
  },
  {
    heading: '3. Editing a sale',
    body: [
      'Editing is safe. The old items are put back into stock first, then the new items are taken out, so your stock count always ends up correct no matter how much you changed.',
      'If you change the items or the amount paid, the debt is recalculated. Raising the amount paid above the total removes the debt completely. Lowering it below the total creates or updates one.',
      'An edit that would leave a balance with no customer attached is rejected, so a debt can never end up ownerless.',
    ],
    bullets: [
      'Changing a quantity does not double-count stock.',
      'Setting the sale to fully paid clears any remaining debt.',
      'You can set the date the debt is due while editing.',
    ],
  },
  {
    heading: '4. Deleting a sale - stock comes back',
    body: [
      'This is the part worth knowing. When you delete a sale, every item on it is returned to stock exactly as it was before the sale was recorded.',
      'If you sold 10 of a product and delete that sale, the 10 reappear in your inventory. If you sold 3 units across two different products, both quantities are added back separately.',
      'Any payment history attached to the sale is removed with it. This is why deleting a sale is a clean undo rather than a partial one - but it also means the record of those payments is gone, so check the figures first.',
    ],
    bullets: [
      'Product quantities are restored, not just adjusted down.',
      'Debt linked to the deleted sale is cleaned up too.',
      'Deleting is permanent - there is no undo button.',
    ],
  },
  {
    heading: '5. Products and stock',
    body: [
      'Products hold your stock level, selling price and cost price. Profit on every sale is worked out for you from the difference between the two prices, so your reports are accurate without any extra work.',
      'Deactivating a product hides it from new sales but keeps all its history. Existing sales and reports stay intact.',
      'Products running low are flagged on your dashboard so you can restock before you run out.',
    ],
    bullets: [
      'A product must be active to be sold.',
      'Deleting a product is not the same as deactivating it - deactivate to keep your history.',
      'Profit is calculated per line item, so multi-item sales total correctly.',
    ],
  },
  {
    heading: '6. Customers',
    body: [
      'Customers keep track of who owes what. Each one has a balance built from the debts recorded against them.',
      'A phone number is what makes reminders possible. Without one, a customer can still hold a debt, but you will not be able to send them an SMS.',
    ],
    bullets: [
      'Save a phone number early - it takes seconds and enables reminders.',
      'One customer can carry several debts over time.',
      'Payments reduce the oldest unpaid debt first.',
    ],
  },
  {
    heading: '7. Debt reminders by SMS',
    body: [
      'Schedule a reminder against a balance and the message is written for you, with the amount and the due date already filled in. You review it before it is saved.',
      'The message goes out on the day you chose. Once it has been sent, the reminder is marked as delivered and will not send a second time.',
      'Pausing a reminder keeps it from firing without deleting it, so you can resume it later.',
      'A reminder for a debt that has already been paid off is not needed - the system knows the balance was cleared.',
    ],
    bullets: [
      'The message preview shows exactly what the customer will receive.',
      'Customers without a phone number cannot receive reminders.',
      'Only managers and administrators can schedule reminders.',
    ],
  },
  {
    heading: '8. Reports',
    body: [
      'Reports show revenue, profit and units sold for any period you choose, along with a ranked list of your best selling products.',
      'The SMS report sends a summary of these figures to your phone on a daily, weekly or monthly schedule.',
    ],
    bullets: [
      'Pick a range from the presets, or set your own dates.',
      'Best sellers are ranked by units sold over the period.',
      'The SMS report goes to admins and managers who have a phone number saved.',
    ],
  },
  {
    heading: '9. If an SMS report does not arrive',
    body: [
      'The daily, weekly and monthly reports are produced on a schedule and delivered to every admin and manager who has a phone number on file.',
      'If a report is not arriving, the most common cause is a missing phone number on the account receiving it. Check Settings first.',
    ],
  },
]

/** Short bullet list for the on-screen onboarding card. */
export const GUIDE_HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: 'Deleting a sale puts stock back',
    body: 'Every item on a deleted sale returns to your inventory exactly as it was.',
  },
  {
    title: 'Editing never double-counts',
    body: 'Old items are returned to stock and the new ones taken, so quantities stay correct.',
  },
  {
    title: 'Credit sales create a debt',
    body: 'Pay less than the total and the balance is tracked against the customer.',
  },
  {
    title: 'Reminders are written for you',
    body: 'Schedule one and the amount and due date are already filled in.',
  },
]

/** Filename used for the download. */
export const GUIDE_FILENAME = 'business-bot-gh-how-it-works.pdf'