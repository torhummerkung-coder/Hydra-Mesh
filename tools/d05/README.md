# D05 v1.0.40 Frozen Gateway Snapshot (Synthetic Only)

This directory contains **synthetic-gateway-v1.0.40.zip** — the exact Python runtime source
of the previously reviewed standalone v1.0.40 SQLite prototype. The archive is intentionally
kept separate from the Next.js/Prisma patient data stack.

**SHA-256 (archive):**
`7b012325bb8fbd9da9464ade922989863aac201c3250f39070f12ae2e730c88f`

**Git blob SHA-1:**
`64d95aec626bee8a2e3307f4d7645266ab4eba57`

Archive entries: `hydra_d05/__init__.py`, `hydra_d05/api.py`,
`hydra_d05/ledger.py`, `requirements.txt`, `requirements-dev.txt`.

The repository's `scripts/d05_unpack_verified.py` enforces this archive hash and each
individual Python file hash, rejects unexpected/duplicate paths and symlinks, and refuses
overwriting a non-empty destination. Extract **only to a disposable isolated sandbox**:

```sh
python scripts/d05_unpack_verified.py --dest /tmp/d05-src
python -m pip install -r /tmp/d05-src/requirements-dev.txt
HYDRA_D05_SOURCE_ROOT=/tmp/d05-src npm run test:d05-live
```

`npm run test:d05-adapter` exercises mocked fetch responses without a real server;
`npm run test:d05-live` spawns the Python HTTP server on a free localhost port with
random temporary runner/admin/audit keys and an ephemeral SQLite DB. Both are
synthetic tests; neither validates real Owner grant signatures, PHI, production security,
distributed PostgreSQL, or actual Skill invocation.

The original v1.0.40 complete evidence package, Python 55-test suite and
13-check Python standalone loopback smoke are maintained as **separate historical artifacts**
outside this repository snapshot. Do not claim this ZIP contains the full evidence pack
or that GitHub CI executed those 55 Python tests.

This is a **staging snapshot**. Before final merge/release, an independent reviewer should
prefer to promote the reviewed Python sources to separately tracked text files (to make
Git diff and code ownership checks effective) and run cross-host PostgreSQL tests.
