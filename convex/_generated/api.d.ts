/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as execution from "../execution.js";
import type * as executionActions from "../executionActions.js";
import type * as http from "../http.js";
import type * as lib_aggregation from "../lib/aggregation.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_credits from "../lib/credits.js";
import type * as lib_dashboardStats from "../lib/dashboardStats.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_structuredSchemas from "../lib/structuredSchemas.js";
import type * as lib_validators from "../lib/validators.js";
import type * as paymentActions from "../paymentActions.js";
import type * as payments from "../payments.js";
import type * as responses from "../responses.js";
import type * as synthesis from "../synthesis.js";
import type * as synthesisActions from "../synthesisActions.js";
import type * as tests from "../tests.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  execution: typeof execution;
  executionActions: typeof executionActions;
  http: typeof http;
  "lib/aggregation": typeof lib_aggregation;
  "lib/ai": typeof lib_ai;
  "lib/auth": typeof lib_auth;
  "lib/credits": typeof lib_credits;
  "lib/dashboardStats": typeof lib_dashboardStats;
  "lib/ledger": typeof lib_ledger;
  "lib/models": typeof lib_models;
  "lib/structuredSchemas": typeof lib_structuredSchemas;
  "lib/validators": typeof lib_validators;
  paymentActions: typeof paymentActions;
  payments: typeof payments;
  responses: typeof responses;
  synthesis: typeof synthesis;
  synthesisActions: typeof synthesisActions;
  tests: typeof tests;
  uploads: typeof uploads;
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

export declare const components: {
  ledgerAggregate: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"ledgerAggregate">;
};
