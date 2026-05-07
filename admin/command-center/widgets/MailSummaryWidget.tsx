import React from "react";

export const MailSummaryWidget = () => {
  const summary = {
    total: 47,
    autoHandled: 31,
    needsReview: 9,
    avgResponseTime: "1.8u",
    topCategory: "order_status",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">AETHER Mail — Vandaag</h3>
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">LOKALE AI</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-3xl font-bold text-green-600">{summary.autoHandled}</div>
          <div className="text-xs text-gray-500">Auto afgehandeld</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-orange-600">{summary.needsReview}</div>
          <div className="text-xs text-gray-500">Wacht op review</div>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <div>Gemiddelde responstijd: <span className="font-medium">{summary.avgResponseTime}</span></div>
        <div>Meest voorkomend: <span className="font-medium">{summary.topCategory}</span></div>
      </div>

      <button className="mt-4 w-full bg-purple-600 text-white py-2 rounded text-sm hover:bg-purple-700">
        Open volledige inbox →
      </button>
    </div>
  );
};