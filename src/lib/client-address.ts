/** The rate-limit identity for a trusted client address. An IPv6 subscriber usually holds a whole
 * /64 and can rotate through it freely, so IPv6 addresses count per /64; IPv4 counts per address. */
export function addressBucket(address: string) {
  if (!address.includes(":") || /\d+\.\d+\.\d+\.\d+$/.test(address)) return address;
  const [head, tail] = address.toLowerCase().split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? front
      : [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back];
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
