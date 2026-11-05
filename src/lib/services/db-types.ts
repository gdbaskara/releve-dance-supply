import type { DB } from "@/db";

/** A Drizzle transaction handle */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
/** Either the root db or a transaction */
export type DbOrTx = DB | Tx;
