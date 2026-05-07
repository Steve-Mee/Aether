/**
 * Medusa Admin Widget Registration (Sprint 2)
 * Registreer AETHER widgets in de Admin sidebar en dashboard
 */

import { LowMarginWidget } from "../../../../admin/command-center/widgets/LowMarginWidget";
import { SupplierAlertsWidget } from "../../../../admin/command-center/widgets/SupplierAlertsWidget";
import { MailSummaryWidget } from "../../../../admin/command-center/widgets/MailSummaryWidget";
import { AetherCommandBar } from "../../../../admin/command-center/CommandBar";

// Dit bestand wordt gebruikt door Medusa Admin extensie systeem
// In medusa-config.ts of via plugin:

export const aetherAdminWidgets = {
  // Dashboard widgets
  dashboard: [
    {
      id: "aether-low-margin",
      component: LowMarginWidget,
      title: "Lage Margin Alert",
      position: "main",
    },
    {
      id: "aether-supplier-alerts",
      component: SupplierAlertsWidget,
      title: "Supplier Intelligence",
      position: "side",
    },
    {
      id: "aether-mail-summary",
      component: MailSummaryWidget,
      title: "AETHER Mail",
      position: "side",
    },
  ],

  // Globale command bar
  commandBar: AetherCommandBar,

  // Extra sidebar sectie
  sidebar: [
    {
      label: "AETHER Intelligence",
      icon: "sparkles",
      children: [
        { label: "Command Center", path: "/aether/command" },
        { label: "Mail Inbox", path: "/aether/mail" },
        { label: "Supplier Monitor", path: "/aether/suppliers" },
      ],
    },
  ],
};