import React from 'react';
import { useState } from 'react';

export default function Products() {
  const [products] = useState([
    { id: 1, name: "Premium Leather Jacket", price: 189, stock: 42, margin: 42, status: "active" },
    { id: 2, name: "Limited Drop Hoodie", price: 89, stock: 156, margin: 31, status: "active" },
    { id: 3, name: "Signature Sneakers", price: 129, stock: 89, margin: 28, status: "active" },
    { id: 4, name: "Oversized Wool Coat", price: 249, stock: 23, margin: 45, status: "active" },
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Products</h1>
          <p className="text-zinc-400 mt-1">Manage your catalog and pricing</p>
        </div>
        <button className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all active:scale-[0.985]">
          + Add New Product
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-widest">
              <th className="px-8 py-5">Product</th>
              <th className="px-8 py-5">Price</th>
              <th className="px-8 py-5">Stock</th>
              <th className="px-8 py-5">Margin</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-800/60 transition-colors group">
                <td className="px-8 py-6 font-medium">{product.name}</td>
                <td className="px-8 py-6">€{product.price}</td>
                <td className="px-8 py-6">{product.stock}</td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.margin > 35 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {product.margin}%
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">Active</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-purple-400 hover:text-purple-300 text-sm opacity-0 group-hover:opacity-100 transition-all">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}