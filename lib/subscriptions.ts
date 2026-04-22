export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type SubscriptionStatus = 'active' | 'canceling' | 'canceled';

export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'productivity'
  | 'shopping'
  | 'gaming'
  | 'fitness'
  | 'cloud'
  | 'ai'
  | 'finance'
  | 'utilities'
  | 'other';

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  provider: string | null;
  amount: number;
  currency_code: string;
  billing_cycle: BillingCycle;
  renewal_date: string;
  reminder_days: number[];
  status: SubscriptionStatus;
  category: SubscriptionCategory;
  notes: string | null;
  cancellation_url: string | null;
  is_trial: boolean;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export const billingCycleLabels: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export const categoryLabels: Record<SubscriptionCategory, string> = {
  streaming: 'Streaming',
  music: 'Music',
  productivity: 'Productivity',
  shopping: 'Shopping',
  gaming: 'Gaming',
  fitness: 'Fitness',
  cloud: 'Cloud',
  ai: 'AI',
  finance: 'Finance',
  utilities: 'Utilities',
  other: 'Other',
};

export const categoryAccent: Record<SubscriptionCategory, string> = {
  streaming: '#FECACA',
  music: '#DDD6FE',
  productivity: '#FDE68A',
  shopping: '#FBCFE8',
  gaming: '#C7D2FE',
  fitness: '#BFDBFE',
  cloud: '#BAE6FD',
  ai: '#D9F99D',
  finance: '#A7F3D0',
  utilities: '#E5E7EB',
  other: '#D1FAE5',
};

export const billingCycleOptions = Object.keys(billingCycleLabels) as BillingCycle[];
export const categoryOptions = Object.keys(categoryLabels) as SubscriptionCategory[];

export function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

export function formatRenewalDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function monthlyEquivalent(subscription: Subscription) {
  const amount = Number(subscription.amount);

  switch (subscription.billing_cycle) {
    case 'weekly':
      return amount * 52 / 12;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    case 'custom':
      return amount;
    default:
      return amount;
  }
}
