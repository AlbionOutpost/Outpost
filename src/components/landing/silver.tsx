import { Silver as Amount } from "@/components/silver";
export { compact } from "@/components/silver";
export function Silver({
  animated = true,
  ...props
}: Omit<Parameters<typeof Amount>[0], "animate"> & { animated?: boolean }) {
  return <Amount {...props} animate={animated} />;
}
