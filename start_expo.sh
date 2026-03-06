#!/bin/bash
pids=$(lsof -t -i:8081)
if [ ! -z "$pids" ]; then kill -9 $pids; fi

expo_pids=$(pgrep -f "expo")
if [ ! -z "$expo_pids" ]; then kill -9 $expo_pids; fi

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

npx expo start -c
