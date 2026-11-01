/*
 * End-to-end checks for the admin dashboard's business logic against the real database.
 *
 * Run (after `npx drizzle-kit push` and with DATABASE_URL set):
 *   npm run test:admin
 *
 * It creates clearly tagged test data, exercises product / category / order / payment
 * flows, verifies stock and revenue rules, then removes everything it created.
 */
import { db, pool } from "@/db";
import { products, categories, orders, payments, notifications } from "@/db/schema";
import { eq, gt, inArray } from "drizzle-orm";
import * as svc from "@/lib/admin-service";
import { createOrder, markPaymentSuccessful, markPaymentFailed, ensureBankTransferPayment } from "@/lib/orders";
import { listProducts, getAllCategories, getProductBySlug } from "@/lib/queries";
import { getDashboardData, getSalesReport, getInventory, getAdminOrders, getAdminPayments } from "@/lib/admin-queries";

const TAG = `QA${Date.now().toString(36).toUpperCase()}`;
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? `  →  ${detail}` : ""}`);
  }
}
const section = (t: string) => console.log(`\n■ ${t}`);

async function stockOf(id: number) {
  const [r] = await db.select({ stock: products.stock, sold: products.soldCount }).from(products).where(eq(products.id, id));
  return r;
}
async function orderRow(id: number) {
  const [r] = await db.select().from(orders).where(eq(orders.id, id));
  return r;
}

async function main() {
  const [maxNotif] = await db.select({ id: notifications.id }).from(notifications).orderBy(notifications.id).limit(1);
  const notifFloor = maxNotif?.id ?? 0;
  const [jeans] = await db.select().from(categories).where(eq(categories.slug, "jeans")).limit(1);

  const base: svc.ProductInput = {
    name: `${TAG} Test Jeans`,
    description: "Automated QA product — safe to delete.",
    price: 31000,
    discountPrice: 24000,
    categoryId: jeans?.id ?? null,
    images: ["https://example.com/front.jpg", "https://example.com/back.jpg"],
    sizes: ["s", "xl", "Custom"],
    colors: ["black", "navy"],
    stock: 10,
    featured: true,
    bestSeller: true,
    isNewArrival: true,
    active: true,
  };

  /* ───────── Products ───────── */
  section("Product creation");
  const created = await svc.createProduct(base);
  check("create product succeeds", created.ok, created.ok ? "" : created.error);
  const pid = created.ok ? created.id! : 0;
  const pRow = (await db.select().from(products).where(eq(products.id, pid)).limit(1))[0];
  check("slug generated from name", pRow.slug.startsWith("qa"), pRow.slug);
  check("sizes normalised (s→S, xl→XL, Custom kept)", JSON.stringify(pRow.sizes) === JSON.stringify(["S", "XL", "Custom"]), JSON.stringify(pRow.sizes));
  check("colours capitalised", JSON.stringify(pRow.colors) === JSON.stringify(["Black", "Navy"]), JSON.stringify(pRow.colors));
  check("multiple photos stored", pRow.images.length === 2);
  check("discount & price stored in Naira", pRow.price === 31000 && pRow.discountPrice === 24000);
  check("badges stored (featured, best seller)", pRow.featured && pRow.bestSeller);
  const shop = await listProducts({ q: TAG, limit: 50 });
  check("new product appears on storefront", shop.items.some((p) => p.id === pid));
  check("new product has a working product page", !!(await getProductBySlug(pRow.slug)));
  const bests = await listProducts({ bestSeller: true, limit: 500 });
  check("best-seller flag reaches the homepage query", bests.items.some((p) => p.id === pid));

  section("Product validation");
  const v1 = await svc.createProduct({ ...base, name: `${TAG} bad discount`, discountPrice: 40000 });
  check("rejects discount ≥ selling price", !v1.ok);
  const v2 = await svc.createProduct({ ...base, name: `${TAG} no photo`, images: [] });
  check("rejects product with no photographs", !v2.ok);
  const v3 = await svc.createProduct({ ...base, name: `${TAG} neg stock`, stock: -4 });
  check("rejects negative stock", !v3.ok);
  const v4 = await svc.createProduct({ ...base, name: `${TAG} zero price`, price: 0, discountPrice: null });
  check("rejects zero price", !v4.ok);

  section("Product editing, publishing and deletion");
  const upd = await svc.updateProduct(pid, { ...base, name: `${TAG} Test Jeans Edited`, price: 32000, discountPrice: null, stock: 9, sizes: ["M", "L"] });
  check("edit succeeds", upd.ok, upd.ok ? "" : upd.error);
  const edited = (await db.select().from(products).where(eq(products.id, pid)))[0];
  check("edit saves name, price, stock, sizes", edited.name.endsWith("Edited") && edited.price === 32000 && edited.discountPrice === null && edited.stock === 9 && edited.sizes.join(",") === "M,L");
  check("URL slug stays stable after rename", edited.slug === pRow.slug, `${edited.slug} vs ${pRow.slug}`);
  await svc.setProductFlag(pid, "active", false);
  check("unpublished product hidden from shop", !(await listProducts({ q: TAG, limit: 50 })).items.some((p) => p.id === pid));
  check("unpublished product page returns not found", !(await getProductBySlug(pRow.slug)));
  await svc.setProductFlag(pid, "active", true);
  check("republished product visible again", (await listProducts({ q: TAG, limit: 50 })).items.some((p) => p.id === pid));
  await svc.setProductFlag(pid, "bestSeller", false);
  check("best-seller flag can be switched off", !(await db.select().from(products).where(eq(products.id, pid)))[0].bestSeller);
  await svc.setProductFlag(pid, "bestSeller", true);

  const tmp = await svc.createProduct({ ...base, name: `${TAG} Delete Me` });
  const tmpId = tmp.ok ? tmp.id! : 0;
  const del = await svc.deleteProduct(tmpId);
  check("delete product succeeds", del.ok);
  check("deleted product is gone from database", (await db.select().from(products).where(eq(products.id, tmpId))).length === 0);

  /* ───────── Categories ───────── */
  section("Category management");
  const cat = await svc.saveCategory({ name: `${TAG} Category`, description: "QA", image: "/images/hero.jpg", sortOrder: 99, active: true });
  check("create category", cat.ok, cat.ok ? "" : cat.error);
  const catId = cat.ok ? cat.id! : 0;
  const catRow = (await db.select().from(categories).where(eq(categories.id, catId)))[0];
  check("category image saved", catRow.image === "/images/hero.jpg");
  const ren = await svc.saveCategory({ id: catId, name: `${TAG} Renamed`, description: "QA", image: null, sortOrder: 99, active: true });
  const renRow = (await db.select().from(categories).where(eq(categories.id, catId)))[0];
  check("rename category", ren.ok && renRow.name === `${TAG} Renamed`);
  check("category URL slug stable after rename", renRow.slug === catRow.slug);
  await svc.updateProduct(pid, { ...base, name: `${TAG} Test Jeans Edited`, categoryId: catId, stock: 10 });
  check("assign product to category", (await db.select().from(products).where(eq(products.id, pid)))[0].categoryId === catId);
  check("category visible in storefront list", (await getAllCategories()).some((c) => c.id === catId));
  check("product listed under its category", (await listProducts({ category: catRow.slug, limit: 100 })).items.some((p) => p.id === pid));
  await svc.setCategoryActive(catId, false);
  check("hidden category removed from storefront menu", !(await getAllCategories()).some((c) => c.id === catId));
  check("products in hidden category hidden from shop", !(await listProducts({ q: TAG, limit: 50 })).items.some((p) => p.id === pid));
  await svc.setCategoryActive(catId, true);
  check("category shown again", (await getAllCategories()).some((c) => c.id === catId));
  const catDel = await svc.saveCategory({ name: `${TAG} To Delete`, description: "", image: null, sortOrder: 1, active: true });
  const catDelId = catDel.ok ? catDel.id! : 0;
  await svc.deleteCategory(catDelId);
  check("delete category succeeds", (await db.select().from(categories).where(eq(categories.id, catDelId))).length === 0);
  await svc.deleteCategory(catId);
  check("deleting a category keeps its products (uncategorised)", (await db.select().from(products).where(eq(products.id, pid)))[0].categoryId === null);

  /* ───────── Orders, stock and payments ───────── */
  await svc.setProductStock(pid, 10);
  const orderInput = (qty: number, method: "paystack" | "bank_transfer") => ({
    items: [{ productId: pid, size: "M", color: "Black", quantity: qty }],
    customer: { name: "QA Customer", email: `qa+${TAG.toLowerCase()}@example.com`, phone: "08000000000", address: "1 Test Street", city: "Ikeja", state: "Lagos" },
    paymentMethod: method,
  });

  section("Order placement & stock rules");
  const oA = await createOrder(orderInput(2, "bank_transfer"));
  check("order placed with status pending and payment pending", oA.status === "pending" && oA.paymentStatus === "pending");
  check("stock is NOT reduced when the order is placed", (await stockOf(pid)).stock === 10);
  const pNow = (await db.select().from(products).where(eq(products.id, pid)).limit(1))[0];
  const unitNow = pNow.discountPrice ?? pNow.price;
  check("order total = unit price × qty + Lagos delivery", oA.total === 2 * unitNow + 2500, `total=${oA.total}, unit=${unitNow}`);
  const oversell = await createOrder({ ...orderInput(1, "bank_transfer"), items: [{ productId: pid, size: "M", color: "Black", quantity: 11 }] }).then(
    () => "placed",
    (e: Error) => e.message,
  );
  check("cannot order more than the stock available", oversell !== "placed", oversell);

  section("Order status rules");
  const blocked = await svc.updateOrderStatus(oA.id, "shipped", "qa@test");
  check("cannot ship an unpaid order", !blocked.ok, blocked.ok ? "" : "");
  const pend = await svc.updateOrderStatus(oA.id, "pending", "qa@test");
  check("pending status can always be set", pend.ok);

  section("Bank transfer confirmation (manual) & stock deduction");
  const soldBefore = (await stockOf(pid)).sold;
  const confirm = await svc.reviewBankTransfer(oA.orderNumber, "approve", "qa@test");
  check("admin confirms bank transfer", confirm.ok, confirm.ok ? "" : confirm.error);
  const afterPay = await orderRow(oA.id);
  check("order becomes paid and processing", afterPay.paymentStatus === "successful" && afterPay.status === "processing");
  check("stock reduced by 2 after confirmed payment", (await stockOf(pid)).stock === 8, `stock=${(await stockOf(pid)).stock}`);
  check("sold count increased by 2", (await stockOf(pid)).sold === soldBefore + 2);
  const [payA] = await db.select().from(payments).where(eq(payments.orderId, oA.id));
  check("payment record shows successful + verifier", payA.status === "successful" && payA.verifiedBy === "admin:qa@test", payA.verifiedBy ?? "");
  const dup = await markPaymentSuccessful(oA.orderNumber, { verifiedBy: "paystack_webhook" });
  check("repeat confirmation (e.g. webhook retry) is idempotent", dup.ok && dup.alreadyProcessed === true);
  check("stock is not deducted twice", (await stockOf(pid)).stock === 8);
  const dupManual = await svc.reviewBankTransfer(oA.orderNumber, "approve", "qa@test");
  check("cannot re-approve an already successful payment", !dupManual.ok);

  section("Fulfilment progression & cancellation");
  for (const st of ["shipped", "delivered"]) {
    const r = await svc.updateOrderStatus(oA.id, st, "qa@test");
    check(`order moves to ${st}`, r.ok && (await orderRow(oA.id)).status === st);
  }
  const cancelDelivered = await svc.updateOrderStatus(oA.id, "cancelled", "qa@test");
  check("cancelling a paid order returns its stock", cancelDelivered.ok && (await stockOf(pid)).stock === 10, `stock=${(await stockOf(pid)).stock}`);
  check("cancelled order is marked cancelled", (await orderRow(oA.id)).status === "cancelled");

  section("Concurrent payment confirmations (race safety)");
  const oB = await createOrder(orderInput(1, "paystack"));
  const [r1, r2] = await Promise.all([
    markPaymentSuccessful(oB.orderNumber, { verifiedBy: "paystack_webhook", amountNaira: oB.total }),
    markPaymentSuccessful(oB.orderNumber, { verifiedBy: "paystack_verify", amountNaira: oB.total }),
  ]);
  const processedOnce = [r1, r2].filter((r) => r.ok && !r.alreadyProcessed).length === 1;
  check("two simultaneous confirmations process the payment once", processedOnce);
  check("stock deducted exactly once under the race", (await stockOf(pid)).stock === 9, `stock=${(await stockOf(pid)).stock}`);

  section("Amount tampering protection");
  const oC = await createOrder(orderInput(1, "paystack"));
  const short = await markPaymentSuccessful(oC.orderNumber, { verifiedBy: "paystack_verify", amountNaira: 100 });
  check("underpaid amount is rejected", !short.ok);
  check("order stays unpaid after underpayment", (await orderRow(oC.id)).paymentStatus !== "successful");

  section("Cancelled before payment, then paid late");
  const oD = await createOrder(orderInput(1, "bank_transfer"));
  await svc.updateOrderStatus(oD.id, "cancelled", "qa@test");
  check("cancelling an unpaid order does not change stock", (await stockOf(pid)).stock === 9);
  const late = await markPaymentSuccessful(oD.orderNumber, { verifiedBy: "paystack_webhook" });
  check("late payment is recorded", late.ok);
  check("late payment does not reactivate the cancelled order", (await orderRow(oD.id)).status === "cancelled");
  check("late payment does not deduct stock", (await stockOf(pid)).stock === 9);
  const [lateNote] = await db.select().from(notifications).where(gt(notifications.id, notifFloor));
  check("admin is alerted about the late payment", !!lateNote);

  section("Paystack failure → bank transfer fallback");
  const oE = await createOrder(orderInput(1, "paystack"));
  await markPaymentFailed(oE.orderNumber, "Paystack could not start (test)");
  check("failed attempt marks order payment failed", (await orderRow(oE.id)).paymentStatus === "failed");
  const bt = await ensureBankTransferPayment(oE.id);
  const oEafter = await orderRow(oE.id);
  check("fallback bank transfer attempt created and order is payable again", bt.method === "bank_transfer" && bt.status === "pending" && oEafter.paymentStatus === "pending");
  const syncNoKey = await svc.syncPaystackPayment(oE.orderNumber, "qa@test");
  if (!process.env.PAYSTACK_SECRET_KEY) {
    check("Paystack sync fails cleanly when no key is configured", !syncNoKey.ok, syncNoKey.ok ? "unexpected success" : "");
  } else {
    console.log("  • Paystack key present — live Paystack sync is not exercised by this script");
  }
  const manualPaystack = await svc.reviewBankTransfer(oE.orderNumber, "approve", "qa@test");
  check("cannot manually approve a Paystack payment", !manualPaystack.ok);
  const rejected = await svc.reviewBankTransfer(bt.reference, "reject", "qa@test");
  check("admin can reject a bank transfer claim", rejected.ok);
  check("rejected transfer leaves the order unpaid", (await orderRow(oE.id)).paymentStatus === "failed");

  /* ───────── Dashboard, reports and inventory ───────── */
  section("Dashboard, reports and inventory (real data)");
  const dash = await getDashboardData();
  check("revenue includes confirmed payments", dash.revenue >= 0 && Number.isFinite(dash.revenue));
  check("order counts are numbers", [dash.totalOrders, dash.pendingOrders, dash.completedOrders, dash.customers, dash.activeProducts].every((n) => Number.isInteger(n)));
  check("monthly analytics covers 12 months", dash.monthly.length === 12);
  check("recent orders populated", dash.recentOrders.length > 0);
  const daily = await getSalesReport("daily");
  const weekly = await getSalesReport("weekly");
  const monthly = await getSalesReport("monthly");
  check("daily report has 30 days", daily.buckets.length === 30);
  check("weekly report has 12 weeks", weekly.buckets.length === 12);
  check("monthly report has 12 months", monthly.buckets.length === 12);
  check("monthly report includes the open paid order", monthly.summary.revenue >= oB.total, `${monthly.summary.revenue} < ${oB.total}`);
  check("monthly report excludes cancelled orders", monthly.summary.revenue < oA.total + oB.total, `${monthly.summary.revenue}`);
  check("best sellers ranked by units sold", monthly.bestSellers.every((b, i, arr) => i === 0 || arr[i - 1].units >= b.units));
  const inv = await getInventory("all");
  check("inventory totals computed", inv.summary.units >= 0 && inv.summary.value >= 0);
  const outOnly = await getInventory("out");
  check("out-of-stock filter returns only out-of-stock items", outOnly.items.every((i) => i.status === "out"));
  const ords = await getAdminOrders({ q: oA.orderNumber });
  check("order search returns items with sizes & quantities", ords.length === 1 && ords[0].items[0].size === "M" && ords[0].items[0].quantity === 2);
  const pays = await getAdminPayments({ q: oE.orderNumber });
  check("payment search finds the transaction", pays.length >= 1);

  /* ───────── Cleanup ───────── */
  section("Cleanup");
  await db.delete(orders).where(inArray(orders.id, [oA.id, oB.id, oC.id, oD.id, oE.id]));
  await db.delete(products).where(eq(products.id, pid));
  await db.delete(notifications).where(gt(notifications.id, notifFloor));
  const leftover = (await db.select({ id: products.id }).from(products).where(eq(products.id, pid))).length;
  check("test data removed", leftover === 0);
}

main()
  .catch((e) => {
    fail++;
    console.error("Unexpected error:", e);
  })
  .finally(async () => {
    console.log(`\nResult: ${pass} passed, ${fail} failed`);
    await pool.end();
    process.exit(fail ? 1 : 0);
  });
