import { Module } from "@medusajs/utils";
import AetherMailService from "./service";

export const AETHER_MAIL_MODULE = "aether_mail";

export default Module(AETHER_MAIL_MODULE, {
  service: AetherMailService,
});

export { AetherMailService };