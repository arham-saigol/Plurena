/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audiences from "../audiences.js";
import type * as crons from "../crons.js";
import type * as fileInternals from "../fileInternals.js";
import type * as files from "../files.js";
import type * as jobs from "../jobs.js";
import type * as lib_aggregation from "../lib/aggregation.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_credits from "../lib/credits.js";
import type * as lib_idempotency from "../lib/idempotency.js";
import type * as lib_modelRegistry from "../lib/modelRegistry.js";
import type * as lib_panel from "../lib/panel.js";
import type * as lib_panelGeneration from "../lib/panelGeneration.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_synthesisEvidence from "../lib/synthesisEvidence.js";
import type * as lib_synthesisGuidance from "../lib/synthesisGuidance.js";
import type * as maintenance from "../maintenance.js";
import type * as models from "../models.js";
import type * as payments from "../payments.js";
import type * as pricing from "../pricing.js";
import type * as testInternals from "../testInternals.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audiences: typeof audiences;
  crons: typeof crons;
  fileInternals: typeof fileInternals;
  files: typeof files;
  jobs: typeof jobs;
  "lib/aggregation": typeof lib_aggregation;
  "lib/auth": typeof lib_auth;
  "lib/authorization": typeof lib_authorization;
  "lib/credits": typeof lib_credits;
  "lib/idempotency": typeof lib_idempotency;
  "lib/modelRegistry": typeof lib_modelRegistry;
  "lib/panel": typeof lib_panel;
  "lib/panelGeneration": typeof lib_panelGeneration;
  "lib/pricing": typeof lib_pricing;
  "lib/synthesisEvidence": typeof lib_synthesisEvidence;
  "lib/synthesisGuidance": typeof lib_synthesisGuidance;
  maintenance: typeof maintenance;
  models: typeof models;
  payments: typeof payments;
  pricing: typeof pricing;
  testInternals: typeof testInternals;
  tests: typeof tests;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
