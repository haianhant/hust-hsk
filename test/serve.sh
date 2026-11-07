#!/bin/bash
# Phục vụ bản build tĩnh out/ để test bằng trình duyệt headless.
cd "$(dirname "$0")/.." || exit 1
python3 -m http.server 8321 --directory out
