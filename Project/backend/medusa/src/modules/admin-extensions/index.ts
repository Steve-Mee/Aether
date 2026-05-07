import { Module } from "@medusajs/utils";

export const ADMIN_EXTENSIONS_MODULE = "admin_extensions";

export default Module(ADMIN_EXTENSIONS_MODULE, {
  // Dit is een UI-only module — geen service nodig
  // De widgets worden geladen via Medusa Admin extensie systeem
});