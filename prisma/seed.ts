import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed DEBO — maison de Clarisse Debost, lapidaire.
 * Catalogue : perles de culture facettées, pierres précieuses taillées et
 * pièces montées (pièces disponibles). Le sur-mesure et la haute joaillerie
 * sont représentés par un exemple de configuration et de demande.
 *
 * Idempotent (upserts). Lancer avec : npm run db:seed
 */
const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@debo.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";

const CATEGORIES = [
  {
    name: "Perles facettées",
    slug: "perles-facettees",
    description: "Perles de culture facettées — la signature de la maison.",
  },
  {
    name: "Pierres précieuses",
    slug: "pierres-precieuses",
    description: "Pierres précieuses taillées à la main.",
  },
  {
    name: "Pièces disponibles",
    slug: "pieces-disponibles",
    description: "Créations montées, prêtes à être offertes.",
  },
  {
    name: "Haute joaillerie",
    slug: "haute-joaillerie",
    description: "Pièces uniques, façonnées d'après vos inspirations.",
  },
];

// Prix en minor units (centimes d'euro).
const CATALOG: Array<{
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  isFeatured: boolean;
  categorySlug: string;
  images: string[];
  colors: string[];
  sizes: string[] | null; // diamètre (mm) / carats / tour de doigt
}> = [
  {
    name: "Lune Facettée",
    slug: "perle-lune-facettee",
    description:
      "Perle de culture facettée à la main, taille brillant signature. Chaque facette capte et restitue la lumière, révélant la nacre comme une pierre vivante.",
    basePrice: 48000,
    isFeatured: true,
    categorySlug: "perles-facettees",
    images: [
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1400&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1400&q=80",
    ],
    colors: ["Pearl", "Nude", "Ivory"],
    sizes: ["8 mm", "9 mm", "10 mm", "11 mm"],
  },
  {
    name: "Obsidienne de Tahiti",
    slug: "perle-obsidienne-tahiti",
    description:
      "Perle de Tahiti facettée aux reflets d'encre. Une profondeur obscure traversée d'éclats — l'ombre et la lumière dans une même sphère.",
    basePrice: 62000,
    isFeatured: true,
    categorySlug: "perles-facettees",
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1400&q=80",
    ],
    colors: ["Obsidian", "Granite", "Midnight"],
    sizes: ["9 mm", "10 mm", "11 mm", "12 mm"],
  },
  {
    name: "Saphir — Taille Rose",
    slug: "saphir-taille-rose",
    description:
      "Saphir taillé en rose, facettage ancien revisité. Bleu nuit profond, feu maîtrisé. Pierre de caractère pour une création d'exception.",
    basePrice: 145000,
    isFeatured: true,
    categorySlug: "pierres-precieuses",
    images: [
      "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1400&q=80",
    ],
    colors: ["Midnight", "Granite"],
    sizes: ["1 ct", "1,5 ct", "2 ct"],
  },
  {
    name: "Topaze Impériale",
    slug: "topaze-imperiale-facettee",
    description:
      "Topaze impériale facettée, lumière de champagne. Transparence chaude et taille précise pour un éclat soutenu.",
    basePrice: 89000,
    isFeatured: false,
    categorySlug: "pierres-precieuses",
    images: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1400&q=80",
    ],
    colors: ["Beige", "Nude"],
    sizes: ["2 ct", "3 ct"],
  },
  {
    name: "Bague Halo",
    slug: "bague-halo-perle-facettee",
    description:
      "Perle facettée sertie d'un halo de diamants sur or 18 carats. La pièce maîtresse du vestiaire — lumière au creux de la main.",
    basePrice: 320000,
    isFeatured: true,
    categorySlug: "pieces-disponibles",
    images: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1400&q=80",
      "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=1400&q=80",
    ],
    colors: ["Ivory", "Nude"],
    sizes: ["50", "52", "54", "56"],
  },
  {
    name: "Pendentif Goutte de Lumière",
    slug: "pendentif-goutte-de-lumiere",
    description:
      "Perle facettée suspendue à une chaîne or fin. Mouvement, transparence, et un éclat qui suit le regard.",
    basePrice: 175000,
    isFeatured: false,
    categorySlug: "pieces-disponibles",
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=80",
    ],
    colors: ["Pearl", "Off-White"],
    sizes: null,
  },
];

const CUSTOM_PALETTE = "Pearl";

function skuFor(slug: string, color: string, size: string | null): string {
  const base = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  const c = color.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const s = size ? `-${size.replace(/[^A-Za-z0-9]/g, "")}` : "";
  return `${base}-${c}${s}`;
}

async function main() {
  console.log("🌱 Seed DEBO — joaillerie & perles facettées…");

  // ── Utilisateurs ─────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: { role: "ADMIN", passwordHash: adminHash, name: "Clarisse Debost" },
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      name: "Clarisse Debost",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });
  console.log(`  ✓ Admin : ${admin.email}`);

  const customerHash = await bcrypt.hash("Customer!2026", 12);
  const customer = await prisma.user.upsert({
    where: { email: "client@debo.com" },
    update: {},
    create: {
      email: "client@debo.com",
      name: "Camille Client",
      role: "CUSTOMER",
      passwordHash: customerHash,
    },
  });
  console.log(`  ✓ Client : ${customer.email}`);

  // ── Catégories ───────────────────────────────────────────
  const categoryBySlug = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    categoryBySlug.set(cat.slug, created.id);
  }
  console.log(`  ✓ Catégories : ${CATEGORIES.length}`);

  // ── Produits + variantes + visuels ───────────────────────
  for (const p of CATALOG) {
    const categoryId = categoryBySlug.get(p.categorySlug) ?? null;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        isFeatured: p.isFeatured,
        categoryId,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        currency: "EUR",
        isActive: true,
        isFeatured: p.isFeatured,
        categoryId,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: p.images.map((url, i) => ({
        productId: product.id,
        url,
        alt: `${p.name} — vue ${i + 1}`,
        position: i,
      })),
    });

    const sizeList = p.sizes ?? [null];
    for (const color of p.colors) {
      for (const size of sizeList) {
        const sku = skuFor(p.slug, color, size);
        await prisma.variant.upsert({
          where: { sku },
          update: { inventory: 8, isActive: true },
          create: {
            productId: product.id,
            sku,
            color,
            size,
            inventory: 8,
            isActive: true,
          },
        });
      }
    }
    console.log(
      `  ✓ Produit : ${p.name} (${p.colors.length * sizeList.length} variantes)`
    );
  }

  // ── Coupon de bienvenue ──────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: "BIENVENUE10" },
    update: {},
    create: {
      code: "BIENVENUE10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: 20000,
      maxRedemptions: 1000,
      isActive: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    },
  });
  console.log("  ✓ Coupon : BIENVENUE10 (-10%)");

  // ── Exemple de configuration sur-mesure ──────────────────
  if ((await prisma.customConfiguration.count()) === 0) {
    await prisma.customConfiguration.create({
      data: {
        userId: customer.id,
        gemKind: "PEARL",
        diagram: "Brillant Debost 57 facettes",
        faceting: "Taille brillant",
        dimensionsMm: 10,
        color: CUSTOM_PALETTE,
        mounting: "PENDANT",
        notes: "Souhaite un reflet rosé doux, monture or rose.",
        estimatedPrice: 96000,
        status: "QUOTED",
      },
    });
    console.log("  ✓ Exemple de configuration sur-mesure");
  }

  // ── Exemple de demande haute joaillerie ──────────────────
  if ((await prisma.bespokeRequest.count()) === 0) {
    await prisma.bespokeRequest.create({
      data: {
        userId: customer.id,
        contactName: "Camille Client",
        contactEmail: "client@debo.com",
        materials: ["Or 18 carats", "Platine"],
        stones: ["Perle facettée", "Diamant"],
        description:
          "Bague de fiançailles autour d'une perle facettée centrale, esprit minimaliste et lumineux.",
        budgetMin: 400000,
        budgetMax: 800000,
        status: "REVIEWING",
        files: {
          create: [
            {
              url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=1200&q=80",
              fileName: "inspiration-1.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 184320,
            },
          ],
        },
      },
    });
    console.log("  ✓ Exemple de demande haute joaillerie");
  }

  // ── Commandes de démonstration (alimentent le tableau de bord) ──
  if ((await prisma.order.count()) === 0) {
    const variants = await prisma.variant.findMany({
      take: 6,
      include: { product: true },
    });
    if (variants.length) {
      const now = Date.now();
      const samples = [
        { daysAgo: 1, email: "kriti.sharma@example.com", status: "PROCESSING" as const },
        { daysAgo: 4, email: "james.hudson@example.com", status: "SHIPPED" as const },
        { daysAgo: 9, email: "jackie@example.com", status: "DELIVERED" as const },
        { daysAgo: 38, email: "amelie@example.com", status: "DELIVERED" as const },
        { daysAgo: 72, email: "noah@example.com", status: "DELIVERED" as const },
        { daysAgo: 115, email: "lea@example.com", status: "DELIVERED" as const },
      ];
      let n = 0;
      for (const s of samples) {
        n++;
        const v = variants[n % variants.length]!;
        const unitPrice = v.price ?? v.product.basePrice;
        const qty = 1 + (n % 2);
        const total = unitPrice * qty;
        await prisma.order.create({
          data: {
            orderNumber: `DEBO-DEMO${n}`,
            status: s.status,
            paymentStatus: "SUCCEEDED",
            subtotal: total,
            discount: 0,
            shippingFee: 0,
            tax: 0,
            total,
            currency: "EUR",
            email: s.email,
            shipName: "Client Démo",
            shipLine1: "1 rue de la Paix",
            shipCity: "Paris",
            shipPostalCode: "75002",
            shipCountry: "FR",
            createdAt: new Date(now - s.daysAgo * 86_400_000),
            items: {
              create: [
                {
                  variantId: v.id,
                  productName: v.product.name,
                  variantInfo:
                    [v.color, v.size].filter(Boolean).join(" · ") || null,
                  sku: v.sku,
                  unitPrice,
                  quantity: qty,
                },
              ],
            },
            transactions: {
              create: [
                {
                  type: "CHARGE",
                  amount: total,
                  currency: "EUR",
                  status: "SUCCEEDED",
                  stripePaymentIntentId: `pi_demo_${n}`,
                },
              ],
            },
          },
        });
      }
      console.log(`  ✓ ${samples.length} commandes de démonstration`);
    }
  }

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error("❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export type _SeedTypes = Prisma.ProductCreateInput;
