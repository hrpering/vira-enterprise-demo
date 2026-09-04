import { searchFlights } from "@vira-enterprise-genui/mock-airline-domain";
import type { ViraFlightExperienceResult } from "../../lib/vira-chat-contract";
import { ExternalProofClient } from "../../components/external-proof-client";

export default function ExternalProofPage() {
  const packId = process.env.VIRA_PROOF_PACK_ID ?? "missing-pack-id";
  const packVersion = process.env.VIRA_PROOF_PACK_VERSION ?? "missing-pack-version";
  const packDigest = process.env.VIRA_PROOF_PACK_DIGEST ?? "missing-pack-digest";
  const search = searchFlights({
    origin: "SAW",
    destination: "BER",
    departureDate: "2026-09-15",
    passengers: 1,
  });

  const result: ViraFlightExperienceResult = {
    version: "1",
    kind: "vira.experience",
    experience: "travel.flight.search",
    input: {
      origin: search.origin,
      destination: search.destination,
      departureDate: search.departureDate,
      passengers: search.passengers,
    },
    data: {
      offers: search.offers.map((offer) => ({
        id: offer.id,
        carrier: offer.carrier,
        flightNumber: offer.flightNumber,
        origin: offer.origin,
        destination: offer.destination,
        departure: offer.departure,
        arrival: offer.arrival,
        duration: offer.duration,
        price: offer.price,
        currency: offer.currency,
      })),
    },
  };

  return (
    <ExternalProofClient
      packId={packId}
      packVersion={packVersion}
      packDigest={packDigest}
      result={result}
    />
  );
}
