import "server-only";
import { getDb } from "@/infrastructure/db/client";
import { createServices, type Services } from "./container";

let services: Services | undefined;

/** The app's services, created once per server instance. */
export function getServices(): Services {
  services ??= createServices(getDb());
  return services;
}
