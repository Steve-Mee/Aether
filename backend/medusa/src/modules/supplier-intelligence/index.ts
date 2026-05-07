import { Module } from "@medusajs/utils";
import SupplierIntelligenceService from "./service";

export const SUPPLIER_INTELLIGENCE_MODULE = "supplier_intelligence";

export default Module(SUPPLIER_INTELLIGENCE_MODULE, {
  service: SupplierIntelligenceService,
});