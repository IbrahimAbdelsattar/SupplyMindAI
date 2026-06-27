#!/bin/bash
# Auto-format and fix linting issues
set -e

echo "Installing Python linting tools..."
pip install black isort flake8

echo "Running isort to fix import sorting..."
isort backend/ --profile black

echo "Running black to format code..."
black backend/

echo "Running flake8 for final check..."
flake8 backend/ --count --select=E9,F63,F7,F82 --show-source --statistics

echo "✅ All formatting and linting fixes applied!"
