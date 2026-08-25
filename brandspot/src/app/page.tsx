import HomeClient from "@/components/HomeClient";
import { getSpotState } from "@/lib/store";
import { stripeEnabled } from "@/lib/stripe";
import {
  rankBids,
  START_PRICE_CENTS,
  toBeatCents,
  type PublicSpot,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Die Seite wird servergerendert ausgeliefert: Die komplette Rangliste
// samt direkter Dofollow-Links steht im HTML – Suchmaschinen sehen die
// verlinkten Brands ohne JavaScript. Der Client übernimmt danach das
// Live-Polling.
export default async function Home() {
  const state = await getSpotState();
  const ranked = rankBids(state.bids);
  const initial: PublicSpot = {
    bids: ranked,
    totalRaisedCents: state.totalRaisedCents,
    visitors: state.visitors,
    online: 1,
    minBidCents: START_PRICE_CENTS,
    toBeatCents: toBeatCents(state.bids),
    demoMode: !stripeEnabled(),
  };

  // Strukturierte Daten (ItemList) für Suchmaschinen.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "BrandSpot Rangliste",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: ranked.length,
    itemListElement: ranked.slice(0, 50).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.title?.trim() ? b.title : b.brand,
      description: b.message,
      ...(b.url ? { url: b.url } : {}),
    })),
  };

  return (
    <>
      {ranked.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <HomeClient initial={initial} />
    </>
  );
}
