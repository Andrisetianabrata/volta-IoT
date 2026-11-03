#!/bin/bash
set -e
cd "$(dirname "$0")"
CXX="${CXX:-g++}"
FLAGS="-std=c++17 -Wall -Wextra -I../../lib/VoltaESP32/src -I."
pass=0
fail=0
for src in test_*.cpp; do
  t="${src%.cpp}"
  if $CXX $FLAGS "$src" -o "/tmp/volta_$t"; then
    if "/tmp/volta_$t" > "/tmp/volta_$t.log" 2>&1; then
      echo "PASS $t"
      pass=$((pass + 1))
    else
      echo "FAIL $t (runtime)"
      cat "/tmp/volta_$t.log"
      fail=$((fail + 1))
    fi
  else
    echo "FAIL $t (compile)"
    fail=$((fail + 1))
  fi
done
echo "== $pass passed, $fail failed =="
exit $fail
