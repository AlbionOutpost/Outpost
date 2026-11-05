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
import { teamLoot } from "../../src/lib/groups/loot-service";
import { siteStats } from "../../src/lib/site-stats";
import { applySubscription, rememberCustomer } from "../../src/lib/billing/plan";
import { beginCheckout, updateCheckout } from "../../src/lib/billing/checkout";
import { deleteAccountRecord } from "../../src/lib/account-deletion";
import { adminUserAction, adminBanAction } from "../../src/lib/admin/service";
import {
  adminReview,
  adminOverview,
  adminUsers,
  adminUserDetail,
  adminAuditLog,
} from "../../src/lib/admin/queries";

import { setLibraryLike } from "../../src/lib/library-likes";

import { activeSession, createActiveSession } from "../../src/lib/admin/sessions";

const services = {
  activeSession,
  createActiveSession,
  adminUserAction,
  adminBanAction,
  adminReview,
  adminOverview,
  adminUsers,
  adminUserDetail,
  adminAuditLog,
  setLibraryLike,
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
  teamLoot,
  siteStats,
  applySubscription,
  rememberCustomer,
  beginCheckout,
  updateCheckout,
  deleteAccountRecord,
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
