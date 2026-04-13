#!/usr/bin/env bash
# Render Build Script
# This script is executed by Render during deployment.

set -o errexit  # exit on error

echo "--- Installing Python dependencies ---"
pip install --upgrade pip
pip install -r requirements.txt

echo "--- Collecting static files ---"
python manage.py collectstatic --no-input

echo "--- Running database migrations ---"
python manage.py migrate --no-input

echo "--- Build complete ---"
