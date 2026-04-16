@echo off
REM Build and push API and PWA images for production with a version tag

SETLOCAL ENABLEDELAYEDEXPANSION

REM Always run from repo root
cd /d %~dp0\..

SET REGISTRY=192.168.1.226:5050
SET TAG=%1
IF "%TAG%"=="" SET TAG=v0.1

REM Build and push API for linux/amd64 only
ECHO Building and pushing API image for linux/amd64...
docker buildx build --platform linux/amd64 -t %REGISTRY%/whats-for-supper-api:%TAG% ./api --push

REM Build and push PWA for linux/amd64 only
ECHO Building and pushing PWA image for linux/amd64...
docker buildx build --platform linux/amd64 -t %REGISTRY%/whats-for-supper-pwa:%TAG% ./pwa --push

ECHO Build and push complete for tag %TAG%.
ENDLOCAL
