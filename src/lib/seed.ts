import "server-only";
import { db } from "@/db";
import { categories, products, users, settings, discountCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`;

const CATEGORY_SEED = [
  { name: "Jeans", slug: "jeans", description: "Skinny, slim-fit, straight-leg and baggy jeans.", image: px(31988321) },
  { name: "Trousers", slug: "trousers", description: "Corporate, casual, chinos and fitted trousers.", image: "/images/trousers.jpg" },
  { name: "T-Shirts", slug: "t-shirts", description: "Plain, graphic, oversized and designer-style tees.", image: px(10522551) },
  { name: "Polo Shirts", slug: "polo-shirts", description: "Classic and modern polo shirts.", image: px(7037555) },
  { name: "Casual Shirts", slug: "casual-shirts", description: "Relaxed shirts for everyday style.", image: px(10004179) },
  { name: "Formal Shirts", slug: "formal-shirts", description: "Crisp shirts for the office and events.", image: px(18320058) },
  { name: "Hoodies & Sweatshirts", slug: "hoodies-sweatshirts", description: "Streetwear essentials.", image: px(15127546) },
  { name: "Two-Piece Sets", slug: "two-piece-sets", description: "Coordinated sets, effortless style.", image: "/images/two-piece.jpg" },
  { name: "Native Wear & Senator", slug: "native-wear", description: "Senator outfits, kaftans and agbada.", image: px(34362606) },
  { name: "Shorts", slug: "shorts", description: "Chino, denim and sport shorts.", image: "/images/shorts.jpg" },
  { name: "Shoes & Sneakers", slug: "shoes-sneakers", description: "Sneakers, loafers and dress shoes.", image: px(18972408) },
  { name: "Accessories", slug: "accessories", description: "Belts, caps, wallets and wristwatches.", image: px(11263067) },
  { name: "Underwear", slug: "underwear", description: "Premium cotton boxers and briefs.", image: "/images/underwear.jpg" },
];

const S = ["S", "M", "L", "XL", "XXL"];
const W = ["30", "32", "34", "36", "38"];
const SH = ["40", "41", "42", "43", "44", "45"];

type P = {
  name: string; cat: string; price: number; discountPrice?: number; images: string[];
  sizes: string[]; colors: string[]; stock: number; featured?: boolean; sold?: number; desc: string;
};

const PRODUCT_SEED: P[] = [
  { name: "Midnight Slim-Fit Jeans", cat: "jeans", price: 28500, discountPrice: 24500, images: [px(31988321), px(2229712)], sizes: W, colors: ["Dark Blue", "Black"], stock: 24, featured: true, sold: 142, desc: "Premium stretch denim in a flattering slim cut. Tapered through the leg with reinforced stitching for everyday durability." },
  { name: "Distressed Straight-Leg Jeans", cat: "jeans", price: 32000, images: [px(4258605), px(10004179)], sizes: W, colors: ["Light Blue"], stock: 15, sold: 88, desc: "Relaxed straight-leg jeans with subtle distressing. Pairs perfectly with sneakers and a crisp tee." },
  { name: "Baggy Denim Jeans", cat: "jeans", price: 30000, images: [px(28938765), px(19971478)], sizes: W, colors: ["Washed Blue", "Grey"], stock: 12, sold: 54, desc: "Loose-fit 90s-inspired baggy jeans. Heavyweight denim with a comfortable high rise." },
  { name: "Skinny Black Jeans", cat: "jeans", price: 26000, images: [px(15140389), px(13651809)], sizes: W, colors: ["Black"], stock: 30, sold: 97, desc: "Sleek skinny-fit jeans in jet black. Super-stretch fabric that keeps its shape all day." },
  { name: "Charcoal Corporate Trousers", cat: "trousers", price: 24000, images: ["/images/trousers.jpg", px(18320058)], sizes: W, colors: ["Charcoal", "Navy", "Black"], stock: 20, featured: true, sold: 120, desc: "Tailored corporate trousers with a slim silhouette. Wrinkle-resistant fabric ideal for the office." },
  { name: "Sand Chino Trousers", cat: "trousers", price: 21000, discountPrice: 18500, images: [px(7037535), px(36701792)], sizes: W, colors: ["Sand", "Olive", "Navy"], stock: 18, sold: 76, desc: "Versatile cotton chinos with a modern tapered fit. Dress them up or down." },
  { name: "Fitted Casual Trousers", cat: "trousers", price: 19500, images: [px(35181256), px(7037535)], sizes: W, colors: ["Grey", "Black"], stock: 4, sold: 41, desc: "Soft-touch fitted trousers for weekend comfort with a clean, sharp look." },
  { name: "Essential Plain Tee", cat: "t-shirts", price: 8500, images: [px(24779116), px(8217533)], sizes: S, colors: ["White", "Black", "Grey", "Navy"], stock: 60, featured: true, sold: 310, desc: "Heavyweight 220gsm cotton tee with a structured fit. The foundation of every wardrobe." },
  { name: "Oversized Graphic Tee", cat: "t-shirts", price: 12000, discountPrice: 9500, images: [px(13794572), px(10522551)], sizes: S, colors: ["Black", "Off-White"], stock: 35, sold: 156, desc: "Drop-shoulder oversized tee with a bold printed graphic. Streetwear staple." },
  { name: "Designer-Style Crew Tee", cat: "t-shirts", price: 15000, images: [px(9558581), px(13651809)], sizes: S, colors: ["Black", "Navy"], stock: 22, sold: 64, desc: "Luxury-inspired crew neck tee with embroidered chest detail and premium finish." },
  { name: "Classic Pique Polo", cat: "polo-shirts", price: 14500, images: [px(7037555), px(17898556)], sizes: S, colors: ["Blue", "White", "Black", "Burgundy"], stock: 40, featured: true, sold: 198, desc: "Breathable pique cotton polo with ribbed collar and cuffs. Smart-casual perfection." },
  { name: "Striped Luxury Polo", cat: "polo-shirts", price: 16500, discountPrice: 13900, images: [px(17781293), px(7037535)], sizes: S, colors: ["Navy Stripe", "Green Stripe"], stock: 16, sold: 72, desc: "Fine-knit striped polo with a tailored cut and mother-of-pearl buttons." },
  { name: "Denim Casual Shirt", cat: "casual-shirts", price: 18000, images: [px(10004179), px(19971478)], sizes: S, colors: ["Light Denim", "Dark Denim"], stock: 14, sold: 59, desc: "Washed denim shirt with chest pockets. Wear open over a tee or buttoned up." },
  { name: "Linen Weekend Shirt", cat: "casual-shirts", price: 17500, images: [px(36701792), px(35181256)], sizes: S, colors: ["White", "Sky Blue", "Beige"], stock: 25, sold: 83, desc: "Lightweight linen-blend shirt designed for Lagos heat. Relaxed fit, breathable." },
  { name: "Crisp White Formal Shirt", cat: "formal-shirts", price: 19000, images: [px(24425367), px(18320058)], sizes: S, colors: ["White"], stock: 30, featured: true, sold: 171, desc: "Non-iron cotton formal shirt with a spread collar. Boardroom-ready." },
  { name: "Executive Black Dress Shirt", cat: "formal-shirts", price: 21000, discountPrice: 17500, images: [px(17685843), px(6146061)], sizes: S, colors: ["Black", "Navy"], stock: 18, sold: 93, desc: "Slim-fit dress shirt in deep black with French placket. Sharp, modern, confident." },
  { name: "Heavyweight Black Hoodie", cat: "hoodies-sweatshirts", price: 22000, images: [px(15127546), px(34582210)], sizes: S, colors: ["Black", "Grey"], stock: 28, featured: true, sold: 134, desc: "400gsm brushed-fleece hoodie with kangaroo pocket and double-lined hood." },
  { name: "Essential Crewneck Sweatshirt", cat: "hoodies-sweatshirts", price: 18500, discountPrice: 15500, images: [px(10326143), px(5692478)], sizes: S, colors: ["Cream", "Black", "Forest Green"], stock: 20, sold: 67, desc: "Classic crewneck sweatshirt in soft loopback cotton. Relaxed fit." },
  { name: "Signature Red Hoodie", cat: "hoodies-sweatshirts", price: 23000, images: [px(10801614), px(16581723)], sizes: S, colors: ["Red"], stock: 3, sold: 45, desc: "Bold statement hoodie in a rich red. Limited quantities." },
  { name: "Black Linen Two-Piece Set", cat: "two-piece-sets", price: 38000, discountPrice: 32000, images: ["/images/two-piece.jpg"], sizes: S, colors: ["Black", "Beige", "White"], stock: 12, featured: true, sold: 89, desc: "Matching short-sleeve shirt and trousers in breathable linen. Effortless coordinated style." },
  { name: "Tracksuit Two-Piece Set", cat: "two-piece-sets", price: 34000, images: [px(5692478), px(11791453)], sizes: S, colors: ["Grey", "Black"], stock: 10, sold: 52, desc: "Premium tracksuit set with zip jacket and tapered joggers." },
  { name: "Classic Senator Outfit", cat: "native-wear", price: 45000, images: [px(34362606), px(35533363)], sizes: [...S, "Custom"], colors: ["Beige", "White", "Black", "Navy"], stock: 15, featured: true, sold: 112, desc: "Tailored senator outfit with embroidered neckline. Made from premium cashmere-blend fabric. Custom sizing available." },
  { name: "Royal Kaftan", cat: "native-wear", price: 52000, discountPrice: 46000, images: [px(34735729), px(35013625)], sizes: [...S, "Custom"], colors: ["Sky Blue", "White", "Gold"], stock: 8, sold: 61, desc: "Elegant kaftan with intricate embroidery. Perfect for owambe and special occasions." },
  { name: "Embroidered Agbada Set", cat: "native-wear", price: 85000, images: [px(37938908), px(34275056)], sizes: [...S, "Custom"], colors: ["Gold", "White", "Wine"], stock: 6, sold: 38, desc: "Three-piece agbada with hand-finished embroidery. A statement of class." },
  { name: "Khaki Chino Shorts", cat: "shorts", price: 12500, images: ["/images/shorts.jpg"], sizes: W, colors: ["Khaki", "Navy", "Black"], stock: 25, sold: 74, desc: "Tailored above-the-knee chino shorts. Lightweight cotton twill." },
  { name: "Denim Shorts", cat: "shorts", price: 13500, discountPrice: 11000, images: [px(18139574)], sizes: W, colors: ["Light Blue"], stock: 14, sold: 43, desc: "Relaxed-fit denim shorts with a clean raw hem." },
  { name: "Noir Leather Sneakers", cat: "shoes-sneakers", price: 42000, images: [px(18972408), px(5223777)], sizes: SH, colors: ["Black"], stock: 16, featured: true, sold: 128, desc: "Minimalist leather sneakers with cushioned insole. Versatile and timeless." },
  { name: "Suede Low-Top Sneakers", cat: "shoes-sneakers", price: 38000, discountPrice: 33000, images: [px(8159359), px(7926150)], sizes: SH, colors: ["Black", "Brown"], stock: 11, sold: 66, desc: "Soft suede upper with contrast white sole. Everyday luxury." },
  { name: "Street Runner Sneakers", cat: "shoes-sneakers", price: 45000, images: [px(9692148), px(12740490)], sizes: SH, colors: ["Blue", "Yellow", "Orange"], stock: 9, sold: 81, desc: "Lightweight performance-inspired sneakers with a bold colourway." },
  { name: "Classic Leather Belt", cat: "accessories", price: 9500, images: [px(11263089), px(11263067)], sizes: ["32", "34", "36", "38", "40"], colors: ["Brown", "Black"], stock: 40, sold: 156, desc: "Full-grain leather belt with brushed gold buckle." },
  { name: "Minimalist Wristwatch", cat: "accessories", price: 35000, discountPrice: 29500, images: [px(13695978), px(9221906)], sizes: ["One Size"], colors: ["Black/Gold", "Silver"], stock: 12, featured: true, sold: 94, desc: "Slim-profile analogue wristwatch with sapphire glass and leather strap." },
  { name: "Slim Leather Wallet", cat: "accessories", price: 12000, images: [px(9807760), px(28242214)], sizes: ["One Size"], colors: ["Brown", "Black"], stock: 2, sold: 118, desc: "Slim bifold wallet with 6 card slots and RFID protection." },
  { name: "Premium Boxer Briefs (3-Pack)", cat: "underwear", price: 9000, images: ["/images/underwear.jpg"], sizes: S, colors: ["Black", "Mixed"], stock: 50, sold: 203, desc: "Three-pack of breathable cotton-modal boxer briefs with brand-trim waistband." },
];

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((e) => {
      seedPromise = null;
      console.error("Seed failed", e);
    });
  }
  return seedPromise;
}

async function runSeed() {
  const existing = await db.select().from(settings).where(eq(settings.key, "seeded")).limit(1);
  if (existing.length) return;

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@store.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  const adminExists = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (!adminExists.length) {
    await db.insert(users).values({
      name: "Store Owner",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
      phone: "+2348012345678",
    });
  }

  // Categories
  const catMap = new Map<string, number>();
  for (let i = 0; i < CATEGORY_SEED.length; i++) {
    const c = CATEGORY_SEED[i];
    const [row] = await db
      .insert(categories)
      .values({ ...c, sortOrder: i })
      .onConflictDoUpdate({ target: categories.slug, set: { image: c.image } })
      .returning({ id: categories.id });
    catMap.set(c.slug, row.id);
  }

  // Products
  for (let i = 0; i < PRODUCT_SEED.length; i++) {
    const p = PRODUCT_SEED[i];
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    await db
      .insert(products)
      .values({
        name: p.name,
        slug,
        description: p.desc,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        categoryId: catMap.get(p.cat) ?? null,
        images: p.images,
        sizes: p.sizes,
        colors: p.colors,
        stock: p.stock,
        featured: Boolean(p.featured),
        isNewArrival: i % 3 === 0,
        soldCount: p.sold ?? 0,
        createdAt: new Date(Date.now() - i * 36e5),
      })
      .onConflictDoNothing();
  }

  await db
    .insert(discountCodes)
    .values([
      { code: "WELCOME10", type: "percent", value: 10, minOrder: 20000 },
      { code: "NAIJA5K", type: "fixed", value: 5000, minOrder: 50000 },
    ])
    .onConflictDoNothing();

  await db.insert(settings).values({ key: "seeded", value: new Date().toISOString() }).onConflictDoNothing();
}
