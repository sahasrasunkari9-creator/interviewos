export const categories = ["Technical", "HR & Behavioral", "Company-style", "Role-based"] as const;
export const difficulties = ["Beginner", "Intermediate", "Advanced"] as const;
export const roles = ["Software Developer", "Data Analyst", "AI Engineer", "Web Developer", "Product Designer", "Data Scientist"] as const;
export const companies = ["General", "Google-style", "Amazon-style", "Microsoft-style", "Meta-style"] as const;
export type Question = { question: string; topic: string; keywords: string[] };
export type Config = { category: string; role: string; difficulty: string; company: string; topic?: string };
export type Feedback = { overall: number; relevance: number; clarity: number; technical: number; delivery: number; strengths: string[]; improvements: string[]; recommendation: string; perQuestion: { topic: string; score: number; note: string }[]; disclaimer: string };
const bank: Record<string, Question[]> = {
  Python: [{ question: "How do Python lists and tuples differ, and when would you use each?", topic: "Python", keywords: ["mutable", "immutable", "list", "tuple"] }, { question: "Explain a Python generator and a situation where it improves memory usage.", topic: "Python", keywords: ["yield", "iteration", "memory", "lazy"] }],
  Java: [{ question: "Explain the difference between an interface and an abstract class in Java.", topic: "Java", keywords: ["interface", "abstract", "inheritance", "implementation"] }],
  "C / C++": [{ question: "What is the difference between stack and heap memory in C or C++?", topic: "C / C++", keywords: ["stack", "heap", "allocation", "memory"] }],
  "HTML & CSS": [{ question: "How would you build an accessible, responsive page using semantic HTML and CSS?", topic: "HTML & CSS", keywords: ["semantic", "accessibility", "responsive", "flex", "grid"] }],
  JavaScript: [{ question: "How does the JavaScript event loop handle promises and asynchronous work?", topic: "JavaScript", keywords: ["event loop", "promise", "microtask", "async"] }, { question: "What is a closure in JavaScript and where is it useful?", topic: "JavaScript", keywords: ["closure", "scope", "function", "variable"] }],
  SQL: [{ question: "When would you use a JOIN rather than a subquery in SQL?", topic: "SQL", keywords: ["join", "query", "table", "performance"] }, { question: "How would you investigate a slow SQL query?", topic: "SQL", keywords: ["index", "explain", "query", "execution"] }],
  "Data Structures": [{ question: "Compare a hash map and a balanced tree. What are their trade-offs?", topic: "Data Structures", keywords: ["hash", "tree", "complexity", "lookup"] }],
  "AI / ML": [{ question: "How do you identify and prevent overfitting in a machine learning model?", topic: "AI / ML", keywords: ["overfitting", "validation", "regularization", "training"] }, { question: "Explain the difference between precision and recall for a real use case.", topic: "AI / ML", keywords: ["precision", "recall", "false positive", "false negative"] }],
  Behavioral: [{ question: "Tell me about yourself and why this role interests you.", topic: "Self-introduction", keywords: ["experience", "role", "skills", "interest"] }, { question: "Describe a time you worked through a disagreement with a teammate.", topic: "Teamwork", keywords: ["situation", "action", "result", "team"] }, { question: "What is a professional weakness you are actively improving?", topic: "Self-awareness", keywords: ["weakness", "improve", "learn", "example"] }, { question: "Tell me about a time you led a project or took initiative.", topic: "Leadership", keywords: ["lead", "action", "outcome", "team"] }, { question: "What are your career goals for the next few years?", topic: "Career goals", keywords: ["goal", "growth", "skills", "impact"] }],
  "Company-style": [{ question: "Describe a time you had incomplete information but still needed to make a decision.", topic: "Decision-making", keywords: ["context", "decision", "action", "result"] }, { question: "How would you design a service that remains reliable as usage grows?", topic: "System thinking", keywords: ["scale", "reliability", "monitoring", "trade-off"] }, { question: "Tell me about a time you improved a process for your team or customers.", topic: "Ownership", keywords: ["problem", "improvement", "impact", "result"] }, { question: "How do you prioritize when several important deadlines conflict?", topic: "Prioritization", keywords: ["priority", "stakeholder", "trade-off", "deadline"] }],
  "Role-based": [{ question: "Walk me through a project that best demonstrates your fit for this role.", topic: "Project depth", keywords: ["project", "role", "challenge", "outcome"] }, { question: "How do you approach an unfamiliar technical problem?", topic: "Problem solving", keywords: ["research", "break down", "test", "learn"] }, { question: "Which skill are you developing right now, and how are you applying it?", topic: "Growth", keywords: ["skill", "practice", "project", "learning"] }],
};
const allTechnical = Object.keys(bank).filter(k => !["Behavioral", "Company-style", "Role-based"].includes(k));
export function isConfig(value: unknown): value is Config { if (!value || typeof value !== "object") return false; const v = value as Config; return categories.includes(v.category as typeof categories[number]) && difficulties.includes(v.difficulty as typeof difficulties[number]) && roles.includes(v.role as typeof roles[number]) && companies.includes(v.company as typeof companies[number]); }
export function demoQuestions(config: Config, topic = "Mixed"): Question[] {
  let source: Question[];
  if (config.category === "HR & Behavioral") source = bank.Behavioral;
  else if (config.category === "Company-style") source = bank["Company-style"];
  else if (config.category === "Role-based") source = bank["Role-based"];
  else source = topic !== "Mixed" && bank[topic] && allTechnical.includes(topic) ? bank[topic] : allTechnical.flatMap(k => bank[k]);
  const seed = (config.role.length + config.difficulty.length + config.company.length + new Date().getDate()) % source.length;
  return Array.from({ length: 5 }, (_, i) => { const q = source[(seed + i) % source.length]; return { ...q, question: config.category === "Role-based" && i === 0 ? `As a ${config.role}, ${q.question.charAt(0).toLowerCase()}${q.question.slice(1)}` : q.question }; });
}
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }
export function demoFeedback(questions: Question[], answers: string[]): Feedback {
  const perQuestion = questions.map((q, i) => {
    const answer = (answers[i] || "").trim(); const words = answer.split(/\s+/).filter(Boolean);
    const hits = q.keywords.filter(k => answer.toLowerCase().includes(k.toLowerCase())).length;
    const score = !answer ? 0 : clamp(15 + Math.min(42, words.length * .48) + Math.min(32, hits * 12) + (/[.!?]/.test(answer) ? 7 : 0));
    return { topic: q.topic, score, note: !answer ? "No answer submitted. Try outlining a response before moving on." : words.length < 35 ? "Add a concrete example and explain your reasoning in more detail." : hits === 0 ? "Good length. Check whether your answer directly addresses the question's key concepts." : "Relevant concepts detected. Add specific evidence and outcomes where possible." };
  });
  const all = answers.join(" ").trim(); const words = all.split(/\s+/).filter(Boolean); const filled = answers.filter(a => a.trim().length >= 15).length;
  const relevance = clamp(perQuestion.reduce((a, b) => a + b.score, 0) / Math.max(1, perQuestion.length));
  const clarity = clamp((words.length ? 25 : 0) + Math.min(50, words.length / Math.max(1, filled) * 1.1) + (/[.!?]/.test(all) ? 18 : 0));
  const technical = clamp(questions.filter(q => q.keywords.some(k => all.toLowerCase().includes(k.toLowerCase()))).length / Math.max(1, questions.length) * 100);
  const delivery = clamp((filled / Math.max(1, questions.length)) * 60 + Math.min(40, words.length / Math.max(1, filled) * .6));
  const overall = clamp(relevance * .4 + clarity * .25 + technical * .2 + delivery * .15);
  return { overall, relevance, clarity, technical, delivery, strengths: [filled ? `You attempted ${filled} of ${questions.length} questions.` : "You started a practice session — try submitting answers next time.", technical > 45 ? "Your answers include several relevant topic terms." : "You have room to build more topic-specific examples."], improvements: ["Use a specific example and explain the outcome for each answer.", "Address the question directly before adding context.", ...((filled < questions.length) ? ["Complete every answer for a more useful practice review."] : [])], recommendation: "Practice one question each day. Revisit your lowest-scoring topic and answer it using situation, task, action, and result.", perQuestion, disclaimer: "Demo Mode: heuristic scores based on answer length, completion, and keyword overlap. They do not measure interview ability, emotion, or spoken confidence." };
}
function validQuestions(data: unknown): data is Question[] { return Array.isArray(data) && data.length === 5 && data.every(q => q && typeof q.question === "string" && q.question.length >= 12 && q.question.length < 700 && typeof q.topic === "string" && Array.isArray(q.keywords) && q.keywords.every((k: unknown) => typeof k === "string")); }
export async function aiJson(system: string, user: string): Promise<unknown> {
  const response = await fetch(process.env.AI_BASE_URL || "https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error("AI service unavailable");
  const payload = await response.json(); return JSON.parse(payload.choices?.[0]?.message?.content || "null");
}
export async function generateQuestions(config: Config, topic: string): Promise<{ questions: Question[]; mode: "demo" | "ai" }> {
  if (!process.env.AI_API_KEY) return { questions: demoQuestions(config, topic), mode: "demo" };
  const parsed = await aiJson("You are a thoughtful interviewer. Return JSON object with questions: exactly 5 objects, each with question (string), topic (string), keywords (array of 3-5 short relevant terms). Original, useful interview questions. No answers or audio.", JSON.stringify({ ...config, technicalTopic: topic }));
  if (!parsed || typeof parsed !== "object" || !("questions" in parsed) || !validQuestions(parsed.questions)) throw new Error("Invalid AI question response");
  return { questions: parsed.questions, mode: "ai" };
}
export async function generateFeedback(questions: Question[], answers: string[]): Promise<{ feedback: Feedback; mode: "demo" | "ai" }> {
  if (!process.env.AI_API_KEY) return { feedback: demoFeedback(questions, answers), mode: "demo" };
  const parsed = await aiJson("You are a fair interview coach. Return JSON object with overall,relevance,clarity,technical,delivery integer scores 0-100; strengths and improvements arrays of strings; recommendation string; perQuestion array of objects {topic,score,note}, one per question. Scores assess WRITTEN ANSWERS ONLY. Delivery assesses written structure and completeness, never emotion, vocal confidence or body language. Provide constructive evidence-based feedback. disclaimer string explaining text-only limits.", JSON.stringify({ questions, answers }));
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid AI feedback");
  const f = parsed as Feedback;
  if (![f.overall, f.relevance, f.clarity, f.technical, f.delivery].every(n => Number.isInteger(n) && n >= 0 && n <= 100) || !Array.isArray(f.strengths) || !Array.isArray(f.improvements) || !Array.isArray(f.perQuestion) || f.perQuestion.length !== questions.length || typeof f.recommendation !== "string" || typeof f.disclaimer !== "string") throw new Error("Invalid AI feedback shape");
  return { feedback: f, mode: "ai" };
}
export const technicalTopics = ["Mixed", ...allTechnical];
