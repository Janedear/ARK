#!/bin/sh
# Starts the ARK Local Hub on Linux, Raspberry Pi or Mac. No internet needed.
# Uses the Node.js copy the library downloader saved, or one already installed.
cd "$(dirname "$0")/.." || exit 1
case "$(uname -m)" in aarch64|arm64) A=arm64 ;; *) A=x64 ;; esac
OS=linux; [ "$(uname)" = Darwin ] && OS=darwin
DIR="library/files/node-$OS-$A"
for T in library/files/node-v*-"$OS"-"$A".tar.*; do
  if [ -f "$T" ] && [ ! -d "$DIR" ]; then mkdir -p "$DIR" && tar -xf "$T" -C "$DIR" --strip-components=1; fi
done
NODE="$DIR/bin/node"
[ -x "$NODE" ] || NODE=$(command -v node)
if [ -z "$NODE" ]; then echo "Node.js was not found. Run library/get-library.sh while you still have internet."; exit 1; fi
exec "$NODE" hub/ark-hub.mjs