import React, { useState } from "react";

export const SupplierAlertsWidget = () => {
  const [alerts] = useState([
    {
      supplier: "StreetWear Supply Co.",
      change: "Prijs gedaald met 12%",
      product: "Oversized Denim Jacket",
      impact: "+€2.840 extra margin deze maand",
      action: "Auto-sync ingeschakeld",
    },
    {
      supplier: "Sustainable Textiles BV",
      change: "3 nieuwe limited drops",
      product: "Organic Cotton Hoodie (new colors)",
      impact: "Past perfect bij je merk",
      action: "Review & import",
    },
  ]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Supplier Intelligence Alerts</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">LIVE</span>
      </div>

      <div className="space-y-4">
        {alerts.map((alert, index) => (
          <div key={index} className="border-l-4 border-green-500 pl-4">
            <div className="font-medium">{alert.supplier}</div>
            <div className="text-sm text-gray-600 mt-1">{alert.change} — {alert.product}</div>
            <div className="text-sm text-green-600 font-medium mt-1">{alert.impact}</div>
            <button className="mt-2 text-xs bg-gray-900 text-white px-3 py-1 rounded">
              {alert.action}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Laatste sync: 4 minuten geleden • 7 leveranciers gemonitord
      </div>
    </div>
  );
};