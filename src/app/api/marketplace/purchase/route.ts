import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, generateApiKey } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";
import { getXrplClient, getPlatformAddress } from "@/lib/xrpl/client";

const RLUSD_ISSUER = process.env.RLUSD_ISSUER!;
const RLUSD_HEX = "524C555344000000000000000000000000000000";

async function requireUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const session = await verifySessionToken(auth.slice(7));
  if (!session) return null;
  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id, wallet_address")
    .eq("wallet_address", session.wallet)
    .single();
  return user ?? null;
}

/**
 * POST /api/marketplace/purchase
 * Body: { listing_id, tx_hash }
 *
 * Buyer has already sent RLUSD to the platform address via Crossmark.
 * This route verifies the on-chain payment, checks the listing, and issues
 * the buyer an API key whose usage is billed to the seller's credit balance.
 */
export async function POST(req: NextRequest) {
  const buyer = await requireUser(req);
  if (!buyer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { listing_id, tx_hash } = await req.json() as { listing_id: string; tx_hash: string };
  if (!listing_id || !tx_hash) {
    return NextResponse.json({ error: "listing_id and tx_hash required" }, { status: 400 });
  }

  const db = getSupabase();

  // Idempotency: reject duplicate tx hashes
  const { data: existing } = await db
    .from("marketplace_purchases")
    .select("id")
    .eq("xrpl_tx_hash", tx_hash)
    .single();
  if (existing) return NextResponse.json({ error: "tx already processed" }, { status: 409 });

  // Load the listing
  const { data: listing } = await db
    .from("marketplace_listings")
    .select("id, seller_id, price_rlusd, credit_limit, max_purchases, purchase_count, is_active")
    .eq("id", listing_id)
    .single();

  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });
  if (!listing.is_active) return NextResponse.json({ error: "listing is no longer active" }, { status: 410 });
  if (listing.max_purchases > 0 && listing.purchase_count >= listing.max_purchases) {
    return NextResponse.json({ error: "listing is sold out" }, { status: 410 });
  }
  if (listing.seller_id === buyer.id) {
    return NextResponse.json({ error: "cannot purchase your own listing" }, { status: 400 });
  }

  // Verify RLUSD payment on-chain
  const client = await getXrplClient();
  const platformAddress = getPlatformAddress();

  let txResult: Record<string, unknown>;
  try {
    const res = await client.request({ command: "tx", transaction: tx_hash });
    txResult = res.result as unknown as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "tx not found on ledger" }, { status: 404 });
  }

  const meta = txResult.meta as Record<string, unknown>;
  const amount = txResult.Amount as Record<string, string>;

  if (
    txResult.TransactionType !== "Payment" ||
    txResult.Destination !== platformAddress ||
    meta?.TransactionResult !== "tesSUCCESS"
  ) {
    return NextResponse.json({ error: "invalid or failed tx" }, { status: 400 });
  }

  if (
    typeof amount !== "object" ||
    (amount.currency !== "RLUSD" && amount.currency !== RLUSD_HEX) ||
    amount.issuer !== RLUSD_ISSUER
  ) {
    return NextResponse.json({ error: "payment must be in RLUSD" }, { status: 400 });
  }

  if (txResult.Account !== buyer.wallet_address) {
    return NextResponse.json({ error: "tx sender does not match authenticated wallet" }, { status: 403 });
  }

  const paidRlusd = parseFloat(amount.value);
  const requiredRlusd = parseFloat(listing.price_rlusd);
  if (paidRlusd < requiredRlusd) {
    return NextResponse.json(
      { error: `insufficient payment: paid ${paidRlusd} RLUSD, required ${requiredRlusd} RLUSD` },
      { status: 400 }
    );
  }

  // Load seller's wallet address for billing
  const { data: seller } = await db
    .from("users")
    .select("id, wallet_address")
    .eq("id", listing.seller_id)
    .single();
  if (!seller) return NextResponse.json({ error: "seller not found" }, { status: 500 });

  // Generate API key for the buyer — usage billed to seller
  const { key, hash, prefix } = generateApiKey();

  const { data: newKey, error: keyError } = await db
    .from("api_keys")
    .insert({
      user_id: buyer.id,
      key_hash: hash,
      key_prefix: prefix,
      name: `Marketplace: ${listing_id.slice(0, 8)}`,
      is_active: true,
      source_user_id: seller.id,       // credits billed to seller
      marketplace_listing_id: listing_id,
    })
    .select("id")
    .single();

  if (keyError || !newKey) {
    return NextResponse.json({ error: "failed to create api key" }, { status: 500 });
  }

  // Record the purchase
  await db.from("marketplace_purchases").insert({
    listing_id,
    buyer_id: buyer.id,
    api_key_id: newKey.id,
    price_paid_rlusd: paidRlusd.toString(),
    xrpl_tx_hash: tx_hash,
  });

  // Increment purchase count on the listing
  await db
    .from("marketplace_listings")
    .update({ purchase_count: listing.purchase_count + 1 })
    .eq("id", listing_id);

  // Optionally deactivate if sold out
  if (listing.max_purchases > 0 && listing.purchase_count + 1 >= listing.max_purchases) {
    await db.from("marketplace_listings").update({ is_active: false }).eq("id", listing_id);
  }

  return NextResponse.json({ success: true, key, prefix }, { status: 201 });
}

// GET /api/marketplace/purchase — list buyer's purchases
export async function GET(req: NextRequest) {
  const buyer = await requireUser(req);
  if (!buyer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabase();
  const { data, error } = await db
    .from("marketplace_purchases")
    .select(`
      id, price_paid_rlusd, xrpl_tx_hash, created_at,
      api_key:api_key_id ( id, key_prefix, name, is_active ),
      listing:listing_id ( id, title, description, price_rlusd )
    `)
    .eq("buyer_id", buyer.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
  return NextResponse.json({ purchases: data ?? [] });
}
