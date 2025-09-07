import os
import base64
from pathlib import Path
from typing import Optional, Dict, Any, List
import contextvars

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
import yaml

from google import genai
from google.genai import types

# LangSmith tracing (reads LANGSMITH_* from .env; NOT your Google API key)
from langsmith import traceable

# ---------------------------
# ENV & APP
# ---------------------------
load_dotenv()

app = FastAPI(title="Car Pics API", version="1.8.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# PROMPTS (YAML) — backend/app/prompts.yml
# ---------------------------
PROMPTS_PATH = Path(__file__).resolve().parent / "prompts.yml"
try:
    with PROMPTS_PATH.open("r", encoding="utf-8") as f:
        PROMPTS: Dict[str, Any] = yaml.safe_load(f) or {}
except FileNotFoundError:
    raise RuntimeError(f"Missing prompts.yml at {PROMPTS_PATH}")
except Exception as e:
    raise RuntimeError(f"Failed to load {PROMPTS_PATH}: {e}")

STYLE_MAP: Dict[str, Dict[str, str]] = PROMPTS.get("styles") or {}

# ---------------------------
# MODEL NAMES (override via env if desired)
# ---------------------------
IMAGE_MODEL_NAME = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image-preview")
TEXT_MODEL_NAME = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")

MAX_IMAGE_BYTES = 7 * 1024 * 1024  # ~7 MB

# ---------------------------
# Per-request client (no .env Google key, no globals)
# ---------------------------
_current_client: contextvars.ContextVar[Optional[genai.Client]] = contextvars.ContextVar(
    "car_pics_client", default=None
)

def _get_client() -> genai.Client:
    cli = _current_client.get()
    if cli is None:
        raise RuntimeError("No Google GenAI client set in request context")
    return cli

def build_prompt(user_prompt: str, style_key: Optional[str]) -> str:
    """
    Merge the selected style template with the user prompt.
    If style not found or 'none', just return the user prompt.
    """
    key = (style_key or "none").strip()
    style = STYLE_MAP.get(key)
    if not style:
        return user_prompt.strip()
    template = (style.get("template") or "{user_prompt}").strip()
    try:
        return template.format(user_prompt=user_prompt.strip())
    except Exception:
        # Fallback if user text has unmatched braces etc.
        return f"{template}\n\n{user_prompt}".strip()

@traceable(name="car-pics.refine", tags=["car-pics", "refine", "gemini-2.5-flash"])
def refine_user_prompt(
    model_name: str,
    user_prompt: str,
    style_key: str,
    style_label: str,
    style_desc: str,
    has_image: bool,
) -> str:
    """
    Use Gemini Flash to rewrite the user's request into a concise, photography-optimized directive.
    Only safe primitives are traced (no API keys, no raw image bytes).
    """
    instruction = f"""
You are a prompt engineer for photo-style image {'EDITING' if has_image else 'GENERATION'}.
Rewrite the user's request as a concise directive (1–3 sentences) optimized for photography.

Requirements:
- Keep the user's intent; don't add new subjects, brands, or people.
- Use concrete camera/lighting/composition terms when relevant (e.g., focal length, aperture, angle, time of day).
- Match this style: {style_label}. Use this style description as context:
---
{style_desc}
---
- If an input image is provided, phrase the request as an EDIT (e.g., change background/lighting/ambience) without altering key subject identity.
- Avoid disclaimers, headings, lists, or quotes. Output only the refined directive.
""".strip()

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=instruction),
                types.Part.from_text(text=f"User request:\n{user_prompt.strip()}"),
            ],
        )
    ]

    client = _get_client()
    try:
        # Prefer "thinking" if available
        resp = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
            ),
        )
    except Exception:
        # Fallback without thinking config
        resp = client.models.generate_content(model=model_name, contents=contents)

    refined = ""
    try:
        refined = getattr(resp, "text", "") or ""
    except Exception:
        refined = ""
    if not refined:
        try:
            cand = resp.candidates[0]
            refined = "".join(
                getattr(p, "text", "")
                for p in (cand.content.parts or [])
                if getattr(p, "text", None)
            )
        except Exception:
            refined = user_prompt.strip()

    return (refined or user_prompt).strip()

@traceable(name="car-pics.generate", tags=["car-pics", "image", "gemini-2.5-flash-image-preview"])
def generate_image_and_text(model_name: str, parts: List[types.Part]) -> Dict[str, Any]:
    """
    Call the image model and return combined text + image outputs.
    Traced with safe inputs. Outputs include data URLs so you can view them in LangSmith.
    """
    client = _get_client()
    text_out: List[str] = []
    images_out: List[Dict[str, str]] = []

    for chunk in client.models.generate_content_stream(
        model=model_name,
        contents=types.Content(role="user", parts=parts),
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    ):
        if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
            part = chunk.candidates[0].content.parts[0]
            if getattr(part, "text", None):
                text_out.append(part.text)
            elif getattr(part, "inline_data", None) and part.inline_data.data:
                mime = part.inline_data.mime_type or "image/png"
                b64 = base64.b64encode(part.inline_data.data).decode("ascii")
                images_out.append(
                    {"mime_type": mime, "base64": b64, "data_url": f"data:{mime};base64,{b64}"}
                )

    return {"text": ("".join(text_out)).strip(), "images": images_out}

# ---------------------------
# SINGLE ENDPOINT
# ---------------------------
@app.post("/generate")
async def generate(
    prompt: str = Form(..., description="Text prompt (required)"),
    image: Optional[UploadFile] = File(default=None, description="Optional reference image"),
    style: Optional[str] = Form(default="none", description="Style key from prompts.yml"),
    api_key: str = Form(..., description="Google API key (required)"),
):
    # Require API key from the input box (no .env fallback)
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="api_key is required")

    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")

    # Build per-request client using only the submitted key
    try:
        client = genai.Client(api_key=api_key.strip())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid api_key provided")

    # Put client into context for traced helpers
    token = _current_client.set(client)
    try:
        # Style context
        style_key = (style or "none").strip()
        style_obj = STYLE_MAP.get(style_key, {})
        style_label = style_obj.get("label", style_key)
        style_desc = (style_obj.get("template") or "").strip()

        # 1) Refine user prompt (traced)
        has_image = image is not None
        refined = refine_user_prompt(
            model_name=TEXT_MODEL_NAME,
            user_prompt=prompt,
            style_key=style_key,
            style_label=style_label,
            style_desc=style_desc,
            has_image=has_image,
        )

        # 2) Merge refined text into style template
        final_prompt = build_prompt(refined, style_key)

        # 3) Build parts for generation
        parts: List[types.Part] = []
        if image is not None:
            ctype = image.content_type or ""
            if not ctype.startswith("image/"):
                raise HTTPException(status_code=400, detail="image must be of type image/*")
            data = await image.read()
            if not data:
                raise HTTPException(status_code=400, detail="image file is empty")
            if len(data) > MAX_IMAGE_BYTES:
                raise HTTPException(status_code=400, detail="image too large (>7MB)")
            parts.append(types.Part.from_bytes(data=data, mime_type=ctype))
        parts.append(types.Part.from_text(text=final_prompt))

        # 4) Generate (traced)
        gen_result = generate_image_and_text(model_name=IMAGE_MODEL_NAME, parts=parts)

        # Return ONLY text + images (no prompts, no meta)
        return {
            "text": gen_result["text"],
            "images": gen_result["images"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
    finally:
        # Always reset the client context
        _current_client.reset(token)
