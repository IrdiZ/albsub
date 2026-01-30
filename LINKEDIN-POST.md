# LinkedIn Post Draft

---

🇦🇱 I built an open-source subtitle translator for Albanian because… there literally aren't any subtitles.

January. 3 AM. I just want to watch *Christmas in Love* (2004) — Boldi & De Sica, classic Italian cinepanettone. The kind of movie every Albanian kid grew up watching dubbed on TV.

Problem: no English subs. No Albanian subs. Nothing. I went through OpenSubtitles, Subscene, Podnapisi, SubDL, random forums from 2008 — zero results.

So I did what any reasonable engineer would do at 3 AM: I built a whole translation pipeline.

Grabbed the Italian .srt file. Ran it through an LLM. 15 minutes later — working Albanian subtitles. Validated. Formatted. Ready to watch.

Then I realized: this isn't just my problem. **Albanian is one of the most underserved languages in the global subtitle ecosystem.** 10M+ speakers. We watch Italian comedies, Turkish dramas, Greek films, Bollywood. But subtitle coverage? Virtually zero. What exists is Google Translate garbage that turns comedy into confusion.

So I built **AlbSub** — open-source CLI that translates .srt files into Albanian using any LLM.

What makes it different from slapping your .srt into Google Translate:

→ 🎭 Context-aware — the LLM reads surrounding dialogue, not isolated lines
→ 🗣️ Natural Albanian — colloquial, not textbook. "Gëzuar ditëlindjen! E mbajta mend." not "Ditëlindje e gëzuar! Unë e kujtova atë."
→ ✅ Validation engine — checks every block for dropped lines, missing tags, broken formatting
→ 🌍 Any source language — Italian, English, Turkish, Greek, French, German, Arabic, Hindi…
→ 🤖 Bring your own model — GPT-4o, Claude, Llama via Ollama, any OpenAI-compatible endpoint
→ ⚡ Parallel workers — translate full movies in minutes, not hours

Is it perfect? No. A native speaker will always catch things the AI misses (it once used feminine "kjo" for a 54-year-old Italian man 💀). But it gets you 90% there in minutes — and for a language with basically zero subtitle infrastructure, that's a game changer.

**This is open source. I want people to contribute.**

Here's what would make AlbSub even better:
🔧 Gheg/Tosk dialect support
🔧 Quality benchmarks against human translations
🔧 More language pair testing (Turkish→Albanian especially)
🔧 A web UI so non-technical people can use it
🔧 Integration with subtitle databases for direct upload

If you're Albanian, if you care about language accessibility, if you're into NLP/LLMs, or if you just think every language deserves subtitles — come build with us.

The repo is live. PRs welcome. Issues welcome. Stars welcome. Albanian subtitles? Long overdue. 🔥

GitHub: https://github.com/IrdiZ/albsub

#OpenSource #Albanian #Subtitles #NLP #LLM #CulturalAccessibility #Shqip #AI #Diaspora

---
