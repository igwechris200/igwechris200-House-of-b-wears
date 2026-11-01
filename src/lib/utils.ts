export function formatNaira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString("en-NG");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function effectivePrice(p: {
  price: number;
  discountPrice: number | null;
}): number {
  return p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price
    ? p.discountPrice
    : p.price;
}

export function discountPercent(p: {
  price: number;
  discountPrice: number | null;
}): number {
  if (!p.discountPrice || p.discountPrice >= p.price) return 0;
  return Math.round(((p.price - p.discountPrice) / p.price) * 100);
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MF${y}${m}-${rand}`;
}

export function parseList(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export function statusColor(status: string): string {
  switch (status) {
    case "delivered":
    case "successful":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "shipped":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "processing":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
  }
}
