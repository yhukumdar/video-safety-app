#!/bin/bash

echo "🚀 Starting Video Safety App..."

# Change to backend directory
cd "$(dirname "$0")/.." || exit

# Activate virtual environment
source venv/bin/activate

# Start combined process
python scripts/start.py