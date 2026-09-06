import type { HTMLAttributes } from "react";
export default function Reveal({
  delay,
  ...props
}: HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  return <div {...props} />;
}
