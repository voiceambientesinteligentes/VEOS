@echo off
title VEOS Portal - 127.0.0.1:8877
cd /d "%~dp0"
python run.py
if errorlevel 1 pause
