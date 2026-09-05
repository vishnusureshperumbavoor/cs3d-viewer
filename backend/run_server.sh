#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Increase timeout for large wheel downloads (PyTorch, SimpleITK, TotalSegmentator)
export UV_HTTP_TIMEOUT=600

# Configure user-writable directory for TotalSegmentator model weights & nnUNet results
export TOTALSEG_HOME_DIR="$HOME/.totalsegmentator_user"
export TOTALSEG_WEIGHTS_PATH="$HOME/.totalsegmentator_user/nnunet/results"
mkdir -p "$TOTALSEG_WEIGHTS_PATH"

VENV_DIR="venv"

# Check for uv in standard paths
UV_BIN=""
if command -v uv >/dev/null 2>&1; then
    UV_BIN="uv"
elif [ -f "$HOME/.local/bin/uv" ]; then
    UV_BIN="$HOME/.local/bin/uv"
elif [ -f "$HOME/.cargo/bin/uv" ]; then
    UV_BIN="$HOME/.cargo/bin/uv"
elif [ -f "/snap/bin/astral-uv" ]; then
    UV_BIN="/snap/bin/astral-uv"
fi

# If venv doesn't exist yet, try to create with Python 3.12
if [ ! -d "$VENV_DIR" ]; then
    if [ -n "$UV_BIN" ]; then
        echo "Using uv ($UV_BIN) to create isolated Python 3.12 virtual environment..."
        "$UV_BIN" venv --python 3.12 "$VENV_DIR"
        DO_INSTALL=1
    else
        # Try finding a compatible python (3.9 - 3.12)
        PYTHON_CMD=""
        for cmd in python3.12 python3.11 python3.10 python3.9; do
            if command -v "$cmd" >/dev/null 2>&1; then
                PYTHON_CMD="$cmd"
                break
            fi
        done

        if [ -n "$PYTHON_CMD" ]; then
            echo "Creating virtual environment using $PYTHON_CMD..."
            "$PYTHON_CMD" -m venv "$VENV_DIR"
            DO_INSTALL=1
        else
            echo "=========================================================================="
            echo "⚠️ Compatible Python version (3.10 - 3.12) not found."
            echo "Your host system is running Python 3.14, which PyTorch does not support yet."
            echo ""
            echo "👉 Recommended 1-Step Fix (Install 'uv'):"
            echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
            echo "   (or: sudo snap install astral-uv)"
            echo ""
            echo "Then run:"
            echo "   npm run start:server --install"
            echo "=========================================================================="
            exit 1
        fi
    fi
fi

# If --install flag is passed or venv was newly created, install dependencies
if [[ "$*" == *"--install"* ]] || [ -n "$DO_INSTALL" ]; then
    echo "Installing backend dependencies into virtual environment..."
    if [ -n "$UV_BIN" ]; then
        if ! command -v nvidia-smi >/dev/null 2>&1; then
            echo "No NVIDIA GPU detected. Installing lightweight PyTorch CPU build (~150MB instead of ~3.5GB CUDA)..."
            "$UV_BIN" pip install --python "$VENV_DIR" torch torchvision --index https://download.pytorch.org/whl/cpu
        fi
        "$UV_BIN" pip install --python "$VENV_DIR" -r requirements.txt
    else
        ./$VENV_DIR/bin/pip install --upgrade pip
        if ! command -v nvidia-smi >/dev/null 2>&1; then
            ./$VENV_DIR/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
        fi
        ./$VENV_DIR/bin/pip install -r requirements.txt
    fi
fi

echo "Starting FastAPI AI Backend on http://localhost:8000..."
exec ./$VENV_DIR/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
