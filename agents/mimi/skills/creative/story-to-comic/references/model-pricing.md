# Image models: prices, references and selection

Snapshot of published list prices, 7 November 2026. Prices and free quotas move; re-read the vendor page before you quote one.

## Try first

1. **Seedream 4.0.** 200 free images for a new BytePlus account, no card, 14 references, 4K. It covers the whole comparison before you pay.
2. **Gemini Nano Banana 2.1.** $0.0336 per 1K, 14 references, 4 characters, 1:4 strips. The default candidate.
3. **Illustrious XL plus a character LoRA.** Free per image after the GPU, native 1536 px anime, 202k LoRAs. The locked-house-style route.

## Cloud models

| Model | Access | $/1K | Refs | Free trial | Use for |
| --- | --- | --- | --- | --- | --- |
| Gemini Nano Banana 2.1 | AI Studio, Vertex | 0.0336 | 14 (4 characters) | None | Default panels |
| Gemini Nano Banana 2 Lite | AI Studio | 0.0336 | Limited | None | Drafts, not refs |
| Gemini 3 Pro Image | AI Studio, Vertex | 0.134 | 14 total (5 characters) | None | Covers, hero panels |
| Seedream 4.0 | BytePlus ModelArk | 0.030 | 14 | 200 images | First test |
| Seedream 4.5 | BytePlus ModelArk | 0.040 | 14 | 200 images | Better identity |
| Seedream 5.0 Lite | BytePlus ModelArk | 0.035 | 14 | 50 images | Newer lite |
| Seedream 5.0 Pro | BytePlus ModelArk | 0.045 | 10 | None | Newest |
| Qwen-Image-3.0 | Alibaba Model Studio | 0.030 + 0.003/ref | 3 | 10 images | Text and signage |
| Qwen-Image-3.0 Pro | Alibaba Model Studio | 0.040 | 3 | 10 images | Text at 2K |
| FLUX.2 [pro] | BFL API | 0.045 edit | 8 | None | Alternate style |
| FLUX.2 [klein] 4B | Self-host, Replicate | 0.014 | 8 | Apache-2.0 | Volume |
| FLUX 3 Klein | BFL API, open weights | 0.009 | — | Open weights | Thumbnails |
| GPT-Image-2.6 | OpenAI API | 0.053 medium | — | None | Editing precision |

- Nano Banana 2 Lite costs the same as 2.1 and is not built for multiple references. It is a draft model.
- GPT-Image is token-priced: $0.053 is a 1024 px medium output and rises with reference images.
- BytePlus pages disagree on Seedream 4.5: ModelArk lists $0.040, the LAS doc $0.048. Quote the region you call.

## Local models

| Model | Base | VRAM | Licence | Why try it |
| --- | --- | --- | --- | --- |
| Illustrious XL | SDXL | 8 GB+ | Check the model card | 202k LoRAs, native 1536 px, booru tags |
| NoobAI XL | Illustrious | 8 GB+ | Non-commercial | 12.7M images, strongest tag detail |
| Animagine XL 4.0 | SDXL | 8 GB | Commercial | Forgiving defaults |

Run them in ComfyUI with IP-Adapter for the face, ControlNet for the pose and a character LoRA. That stack is the only route to a fixed house style at zero marginal cost.

## Test protocol

Six panels, two characters, one set, one style plate. Use the same three references, the same prompt and the same seed family for every model.

Score each panel 1 to 5 on identity, pose, style and artifacts. Count redraws per accepted panel. The model with the fewest redraws wins, not the one with the prettiest single image. Keep the failures; they show where each model breaks.

## Cost formula

```
episode = panels * attempts * (unit + refs_per_call * ref_unit)
        + bible_images * unit
        + LLM calls
```

Webtoon episode: 50 panels, 1.8 attempts, 2 references, 10 bible images, $1.50 LLM. That is $4.86 at $0.0336. Print issue: 120 panels, 30 bible images. That is about $9.77.

## Where the number lives

- Google Gemini: `aistudio.google.com/docs/pricing` and `aistudio.google.com/docs/models/<id>`.
- BytePlus Seedream: the ModelArk product page, plus `ai.byteplus.com/ark/.../docs/image-generation-api` for reference limits.
- Alibaba Qwen: `qwencloud.com/models/<id>`; the free quota is Singapore-only.
- Black Forest Labs: `bfl.ai/pricing` and `docs.bfl.ai`.
- OpenAI: `developers.openai.com/api/docs/guides/image-generation`.

Google's image price is per output token, not per image: at $30 per 1M output tokens, a 1K image (1120 tokens) is $0.0336 and a 2K image (1680 tokens) is $0.0504. Read the token line before comparing a headline price.
