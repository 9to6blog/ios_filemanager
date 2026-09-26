#!/usr/bin/env bash
set -euo pipefail
app='build/derived/Build/Products/Release-iphoneos/MoaFiles.app'
test -d "$app"
test -s "$app/main.jsbundle"
test -x "$app/MoaFiles"
file "$app/MoaFiles" | grep -q 'arm64'
mkdir -p build/Payload
ditto "$app" build/Payload/MoaFiles.app
cd build
zip -qry MoaFiles.ipa Payload
shasum -a 256 MoaFiles.ipa > MoaFiles.sha256
unzip -tq MoaFiles.ipa
node -e 'const fs=require("fs"); fs.writeFileSync("manifest.json",JSON.stringify({app:"Moa Files",version:"0.1.0",commit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,platform:"iphoneos-arm64",signed:false,installation:"AltStore Classic",jsBundleIncluded:true},null,2)+"\n")'
