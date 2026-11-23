"use client";
import dynamic from "next/dynamic";
import type { WorldData } from "./types";
import type { WorldLabel } from "./World";

/** Loads the film player only in the browser, after the page's HTML is already readable. */
const World = dynamic(() => import("./World"), { ssr: false });

export default function WorldMount({ data, labels }: { data: WorldData; labels: WorldLabel[] }) {
  return <World data={data} labels={labels} />;
}
