#!/usr/bin/env bash
# Idempotent REA + Ghidra 12.1.4 install (run as root). Needs github.com + objects/release-assets.githubusercontent.com.
set -euo pipefail
G=/opt/ghidra_12.1.4_PUBLIC
JH=/usr/lib/jvm/java-21-openjdk-amd64
URL=https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.1.4_build/ghidra_12.1.4_PUBLIC_20260921.zip
SHA=ddac49f903da9d5bac833e5cc79395098b9c33cfd3279be5f31bd00387d2d4db
[ -x "$JH/bin/javac" ] || { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-21-jdk-headless unzip; }
if [ ! -x "$G/support/analyzeHeadless" ]; then
  mkdir -p /opt/dl && curl -fsSL -o /opt/dl/g.zip "$URL"
  echo "$SHA  /opt/dl/g.zip" | sha256sum -c -
  unzip -q /opt/dl/g.zip -d /opt && rm -rf /opt/dl
fi
command -v rea >/dev/null || npm install --global rea-agents@6.8.0
cat > /etc/profile.d/rea.sh <<P
export GHIDRA_INSTALL_DIR=$G JAVA_HOME=$JH
P
if ! claude mcp list 2>/dev/null | grep -q '^rea:'; then
  (cd /tmp && claude mcp add --scope user rea -e GHIDRA_INSTALL_DIR=$G -e JAVA_HOME=$JH -- "$(command -v rea)" mcp)
fi
GHIDRA_INSTALL_DIR=$G JAVA_HOME=$JH rea doctor --provider ghidra --json | grep -q '"ghidra-version","ok":true'
echo "REA ready"
