import React, { useState } from "react";
import { useAdminCustomPost } from "medusa-react";

export const AetherCommandBar = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);

  const { mutate: runCommand, isLoading } = useAdminCustomPost(
    "/admin/aether/command",
    "aether-command"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await runCommand({ query });
    setResult(res);
  };

  return (
    <div className="aether-command-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Typ een commando... bijv. 'Toon lage margin producten'"
          className="w-full p-3 border rounded"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Verwerken..." : "Uitvoeren"}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};