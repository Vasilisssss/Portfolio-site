"use client";
import Link from "next/link";
import RollText from "@/components/motion/RollText";
import { onAnchor } from "@/components/chrome/Nav";

/** A footer navigation link: text-roll on hover, smooth in-page scroll through Lenis. */
export default function FooterLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} onClick={(e) => onAnchor(e, href)} className="roll-host w-fit text-graphite-2 transition-colors hover:text-ice-deep"><RollText>{label}</RollText></Link>;
}
