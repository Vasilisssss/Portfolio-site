import { getPublicView } from "@/lib/public";
import { worldFromView } from "@/lib/world-data";

// The data the rendered film was made from (tools/film): the same privacy-filtered view the page shows.
export const dynamic = "force-static";

export async function GET() {
  const { data, labels } = worldFromView(getPublicView());
  return Response.json({ data, labels });
}
