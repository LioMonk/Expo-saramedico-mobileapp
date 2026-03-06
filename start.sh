#!/bin/bash
pids=$(lsof -t -i:8081)
if [ ! -z "$pids" ]; then kill -9 $pids; fi

node_pids=$(pgrep -f "react-native")
if [ ! -z "$node_pids" ]; then kill -9 $node_pids; fi

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

npm start -- --clear
