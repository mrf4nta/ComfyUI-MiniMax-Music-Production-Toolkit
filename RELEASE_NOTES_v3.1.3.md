# Music Production Toolkit 3.1.3

A Swiss Army knife for local music production on ComfyUI.

A patch on top of 3.1.2: the model dropdown now says what is already downloaded and
offers six more chat models, one chat model is the default in every LLM node, the
restoration chain ships switched off, and two download problems were fixed.

## The model dropdown says what is already there

The dropdown lists installed GGUFs **and** catalog candidates, and until now nothing
distinguished them — so choosing a model could start a several-gigabyte download without
saying so.

- **Every entry is labelled.** `✔` marks a file that is already in `models/llm`, `⬇` a
  catalog model that is not downloaded yet, with its download size and its star rating
  appended, and the widget line reads `Model - 3 installed, 16 to download`.
- **The labels are display only.** The value stored in a workflow stays the plain file
  name, so an existing workflow keeps loading after that download — nothing is rewritten
  by looking at a file. If the inventory cannot be read (Python side updated, ComfyUI not
  restarted yet), the dropdown falls back to plain names instead of guessing.

## Six more chat models

Each one verified against its repository (pinned commit, exact byte size, publicly
readable) and rated for this toolkit's tasks, with the reason recorded in `rating_note`:

- **`gemma-4-26B_q4_0-it.gguf`** (13.45 GiB, ★★★★★) — Google's quantization-aware 26B
  mixture-of-experts with about 4B active parameters: the largest quality step that still
  fits a 16–24 GiB card, and faster than a dense model of that size.
- **`gemma-4-26B-A4B-it-UD-Q5_K_M.gguf`** (19.70 GiB, ★★★★☆) — the same model with more
  precision, for a 32 GiB card that can afford it.
- **`gemma-4-E4B_q4_0-it.gguf`** (4.80 GiB, ★★★★☆) — the small Gemma 4, same family as the
  12B QAT, for 8 GiB cards and quick drafts.
- **The fast LFM2.5 line**: `LFM2.5-8B-A1B-Q4_K_M.gguf` (4.80 GiB, ★★★☆☆, an 8B
  mixture-of-experts with ~1B active parameters per token), `LFM2.5-2.6B-Q4_K_M.gguf`
  (1.56 GiB, ★★★☆☆) and `LFM2.5-1.2B-Instruct-Q4_K_M.gguf` (0.68 GiB, ★★☆☆☆) for CPU runs.
  Their speed is a property; their quality on this toolkit's long structured prompts is
  **not measured** — the rating note says so.

All six are `optional` + `no_auto_download` like every other candidate: the model check
reports them, the model selected in the LLM node is the one that is fetched. The Gemma 4
26B/E4B need the `gemma4` architecture in the llama.cpp build and LFM2.5 needs `lfm2` /
`lfm2moe`; the build this release was tested against knows all three.

## `Qwen_Qwen3.5-9B-Q4_K_M.gguf` is the default chat model

A 9B Q4_K_M at 6.2 GiB is the everyday size for this workload — it fits an 8–12 GiB card
as well as a larger one — and it is a catalog entry, so a first run that starts with the
default fetches the file itself. One constant feeds the chat node, and the central
settings node derives its fields from that node, so the same name is the default in every
LLM node. The bundled example workflow stores it in all four places.

## The restoration chain ships off

FlashSR is the expensive part of the audio chain: 2.3 GB of weights on first use and
minutes per song. In the main workflow it was already off for YuE2 and on for MiniMax; in
the Audio Enhancement Lab it was on unconditionally.

- **Both example workflows now ship with the chain off** — the Lab's `Refinement enabled`
  switch is `false`, the PRE low-pass is bypassed (`bypass=true`) and the crossover stands
  at `Original SRC only`. Those two stages exist for FlashSR, so leaving them on while it
  is off was misleading — and at `Original SRC only` the D stage would have run and thrown
  the FlashSR signal away.
- **Switching the chain on means switching its helpers on as well**: B `bypass=false`
  (PRE 10 kHz is the starting point) and D `mode=FlashSR only` (`Original + FlashSR air`
  blends the original low band back in). Both workflow notes say so, as does
  [the workflow documentation](docs/WORKFLOW_OPTIMIZED.md).
- **The FlashSR stage lost its own `auto_download` switch.** It was a second download
  toggle next to the model check node's flags, and with it OFF a missing weight set turned
  the stage into a silent no-op. A stage that runs now fetches the weights it needs —
  logged with progress, resumable, disk-space checked — exactly like the Whisper
  checkpoint, and a fetch that fails skips the stage with one warning line instead of
  ending the run. The Refinement gate stays the switch that decides whether the stage runs
  at all; the model check node stays the place where downloads are decided for a run.

## Fixed in 3.1.3

- **A chat model picked from the catalog could not download at all.** The catalog names
  the LLM folder once, on the *group*; the loader handed the raw per-file entry to the
  downloader, which refuses an entry without a target — so selecting a catalog model ended
  in `LLM model download failed: entry has no target directory`. The loader now hands over
  the effective folder (the group's value, `models/llm` as the fallback) and checks it
  before starting anything.
- **The LLM check in the model check node is on by default again.** It had been switched
  off as the guard against a multi-gigabyte download nobody asked for; since the catalog
  now marks every chat-model candidate `optional` *and* `no_auto_download`, the check
  reports which candidates are present without transferring anything.
- **Two documentation claims about the FlashSR weights were wrong** and are corrected: the
  stage *skips* when it cannot fetch them (it does not "fail fast"), and the weights come
  from `laion/FlashSR_One-step_Versatile_Audio_Super-resolution` since the earlier
  `jakeoneijk/FlashSR_weights` dataset stopped answering in June 2026.

## Assets

- `Music_Production_Toolkit_v3.1.3.json`
- `Music_Production_AudioEnhance_v3.1.3.json`
- `ComfyUI-MiniMax-Music-Production-Toolkit-v3.1.3.zip`
- `SHA256SUMS.txt`

The previous release archives stay where they are.

## Upgrading

Replace the toolkit folder, restart ComfyUI and refresh the browser. Re-import the two
bundled workflows if you want the new defaults (chain off, PRE bypassed, crossover
`Original SRC only`, the 9B chat model); an existing workflow keeps working unchanged.

One node input was **removed**: the FlashSR stage's `auto_download` widget. ComfyUI maps
widgets positionally, and the two remaining widgets (`lowpass_input`, `output_sr`) kept
their places, so workflows saved with the old node still load — the stale value and the
stale input entry are dropped the next time such a workflow is saved. If you had switched
that toggle off deliberately: the stage now fetches its weights whenever it runs, which is
what the Refinement gate is for.

Model files you already have stay valid. Everything new in the catalog is a *catalog*
entry — nothing is downloaded until you select or check it.
