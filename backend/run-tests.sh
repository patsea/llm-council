#!/bin/bash
pytest tests/ -v --cov=. --cov-report=term-missing --cov-fail-under=50 --ignore=venv --ignore=.venv
