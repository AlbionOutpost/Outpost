import { reviseBuild, duplicateBuild } from "../../src/lib/builds/service";
import {
  saveComposition,
  duplicateComposition,
  deleteComposition,
} from "../../src/lib/compositions/service";
import { mutateGroup, acceptInvitation } from "../../src/lib/groups/service";
import { communityMutation } from "../../src/lib/community/service";
import { moderateReport } from "../../src/lib/community/moderation";
import { saveWatchItem } from "../../src/lib/market-watch-service";
import { HttpError } from "../../src/lib/http-error";
import { listAccountBuilds, listAccountFavorites } from "../../src/lib/builds/discovery-service";

const services = {
  reviseBuild,
  duplicateBuild,
  saveComposition,
  duplicateComposition,
  deleteComposition,
  mutateGroup,
  acceptInvitation,
  communityMutation,
  moderateReport,
  saveWatchItem,
  listAccountBuilds,
  listAccountFavorites,
};
export async function executeService(name: string, args: unknown[]) {
  if (
    !Object.hasOwn(services, name) ||
    !Array.isArray(args) ||
    args.length > 5 ||
    JSON.stringify(args).length > 2_000_000
  )
    throw new HttpError(400, "Unsupported database service");
  // The private, server-only binding supplies server-derived actor IDs. Domain validation and
  // current ownership/membership checks run again inside the enclosing SQLite transaction.
  const service = services[name as keyof typeof services] as (
    ...values: unknown[]
  ) => Promise<unknown>;
  return service(...args);
}
