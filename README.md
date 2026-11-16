# markdown-render-speed

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/lycann666/markdown-render-speed/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/lycann666/markdown-render-speed/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

A fast drop-in replacement for marked 18.1.3's `parse()`: it renders exactly the same HTML as `marked.parse()` with marked's default options (GFM on, breaks off, pedantic off, async off), but faster. It is built on marked's own Lexer and Parser (vendored byte-for-byte in `vendor/marked/`), driven without `marked.parse()`'s per-call wrapper, with the Lexer/Parser instances reused across calls, no pointless whole-input `\r` copy, and a plain-text inline fast path for sources no inline rule can match. Practice set: 720/720 cases byte-identical to marked 18.1.3, ~1.10× the kit baseline speed.

## Run it

```sh
node main.ts
```

`main.ts` reads every case from `/input/cases.json` and writes `/output/html.json` (the HTML strings in the cases' order). Outside a container, `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` stand in for `/input` and `/output`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=5f3j6jyb&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
