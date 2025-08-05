import { useState } from 'react';


function SQLToERD() {
    const [sql, setSql] = useState("");

    const handleSubmit = async () => {
        const res = await fetch("http://localhost:3001/generate-drawio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql }),
        });

        const xml = await res.text();
        const blob = new Blob([xml], { type: "text/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "diagram.drawio";
        link.click();
    };

    return (
        <div>
      <textarea
          rows={10}
          cols={80}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Paste SQL DDL here..."
      />
            <br />
            <button onClick={handleSubmit}>Generate .drawio File</button>
        </div>
    );
}


export default SQLToERD;
