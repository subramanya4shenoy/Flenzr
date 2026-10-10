import json
from pathlib import Path
from app.main import app


def export_openapi():
    openapi_schema = app.openapi()
    contracts_dir = Path(__file__).resolve().parent.parent.parent / "contracts"
    contracts_dir.mkdir(parents=True, exist_ok=True)
    out_file = contracts_dir / "openapi.json"
    with open(out_file, "w") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"OpenAPI schema successfully exported to {out_file}")


if __name__ == "__main__":
    export_openapi()
