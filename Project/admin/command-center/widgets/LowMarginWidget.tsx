import React, { useEffect, useState } from "react";
import { useAdminCustomQuery } from "medusa-react";

export const LowMarginWidget = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // In echte implementatie: gebruik de command API of directe query
  useEffect(() => {
    // Mock data voor Sprint 1 demo
    setTimeout(() => {
      setProducts([
        { id: "prod_1", title: "Premium Hoodie", margin: 18, price: 89 },
        { id: "prod_2", title: "Limited Sneaker", margin: 12, price: 129 },
        { id: "prod_3", title: "Eco T-Shirt", margin: 22, price: 45 },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleOptimize = (productId: string) => {
    alert(`AI prijsoptimalisatie gestart voor product ${productId} (Sprint 2 feature)`);
  };

  if (loading) return <div className="p-4">Laden...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Lage Margin Producten</h3>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">AI Alert</span>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-gray-500">€{p.price} • Margin {p.margin}%</div>
            </div>
            <button
              onClick={() => handleOptimize(p.id)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Optimaliseer
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        AI voorspelt 14% uplift bij +8% prijsverhoging op deze producten
      </div>
    </div>
  );
};