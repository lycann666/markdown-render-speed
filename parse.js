// Fast drop-in for marked 18.1.3 (MIT, see vendor/marked/LICENSE).
//
// parse(markdown) returns exactly the HTML that marked.parse(markdown) returns
// with marked's default options (GFM on, breaks off, pedantic off, async off).
// It is built on marked's own Lexer and Parser (vendor/marked/marked.esm.js,
// byte for byte as shipped by marked 18.1.3), driven without marked.parse's
// per-call wrapper, and with the per-call Lexer/Parser instances reused.
//
// Three things make it faster than calling marked.parse() for every case:
//   1. No per-call wrapper: marked.parse() spreads fresh option objects and
//      builds an error closure on every call; here one frozen-shaped options
//      object is shared, and Lexer.lex + Parser.parse are called directly.
//   2. No per-call instances: a single Lexer and a single Parser live for
//      the whole run. Every call resets exactly the state a fresh instance
//      would start with (token list + link definitions, the inline queue and
//      the lexer state flags), so no case can see another case's data.
//   3. No pointless whole-input copy: Lexer.lex() replaces \r first, which
//      copies the whole input even when it has no carriage returns. Inputs
//      without '\r' go through blockTokens() + the inline queue directly.
//   4. A plain-text inline fast path: an inline source that holds no
//      character any inline rule can match is one text token, which is
//      exactly what marked's inline loop produces for it (its text rule
//      consumes the whole run in one match). The fast path is only taken
//      when no backslash, backtick, *, _, [, ], <, >, !, ~, &, quote,
//      colon, @, "www." or a hard-break "  \n" occurs, so no rule that
//      could fire is ever skipped.
//
// Tried and rejected (measured, 0/720 correct but no faster than marked's
// own regex on this engine, so left out): replacing the inline text regex
// with an indexOf-based or single-regex stop scanner, and a "simple" inline
// loop for sources without *, _, ~, < or \ (link/code/URL/text only) — both
// were correct but measured neutral-to-slower versus the baseline, because
// V8's regex engine already runs marked's text rule near-optimally and the
// link/code regexes dominate the remaining cost.

import { Lexer, Parser } from './vendor/marked/marked.esm.js';

// The exact defaults marked ships (its getDefaults()), built once and shared.
// Lexer/Parser fill in their tokenizer/renderer on first use and keep them.
const OPTIONS = {
  async: false,
  breaks: false,
  extensions: null,
  gfm: true,
  hooks: null,
  pedantic: false,
  renderer: null,
  silent: false,
  tokenizer: null,
  walkTokens: null,
};

// Any of these characters can start, continue or change an inline construct
// in marked's GFM inline rules (escape, code span, emphasis, link, image,
// tag, autolink, extended autolink, strikethrough, entity). A source with
// none of them, no "www." (extended autolink) and no hard break ("  \n"),
// is plain text: marked's inline loop emits exactly one text token for it.
const INLINE_SPECIAL = /[\\`*_[\]<>&!~"':@]/;

function isPlainInline(src) {
  return (
    src.length > 0 &&
    !INLINE_SPECIAL.test(src) &&
    src.indexOf('www.') === -1 &&
    src.indexOf('  \n') === -1
  );
}

class FastLexer extends Lexer {
  inlineTokens(src, tokens = []) {
    if (isPlainInline(src)) {
      // What the inline loop would emit: a single text token. Its renderer
      // escapes & < > " ' — none of which can occur here — so the token's
      // text is the source itself, byte for byte.
      tokens.push({ type: 'text', raw: src, text: src });
      return tokens;
    }
    return super.inlineTokens(src, tokens);
  }
}

const lexer = new FastLexer(OPTIONS);
const parser = new Parser(OPTIONS);

// Reset the lexer state in place instead of allocating a fresh state object
// per call: the Lexer only reads these five fields, and every one of them is
// set here, so the result is identical to a fresh instance's starting state.
function resetLexerState() {
  lexer.state.inLink = false;
  lexer.state.inRawBlock = false;
  lexer.state.linkEmitted = false;
  lexer.state.linkParenPossible = true;
  lexer.state.top = true;
}

/** The HTML marked 18.1.3 renders for `markdown`, with marked's defaults. */
export function parse(markdown) {
  if (markdown === undefined || markdown === null) {
    throw new Error('marked(): input parameter is undefined or null');
  }
  if (typeof markdown !== 'string') {
    throw new Error(
      'marked(): input parameter is of type ' +
        Object.prototype.toString.call(markdown) +
        ', string expected',
    );
  }

  // Reset exactly the per-call state a fresh Lexer would start with.
  lexer.tokens = [];
  lexer.tokens.links = Object.create(null);
  lexer.inlineQueue = [];
  resetLexerState();

  if (markdown.indexOf('\r') === -1) {
    // Same work as Lexer.lex(), minus its unconditional \r replacement,
    // which copies the whole input even when there is nothing to replace.
    lexer.blockTokens(markdown, lexer.tokens);
    const queue = lexer.inlineQueue;
    for (let i = 0; i < queue.length; i++) {
      lexer.state.inRawBlock = false;
      lexer.inlineTokens(queue[i].src, queue[i].tokens);
    }
    lexer.inlineQueue = [];
  } else {
    lexer.lex(markdown);
  }

  return parser.parse(lexer.tokens);
}
