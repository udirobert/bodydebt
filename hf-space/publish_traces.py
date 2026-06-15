"""
Publish the Body Debt agent trace dataset to a Hugging Face dataset repo.

This is what unlocks the "Sharing is Caring" bonus quest for the
Build Small Hackathon. The dataset is a small JSONL of canonical
stressor profiles and the full reasoning chain the app produces for
each.

Usage:
    export HF_TOKEN=hf_xxx...
    python publish_traces.py
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ID = os.environ.get("BODY_DEBT_TRACES_REPO", "Papajams/body-debt-traces")
HERE = Path(__file__).parent
TRACES_PATH = HERE / "body_debt_traces.jsonl"
README_PATH = HERE / "body_debt_traces_README.md"


def main() -> None:
    if not TRACES_PATH.exists():
        raise SystemExit(
            f"Missing {TRACES_PATH}. Run `python generate_trace_dataset.py` first."
        )

    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `huggingface-cli login` or set HF_TOKEN."
        ) from e

    print(f"Creating dataset repo at {REPO_ID} (if it does not exist)...")
    api.create_repo(
        repo_id=REPO_ID,
        repo_type="dataset",
        private=False,
        exist_ok=True,
    )

    patterns = ["body_debt_traces.jsonl"]
    if README_PATH.exists():
        patterns.append("body_debt_traces_README.md")

    print(f"Uploading {', '.join(patterns)} to {REPO_ID}...")
    api.upload_folder(
        folder_path=str(HERE),
        repo_id=REPO_ID,
        repo_type="dataset",
        allow_patterns=patterns,
    )

    print(f"Done. View the dataset at: https://huggingface.co/datasets/{REPO_ID}")


if __name__ == "__main__":
    main()
