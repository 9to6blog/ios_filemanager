#!/usr/bin/env bash
set -euo pipefail
app='build/simulator/Build/Products/Release-iphonesimulator/MoaFiles.app'
test -d "$app"
mkdir -p build/preview
xcrun simctl list devices available --json > build/preview/devices.json
udid=$(node -e 'const d=require("./build/preview/devices.json");const all=Object.entries(d.devices).flatMap(([runtime,devices])=>devices.map(device=>({...device,runtime}))).filter(d=>d.name.includes("iPhone"));const chosen=all.find(d=>d.name==="iPhone 17")||all[0];if(!chosen)throw Error("No iPhone simulator");require("fs").writeFileSync("build/preview/simulator.json",JSON.stringify(chosen,null,2));process.stdout.write(chosen.udid)')
xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b
xcrun simctl status_bar "$udid" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
xcrun simctl install "$udid" "$app"
container=$(xcrun simctl get_app_container "$udid" app.ninetosix.moafiles data)
# Disposable simulator fixtures only; these are never included in the IPA.
mkdir -p "$container/Documents/문서" "$container/Documents/사진" "$container/Documents/영상"
cp assets/icon.png "$container/Documents/테스트 이미지.png"
printf 'iOS 시뮬레이터 테스트 파일입니다.\n' > "$container/Documents/테스트 문서.txt"
xcrun simctl ui "$udid" appearance light
xcrun simctl launch "$udid" app.ninetosix.moafiles -AppleLanguages '(ko)' -AppleLocale ko_KR
sleep 10
xcrun simctl io "$udid" screenshot build/preview/app-light.png
xcrun simctl ui "$udid" appearance dark
sleep 2
xcrun simctl io "$udid" screenshot build/preview/app-dark.png
xcrun simctl spawn "$udid" log show --last 2m --style compact --predicate 'process == "MoaFiles"' > build/preview/app-runtime.log
# A crash is a failed smoke check, not a usable preview.
xcrun simctl spawn "$udid" launchctl list | grep 'app.ninetosix.moafiles' > build/preview/process.txt
awk '$1 ~ /^[0-9]+$/ { running=1 } END { exit !running }' build/preview/process.txt
