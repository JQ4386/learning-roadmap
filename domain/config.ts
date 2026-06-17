// ===========================================================================
// domain/config.ts — THE ONLY FILE YOU EDIT TO RESPIN THIS APP FOR A NEW SUBJECT
// ===========================================================================
//
// This app is intentionally NOT a generic, runtime-configurable platform. The
// design constraint is "forkability via regeneration": ALL opinionated domain
// content (categories, curriculum, quiz bank, scout persona) is quarantined in
// this single file. Everything under components/ and lib/ is domain-agnostic and
// reads ONLY from the exports below.
//
// To respin for a med student, a law student, a different engineer, etc.:
//   - Rewrite CATEGORIES, PHASES (curriculum), QUESTIONS (quiz bank),
//     and SCOUT_PROMPT.
//   - Do NOT touch any other file. IDs are stable handles — quiz questions
//     reference curriculum item IDs via their `src` array, so if you renumber
//     curriculum IDs you must update the quiz `src` references too.
//
// Keep this file the single source of truth for "what is being learned".
// ===========================================================================

export type Category = {
  id: string;
  label: string;
  short: string;
  color: string;
};

export type TrackItem = {
  id: string;
  cat: string; // Category id
  title: string;
  meta: string;
  desc: string;
  url: string; // "" when there is no link
};

export type Phase = {
  id: string;
  title: string;
  note: string;
  defaultOpen: boolean;
  items: TrackItem[];
};

export type Question = {
  id: string;
  cat: string; // Category id
  src: string[]; // TrackItem ids that teach this concept (drives "recent" quiz mode)
  q: string;
  opts: [string, string, string, string];
  a: number; // index of correct option (0-3)
  why: string;
};

// ---------------------------------------------------------------------------
// CATEGORIES — the "knowledge frame"
// ---------------------------------------------------------------------------
export const CATEGORIES: Category[] = [
  { id: "internals", label: "Model internals", short: "Internals", color: "#7DD3FC" },
  { id: "posttrain", label: "Post-training & RL", short: "RL", color: "#C4B5FD" },
  { id: "patterns", label: "Agent patterns", short: "Patterns", color: "#FF8A3D" },
  { id: "context", label: "Context engineering", short: "Context", color: "#FCD34D" },
  { id: "tools", label: "Tools & interfaces", short: "Tools", color: "#86EFAC" },
  { id: "evals", label: "Evals & observability", short: "Evals", color: "#F9A8D4" },
  { id: "ops", label: "Production ops", short: "Ops", color: "#94A3B8" },
];

// ---------------------------------------------------------------------------
// PHASES — the curriculum. All sources are FREE. IDs are stable; do not renumber.
// ---------------------------------------------------------------------------
export const PHASES: Phase[] = [
  {
    id: "phase0",
    title: "Phase 0 — Weekend Orientation",
    note: "~10h total. Goal: oriented, not expert. Hard stop after.",
    defaultOpen: true,
    items: [
      {
        id: "r1a",
        cat: "internals",
        title: "3B1B: But what is a GPT?",
        meta: "video · 27 min",
        desc: "Predict-sample-repeat, embeddings, softmax. Watch first.",
        url: "https://www.3blue1brown.com/lessons/gpt",
      },
      {
        id: "r1b",
        cat: "internals",
        title: "3B1B: Attention, step by step",
        meta: "video · 26 min",
        desc: "Attention as weighing context. Skip the equations.",
        url: "https://www.3blue1brown.com/lessons/attention",
      },
      {
        id: "r2",
        cat: "posttrain",
        title: "Karpathy: Deep Dive into LLMs like ChatGPT",
        meta: "video · ~3.5h, free",
        desc: "The full lifecycle: pretraining → SFT → RLHF, from the person who built it at OpenAI. Watch at 1.25x.",
        url: "https://www.youtube.com/watch?v=7xTGNNLPyMI",
      },
      {
        id: "r3",
        cat: "patterns",
        title: "Anthropic: Building Effective Agents",
        meta: "essay · ~1h slow read",
        desc: "The pattern taxonomy: chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer.",
        url: "https://www.anthropic.com/engineering/building-effective-agents",
      },
      {
        id: "r4",
        cat: "posttrain",
        title: "DeepSeek-R1 intro, or a Dwarkesh RL episode",
        meta: "paper intro / podcast · ~2h",
        desc: "RL-for-reasoning at conversant level. Plato context only.",
        url: "https://arxiv.org/abs/2501.12948",
      },
    ],
  },
  {
    id: "core6",
    title: "Core Six — Orchestration Canon",
    note: "Parallel agents, consistency, conflict resolution. Read in order.",
    defaultOpen: true,
    items: [
      {
        id: "c2",
        cat: "patterns",
        title: "How We Built Our Multi-Agent Research System",
        meta: "Anthropic · production postmortem",
        desc: "Orchestrator-workers in production: 90%+ eval gain, 15x token cost, weak on interdependent writes.",
        url: "https://www.anthropic.com/engineering/multi-agent-research-system",
      },
      {
        id: "c3",
        cat: "patterns",
        title: "Don't Build Multi-Agents",
        meta: "Cognition · the counterpoint",
        desc: "Parallel agents on write-heavy work produce conflicting decisions. Your job, described as a problem.",
        url: "https://cognition.ai/blog/dont-build-multi-agents",
      },
      {
        id: "c4",
        cat: "context",
        title: "Effective Context Engineering for AI Agents",
        meta: "Anthropic · essay",
        desc: "Compaction vs note-taking vs multi-agent: a decision procedure by task shape.",
        url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
      },
      {
        id: "c5",
        cat: "ops",
        title: "Dynamic workflows + ultracode docs",
        meta: "Anthropic · Opus 4.8 launch",
        desc: "Items 1-4 productized: auto fan-out, separate verifiers, isolated contexts. Note the token-burn complaints.",
        url: "https://docs.claude.com/en/docs/claude-code",
      },
      {
        id: "c6",
        cat: "patterns",
        title: "Agents cookbook: run the patterns",
        meta: "code · ~1-2h hands-on",
        desc: "The bridge from reading to implementing. Step through orchestrator-workers in actual code.",
        url: "https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents",
      },
      {
        id: "c7",
        cat: "patterns",
        title: "Compare: what shipped vs what the posts predicted",
        meta: "synthesis · 30 min, no link",
        desc: "Write one paragraph: where do workflows solve the Cognition objection, where do they not.",
        url: "",
      },
    ],
  },
  {
    id: "depth",
    title: "Depth Library — Agent Patterns & Systems",
    note: "The comprehensive layer. Not sequential; pull what your work points at.",
    defaultOpen: false,
    items: [
      {
        id: "l1",
        cat: "patterns",
        title: "Berkeley LLM Agents MOOC (CS294)",
        meta: "full course · free lectures",
        desc: "The most comprehensive structured agents course that exists. Guest lectures from the labs.",
        url: "https://llmagents-learning.org/",
      },
      {
        id: "l2",
        cat: "patterns",
        title: "OpenAI: A Practical Guide to Building Agents",
        meta: "guide · ~1h",
        desc: "OpenAI's equivalent of Building Effective Agents. Compare the two labs' taxonomies.",
        url: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf",
      },
      {
        id: "l3",
        cat: "patterns",
        title: "Lilian Weng: LLM Powered Autonomous Agents",
        meta: "survey · canonical",
        desc: "Planning, memory, tool use framework everyone cites. Dated but still the best single map.",
        url: "https://lilianweng.github.io/posts/2023-06-23-agent/",
      },
      {
        id: "l4",
        cat: "patterns",
        title: "ReAct: Reasoning + Acting",
        meta: "paper · foundational",
        desc: "The agent loop itself. Short, readable, everything descends from it.",
        url: "https://arxiv.org/abs/2210.03629",
      },
      {
        id: "l5",
        cat: "evals",
        title: "Reflexion: verbal self-correction",
        meta: "paper",
        desc: "Agents improving via self-feedback. Ancestor of your verifier-agent patterns.",
        url: "https://arxiv.org/abs/2303.11366",
      },
      {
        id: "l6",
        cat: "tools",
        title: "Anthropic: Writing effective tools for agents",
        meta: "Anthropic · engineering",
        desc: "Tool interface design is half of pipeline reliability.",
        url: "https://www.anthropic.com/engineering/writing-tools-for-agents",
      },
      {
        id: "l7",
        cat: "tools",
        title: "MCP: spec + intro",
        meta: "docs",
        desc: "The tool-connection standard. Skim spec, run one server.",
        url: "https://modelcontextprotocol.io/",
      },
      {
        id: "l8",
        cat: "tools",
        title: "Anthropic: Code execution with MCP",
        meta: "Anthropic · engineering",
        desc: "Agents writing code to call tools instead of direct invocation. Token-efficiency pattern.",
        url: "https://www.anthropic.com/engineering/code-execution-with-mcp",
      },
      {
        id: "l9",
        cat: "ops",
        title: "Anthropic: Claude Code best practices",
        meta: "Anthropic · engineering",
        desc: "Agentic coding workflows from the team that builds them.",
        url: "https://www.anthropic.com/engineering/claude-code-best-practices",
      },
      {
        id: "l10",
        cat: "patterns",
        title: "The Bitter Lesson (Sutton)",
        meta: "essay · 15 min",
        desc: "Why scaffolding around model limits keeps getting deleted. The strategic lens for your job.",
        url: "http://www.incompleteideas.net/IncIdeas/BitterLesson.html",
      },
      {
        id: "l11",
        cat: "patterns",
        title: "Compound AI Systems (BAIR)",
        meta: "Berkeley · essay",
        desc: "The systems-over-models thesis. Frames pipelines as the unit of progress.",
        url: "https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/",
      },
      {
        id: "l12",
        cat: "evals",
        title: "Hamel Husain: Your AI product needs evals",
        meta: "essay · practice",
        desc: "The single best applied evals writeup. Error analysis over dashboards.",
        url: "https://hamel.dev/blog/posts/evals/",
      },
      {
        id: "l13",
        cat: "evals",
        title: "Anthropic engineering: agent evals",
        meta: "Anthropic · engineering index",
        desc: "Agent-specific eval design: trajectories, not just outputs.",
        url: "https://www.anthropic.com/engineering",
      },
      {
        id: "l14",
        cat: "patterns",
        title: "AutoGen: multi-agent conversations",
        meta: "paper + repo",
        desc: "The academic multi-agent framework. Read for coordination ideas, not to adopt it.",
        url: "https://arxiv.org/abs/2308.08155",
      },
      {
        id: "l15",
        cat: "ops",
        title: "Anthropic: How we contain Claude",
        meta: "Anthropic · engineering",
        desc: "Sandboxing and isolation for production agents. The ops side of your role.",
        url: "https://www.anthropic.com/engineering/how-we-contain-claude",
      },
    ],
  },
  {
    id: "foundations",
    title: "Foundations Shelf — When Gaps Point Down",
    note: "Pull from here when the gap log shows the same hole twice.",
    defaultOpen: false,
    items: [
      {
        id: "f1",
        cat: "internals",
        title: "Karpathy: Zero to Hero series",
        meta: "video course · build-along",
        desc: "Backprop to GPT from scratch. The permanent-understanding route.",
        url: "https://karpathy.ai/zero-to-hero.html",
      },
      {
        id: "f2",
        cat: "patterns",
        title: "HuggingFace Agents Course",
        meta: "free course · structured",
        desc: "Hands-on agents curriculum. Framework-flavored; take concepts, not imports.",
        url: "https://huggingface.co/learn/agents-course",
      },
      {
        id: "f3",
        cat: "posttrain",
        title: "OpenAI: Spinning Up in Deep RL",
        meta: "course + code",
        desc: "The free RL course. Only if work drags you below the orchestration layer.",
        url: "https://spinningup.openai.com/",
      },
      {
        id: "f4",
        cat: "posttrain",
        title: "InstructGPT paper",
        meta: "paper · keystone",
        desc: "The RLHF recipe. Read when the layer below should stop being a black box.",
        url: "https://arxiv.org/abs/2203.02155",
      },
      {
        id: "f5",
        cat: "posttrain",
        title: "DPO paper",
        meta: "paper",
        desc: "Preference tuning without RL. You touched this in Plato prep; formalize it.",
        url: "https://arxiv.org/abs/2305.18290",
      },
      {
        id: "f6",
        cat: "posttrain",
        title: "DeepSeekMath (GRPO), section 4",
        meta: "paper excerpt",
        desc: "Where GRPO is actually defined. Read section 4 only.",
        url: "https://arxiv.org/abs/2402.03300",
      },
      {
        id: "f7",
        cat: "ops",
        title: "Eugene Yan: Patterns for Building LLM Systems",
        meta: "essay series · free reference",
        desc: "The free production-systems reference: evals, RAG, guardrails, monitoring, UX. Dip in by section.",
        url: "https://eugeneyan.com/writing/llm-patterns/",
      },
    ],
  },
  {
    id: "phase2",
    title: "Phase 2 — Hole-Fillers",
    note: "Only start these once the gap log shows a repeating hole.",
    defaultOpen: false,
    items: [
      {
        id: "p2a",
        cat: "evals",
        title: "DLAI short: Evaluating AI Agents",
        meta: "course · short, free",
        desc: "The 'did my pipeline actually get better' skill. Core of optimization work.",
        url: "https://www.deeplearning.ai/short-courses/",
      },
      {
        id: "p2b",
        cat: "tools",
        title: "DLAI short: MCP",
        meta: "course · short, free",
        desc: "Tool wiring for pipelines.",
        url: "https://www.deeplearning.ai/short-courses/",
      },
      {
        id: "p2c",
        cat: "posttrain",
        title: "HuggingFace LLM Course",
        meta: "course · free · optional",
        desc: "Free structured path through the full stack. Only if gaps cluster at foundations.",
        url: "https://huggingface.co/learn/llm-course",
      },
    ],
  },
  {
    id: "phase3",
    title: "Phase 3 — Build",
    note: "Depth comes from hitting walls, not consuming. SPINS pattern, new domain.",
    defaultOpen: false,
    items: [
      {
        id: "p3a",
        cat: "patterns",
        title: "Ship one real orchestration improvement",
        meta: "project · define when Phases 1-2 point somewhere",
        desc: "A Plato pipeline contribution or a side project that forces you through the stack.",
        url: "",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// QUESTIONS — quiz bank. Core concepts, not trivia. `src` lists curriculum item
// ids that teach the concept (drives "recent" quiz mode). 29 questions.
// ---------------------------------------------------------------------------
export const QUESTIONS: Question[] = [
  {
    id: "qi1",
    cat: "internals",
    src: ["r1a"],
    q: "At inference time, what is a GPT actually doing to produce a response?",
    opts: [
      "Retrieving the closest matching answer from its training data",
      "Repeatedly predicting a probability distribution over the next token and sampling from it",
      "Planning the full response first, then translating that plan into text",
      "Applying stored grammar rules to assemble sentences",
    ],
    a: 1,
    why: "Generation is predict-sample-repeat, one token at a time. Everything else (chat, reasoning, agents) is built on this single loop.",
  },
  {
    id: "qi2",
    cat: "internals",
    src: ["r1b"],
    q: "What is the attention mechanism's core job?",
    opts: [
      "Compressing the vocabulary into fewer tokens",
      "Letting each token's representation be updated with information from the most relevant other tokens in context",
      "Memorizing the exact order of training data",
      "Deciding which layers of the network to activate",
    ],
    a: 1,
    why: "Attention is weighted information-mixing across positions: each token asks 'what elsewhere in this context matters to me?'",
  },
  {
    id: "qi3",
    cat: "internals",
    src: ["r1a"],
    q: "Why can the same prompt give different outputs run to run?",
    opts: [
      "The model's weights shift slightly with each request",
      "The output is sampled from a probability distribution rather than chosen deterministically",
      "Requests get routed to differently trained models",
      "The context window starts at a random position",
    ],
    a: 1,
    why: "Sampling is the source of variation. Also why agent pipelines need verification: the same step can succeed or fail across runs.",
  },
  {
    id: "qi4",
    cat: "internals",
    src: ["r1a", "f1"],
    q: "In embedding space, what does 'direction encodes meaning' refer to?",
    opts: [
      "Tokens are stored alphabetically along one axis",
      "Semantic relationships show up as consistent vector offsets, and similar concepts cluster together",
      "Longer vectors represent more important words",
      "Each dimension corresponds to a human-defined attribute",
    ],
    a: 1,
    why: "Meaning lives in geometry: relationships are directions, similarity is proximity. No dimension was hand-labeled.",
  },
  {
    id: "qp1",
    cat: "posttrain",
    src: ["r2", "f4"],
    q: "Why does RLHF exist at all?",
    opts: [
      "To make models faster at inference",
      "Because a pretrained model imitates plausible text, which is not the same as being helpful, honest, and harmless",
      "To compress models for cheaper deployment",
      "To teach models facts that pretraining missed",
    ],
    a: 1,
    why: "Pretraining optimizes 'sound like the internet.' RLHF re-aims the model at what humans prefer. Different objective, same weights.",
  },
  {
    id: "qp2",
    cat: "posttrain",
    src: ["r2", "f4"],
    q: "In classic RLHF, what is the reward model?",
    opts: [
      "A copy of the base model with extra layers",
      "A model trained on human preference comparisons that scores outputs, providing the signal RL optimizes against",
      "A rules engine that filters disallowed words",
      "The dataset of human demonstration answers",
    ],
    a: 1,
    why: "Humans rank outputs, the reward model learns to predict the rankings, RL climbs that score. Reward design is the whole game.",
  },
  {
    id: "qp3",
    cat: "posttrain",
    src: ["f5"],
    q: "DPO's key simplification over RLHF is:",
    opts: [
      "Using a much bigger reward model",
      "Optimizing directly on preference pairs, removing the separate reward model and RL loop entirely",
      "Training only on synthetic data",
      "Replacing gradient descent with tree search",
    ],
    a: 1,
    why: "DPO showed the preference objective can be optimized directly with a clever loss. Simpler pipeline, same goal.",
  },
  {
    id: "qp4",
    cat: "posttrain",
    src: ["r4"],
    q: "DeepSeek-R1's headline result was that:",
    opts: [
      "Supervised fine-tuning is all you need for reasoning",
      "Reasoning behaviors can be incentivized through pure RL on verifiable rewards, without supervised reasoning demonstrations first",
      "Bigger context windows produce reasoning on their own",
      "Reasoning requires multi-agent debate",
    ],
    a: 1,
    why: "R1-Zero got long chains of thought and big benchmark jumps from RL alone. Whether this adds ability or sharpens latent ability is debated.",
  },
  {
    id: "qp5",
    cat: "posttrain",
    src: ["f6"],
    q: "Compared to PPO, GRPO's main move is:",
    opts: [
      "Adding a second critic model for safety",
      "Dropping the learned value/critic model and using group-relative baselines computed from multiple sampled answers",
      "Updating weights after every single token",
      "Replacing rewards with human edits",
    ],
    a: 1,
    why: "Sample a group of answers, score them, use the group average as baseline. One less model to train — matters enormously for infra.",
  },
  {
    id: "qa1",
    cat: "patterns",
    src: ["r3"],
    q: "In Anthropic's taxonomy, the difference between a workflow and an agent is:",
    opts: [
      "Workflows use smaller models",
      "Workflows orchestrate LLM calls through predefined code paths; agents dynamically direct their own process and tool use",
      "Agents always require multiple models",
      "Workflows cannot call tools",
    ],
    a: 1,
    why: "The most load-bearing distinction in the field. Their advice: use the simplest thing that works, usually a workflow.",
  },
  {
    id: "qa2",
    cat: "patterns",
    src: ["c2"],
    q: "Per Anthropic's research-system postmortem, multi-agent systems shine on ___ and struggle on ___:",
    opts: [
      "coding; research",
      "parallelizable breadth-first research; tightly interdependent work like coding",
      "short tasks; long tasks",
      "math; writing",
    ],
    a: 1,
    why: "Parallel reads compress beautifully; parallel writes conflict. Your job lives in that second clause.",
  },
  {
    id: "qa3",
    cat: "patterns",
    src: ["c3"],
    q: "Cognition's core objection to parallel subagents is:",
    opts: [
      "They are too slow",
      "Without shared context, parallel agents make conflicting implicit decisions that are hard to reconcile afterward",
      "They cannot call tools",
      "Token costs make them impossible",
    ],
    a: 1,
    why: "Every agent fills gaps with assumptions. Run them in parallel without shared context and assumptions diverge. Conflict resolution is the cleanup.",
  },
  {
    id: "qa4",
    cat: "patterns",
    src: ["c2"],
    q: "In orchestrator-workers, why do workers get isolated contexts?",
    opts: [
      "For billing separation",
      "So each explores its slice deeply without competing for one window, returning only condensed essentials to the lead",
      "To prevent workers from colluding",
      "Because models cannot physically share memory",
    ],
    a: 1,
    why: "Isolation is compression: detail stays local, signal flows up. Also kills goal drift — short contexts never reach the blur point.",
  },
  {
    id: "qa5",
    cat: "patterns",
    src: ["l10"],
    q: "The Bitter Lesson, applied to pipeline engineering, warns that:",
    opts: [
      "General methods riding compute tend to obsolete clever handcrafted scaffolding, so distinguish fundamental coordination problems from model-limit workarounds",
      "More engineers always beat more compute",
      "RL never works at scale",
      "All scaffolding is wasted effort",
    ],
    a: 0,
    why: "Each model generation deletes the workaround layer. Coordination and conflict resolution are more durable investments than prompt crutches.",
  },
  {
    id: "qa6",
    cat: "patterns",
    src: ["l4"],
    q: "ReAct's contribution was showing that:",
    opts: [
      "Models should act without reasoning to save tokens",
      "Interleaving reasoning traces with actions and observations in a loop beats either alone",
      "Reasoning should happen in a separate model",
      "Tools should always be called in parallel",
    ],
    a: 1,
    why: "Think, act, observe, repeat. That loop is the atom every agent framework is built from.",
  },
  {
    id: "qx1",
    cat: "context",
    src: ["c4"],
    q: "Why does performance often degrade as context grows, even well inside the window limit?",
    opts: [
      "The GPU runs out of memory",
      "Tokens compete for the model's attention budget, so low-signal tokens dilute focus (context rot)",
      "Providers throttle quality on long requests",
      "Models only read the first few thousand tokens",
    ],
    a: 1,
    why: "Context is a finite resource with diminishing returns, not a free bucket. This is the physics your layer is engineered around.",
  },
  {
    id: "qx2",
    cat: "context",
    src: ["c4"],
    q: "Context engineering's core principle is:",
    opts: [
      "Always fill the window with everything available",
      "Curate the smallest set of high-signal tokens that maximizes the likelihood of the desired next behavior",
      "Repeat key instructions many times",
      "Never summarize anything",
    ],
    a: 1,
    why: "Anthropic's literal framing. More context is not better context; relevance density is what you optimize.",
  },
  {
    id: "qx3",
    cat: "context",
    src: ["c4"],
    q: "Choosing among compaction, note-taking, and sub-agents should depend on:",
    opts: [
      "Whichever is cheapest",
      "Task shape: conversational back-and-forth vs milestone-driven iteration vs parallel exploration",
      "Model size",
      "Team preference",
    ],
    a: 1,
    why: "Compaction preserves flow, notes preserve milestones, sub-agents enable breadth. Matching strategy to task shape is the design skill.",
  },
  {
    id: "qx4",
    cat: "context",
    src: ["c2", "c4"],
    q: "How do sub-agents specifically help the context problem?",
    opts: [
      "They share one large window",
      "Detailed working context stays isolated inside each sub-agent; only condensed findings return to the lead",
      "They delete old messages automatically",
      "They use retrieval instead of context",
    ],
    a: 1,
    why: "Separation of concerns: search noise stays down in the workers, the lead spends its window on synthesis.",
  },
  {
    id: "qt1",
    cat: "tools",
    src: ["l6"],
    q: "What makes a tool well designed for agents?",
    opts: [
      "Maximum parameters for flexibility",
      "Clear purpose and parameters, returning concise high-signal results, designed for the model's consumption like good UX",
      "Returning raw database dumps for completeness",
      "The shortest possible names to save tokens",
    ],
    a: 1,
    why: "Tools are UX for models. Ambiguous params and noisy returns produce exactly the flaky behavior pipelines get blamed for.",
  },
  {
    id: "qt2",
    cat: "tools",
    src: ["l7", "p2b"],
    q: "MCP's purpose is:",
    opts: [
      "A new model architecture",
      "An open standard so any agent client can connect to any tool or data server without custom one-off integrations",
      "An Anthropic-only plugin system",
      "A prompt formatting convention",
    ],
    a: 1,
    why: "USB-C for agent tooling: build the server once, every compatible client can use it.",
  },
  {
    id: "qt3",
    cat: "tools",
    src: ["l8"],
    q: "The 'code execution with MCP' pattern saves tokens by:",
    opts: [
      "Compressing prompts before sending",
      "Having the agent write code that calls tools, instead of loading every tool definition and piping all intermediate results through the context",
      "Caching all tool outputs forever",
      "Using smaller models for tool calls",
    ],
    a: 1,
    why: "Direct tool calls drag definitions and intermediate data through the window. Code moves that work out of context.",
  },
  {
    id: "qe1",
    cat: "evals",
    src: ["l12", "p2a", "l13"],
    q: "Agent evals differ from model evals chiefly because:",
    opts: [
      "Agents cannot be scored",
      "You must judge the trajectory (tool choices, intermediate decisions, recovery) and not just the final answer",
      "Agent outputs are random",
      "No benchmarks exist for agents",
    ],
    a: 1,
    why: "Two runs can reach the same answer, one cleanly and one through twelve wasteful retries. Outcome-only evals can't tell them apart.",
  },
  {
    id: "qe2",
    cat: "evals",
    src: ["l12"],
    q: "Hamel Husain's central evals advice is:",
    opts: [
      "Buy an observability dashboard first",
      "Start with manual error analysis: read your traces, categorize the failures, and let metrics emerge from real failure modes",
      "Use LLM judges for everything immediately",
      "Track only latency and cost",
    ],
    a: 1,
    why: "Generic metrics hide failure modes; reading traces reveals them. Metrics come after you know what failure looks like.",
  },
  {
    id: "qe3",
    cat: "evals",
    src: ["l12", "p2a"],
    q: "Why be careful with LLM-as-judge?",
    opts: [
      "It is always wrong",
      "Judges carry biases (self-preference, position, verbosity) and need validating against human labels before you trust them",
      "It is too expensive to ever use",
      "It cannot output numeric scores",
    ],
    a: 1,
    why: "A judge that prefers its own style, the first option, or longer answers quietly corrupts your eval signal. Validate the judge first.",
  },
  {
    id: "qe4",
    cat: "evals",
    src: ["l5"],
    q: "Reflexion showed agents improve by:",
    opts: [
      "Fine-tuning weights after each task",
      "Generating verbal self-critiques of failures and carrying them into the next attempt, with no weight updates",
      "Asking the user for hints",
      "Raising the sampling temperature",
    ],
    a: 1,
    why: "Learning in tokens instead of weights. The ancestor of every retry-with-feedback and verifier loop in modern pipelines.",
  },
  {
    id: "qo1",
    cat: "ops",
    src: ["c2"],
    q: "Anthropic measured their multi-agent research system at roughly how many times the tokens of a normal chat?",
    opts: ["2x", "15x", "100x", "About the same"],
    a: 1,
    why: "The cost structure decides where multi-agent is worth it: task value must beat the token bill. This number is your budgeting anchor.",
  },
  {
    id: "qo2",
    cat: "ops",
    src: ["l15"],
    q: "Why sandbox production agents?",
    opts: [
      "To speed up execution",
      "Agents take emergent, sometimes wrong actions; filesystem and network isolation bounds the blast radius",
      "To hide prompts from users",
      "Regulation requires it everywhere",
    ],
    a: 1,
    why: "You contain what you cannot fully predict. Isolation is the price of giving a stochastic system real-world levers.",
  },
  {
    id: "qo3",
    cat: "ops",
    src: ["c5"],
    q: "The practical tradeoff of automatic fan-out (dynamic workflows) is:",
    opts: [
      "There is no tradeoff; always enable it",
      "Parallel isolation fixes drift and self-approval, but multiplies token burn and adds reliability variance, so engage it intentionally per task",
      "It only works on small repos",
      "It removes the need for evals",
    ],
    a: 1,
    why: "The fan-out solves real failure modes and creates real bills. Practitioners hitting usage caps in minutes is the cautionary half.",
  },
];

// ---------------------------------------------------------------------------
// SCOUT_PROMPT — the scout persona. A function of date, banked titles, and the
// category list, so forks can fully rewrite the scouting brief here.
// ---------------------------------------------------------------------------
export function SCOUT_PROMPT(
  date: string,
  bankedTitles: string[],
  categoryIds: string[]
): string {
  const catList = categoryIds.join(", ");
  const banked = bankedTitles.length ? bankedTitles.join("; ") : "none yet";
  return `Today is ${date}. You are a research scout for an engineer who optimizes production multi-agent pipelines (parallel agent batches, consistency, conflict resolution) at an RL-infrastructure startup. Search for updates from roughly the last 14 days: multi-agent orchestration research, parallel agent coordination, context engineering, Anthropic engineering posts, and major agent-related releases from OpenAI or DeepSeek. Prefer primary sources over content marketing. EXCLUSIONS: this person reads product changelogs and release notes daily — do NOT surface raw changelog/version-bump/release-note entries (e.g. "Claude Code vX.Y.Z: ..."). Substantive third-party analysis that discusses a release is fine; the raw changelog is not. DEDUP: items already in their knowledge bank are listed below; skip items reporting the SAME story (even from a different outlet), but DO surface genuinely new research that builds on/extends/critiques/supersedes banked work (a follow-up or v2 paper is NEW, not a duplicate) — when you do, make the summary state what's new vs prior work. Banked items: ${banked}. Curate up to 10 genuinely new items worth scrolling. Keep every text field SHORT. Respond with ONLY a JSON object, no markdown fences: {"recommendations":[{"title":str(<=10 words),"source":str,"url":str,"summary":str(<=15 words, lead with what's new),"reasoning":str(<=22 words, why it earns their time),"fit":str(<=14 words, where it slots in their learning),"category":one of {${catList}},"priority":"now"|"soon"|"later","quiz":{"q":str(<=20 words, conceptual MCQ),"opts":[4 short strings],"a":int 0-3,"why":str(<=18 words)}}]}. Fewer is fine if quiet; empty array acceptable.`;
}

// ---------------------------------------------------------------------------
// COACH_PROMPT — the weekly reflection-coach persona. A function of the user's
// real activity, so forks can fully rewrite the coaching brief here.
// ---------------------------------------------------------------------------
export type CoachContext = {
  date: string;
  streak: number;
  totalDone: number;
  completedThisWeek: { title: string; concept: string }[];
  openGaps: string[];
  recentScans: string[];
};

export function COACH_PROMPT(ctx: CoachContext): string {
  const done = ctx.completedThisWeek.length
    ? ctx.completedThisWeek.map((c) => `- ${c.title} — ${c.concept}`).join("\n")
    : "(nothing completed yet this week)";
  const gaps = ctx.openGaps.length
    ? ctx.openGaps.map((g) => `- ${g}`).join("\n")
    : "(no open gaps logged)";
  const scans = ctx.recentScans.length ? ctx.recentScans.join("; ") : "(none)";
  return `You are a warm, sharp weekly reflection coach for an engineer studying agent-pipeline orchestration (multi-agent systems, context engineering, evals, production ops). Your job is a short weekly check-in that helps them consolidate what they learned and spot what to do next.

Style: concise and mobile-friendly — 2-4 sentences per reply, ask exactly ONE focused question at a time, never lecture or dump lists. Ground everything in their real activity below; reference specific items by name. Celebrate momentum honestly (no empty hype). If an open gap repeats or connects to what they studied, gently surface it and suggest one concrete next step from their own material.

Today is ${ctx.date}. Current streak: ${ctx.streak} day(s). Total items completed: ${ctx.totalDone}.

Completed this week:
${done}

Open gaps:
${gaps}

Recently scouted topics: ${scans}

When opening the check-in: greet briefly, name one concrete thing they actually did this week, and ask one reflection question about it (what clicked, what's still fuzzy). Keep it personal and short.`;
}
