import type { AnchorHTMLAttributes } from "react";
// Native links keep the catalog usable without hydration and avoid route prefetching.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
