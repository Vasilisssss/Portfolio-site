import { getPublicView } from "@/lib/public";
import HomePage from "@/components/pages/HomePage";

export default function Home() {
  return <HomePage view={getPublicView()} />;
}
