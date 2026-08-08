"""Build the compact public RARE-Seq attribution-map payload.

The input is the frozen module table produced by the existing module-transport
analysis. Only source-side coordinates and Integrated Gradients values are
published; no sample-level values or identifiers are included.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path


TASKS = {
    "general_cancer": {
        "title": "Cancer versus healthy",
        "summary": "The highest-attribution source features separate into two learned neighborhoods, including NKX2-1, EGFR, SOX9, MSLN, TFF2, and TFF1.",
        "source_donors": 337,
        "ig_samples": 48,
    },
    "LUAD": {
        "title": "Lung adenocarcinoma versus other cancers",
        "summary": "The subtype objective reorganizes the map: SEZ6L2, KIRREL, PPBP, CADPS, RGS4, and WFDC2 become prominent in a distinct source attribution pattern.",
        "source_donors": 221,
        "ig_samples": 42,
    },
}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Expected FROZEN_MODULES_CSV OUTPUT_JSON")
    source, output = Path(sys.argv[1]), Path(sys.argv[2])
    grouped = {name: [] for name in TASKS}
    with source.open(newline="", encoding="utf-8-sig") as stream:
        for row in csv.DictReader(stream):
            discovery = row["discovery"]
            if discovery not in grouped or row["module_type"] != "spatial" or row["k"] != "20":
                continue
            grouped[discovery].append(
                {
                    "gene": row["gene_symbol"] or row["gene"],
                    "x": round(float(row["x"]), 6),
                    "y": round(float(row["y"]), 6),
                    "ig": round(float(row["source_ig"]), 6),
                    "direction": 1 if row["role"] == "positive" else -1,
                }
            )
    payload = {"measure": "source mean absolute Integrated Gradients", "tasks": {}}
    for name, metadata in TASKS.items():
        points = sorted(grouped[name], key=lambda item: item["ig"], reverse=True)
        if len(points) != 40:
            raise ValueError(f"Expected 40 spatial-module points for {name}, found {len(points)}")
        payload["tasks"][name] = {**metadata, "points": points}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {output} with {sum(len(v['points']) for v in payload['tasks'].values())} points")


if __name__ == "__main__":
    main()
