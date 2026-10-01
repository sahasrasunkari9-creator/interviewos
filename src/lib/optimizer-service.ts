export const roles = ["AI Engineer", "Software Developer", "Data Scientist", "Web Developer", "UI/UX Designer"] as const;
export const tools = ["headline", "summary", "experience", "objective", "keywords", "review", "career"] as const;
export type Tool = typeof tools[number];
export type ProfileData = { name: string; currentRole: string; targetRole: string; industry: string; yearsExperience: number; headline: string; about: string; experience: string; skills: string; jobDescription: string };
export type Analysis = { score: number; checklist: { label: string; done: boolean; tip: string }[]; keywords: { word: string; found: boolean }[]; matched: number; total: number; suggestions: string[] };
const roleSkills: Record<string, string[]> = {
  "AI Engineer": ["Python", "Machine Learning", "LLMs", "PyTorch", "MLOps", "RAG", "Model Deployment", "Cloud AI"],
  "Software Developer": ["TypeScript", "System Design", "APIs", "React", "Testing", "Git", "Cloud", "Agile"],
  "Data Scientist": ["Python", "SQL", "Statistics", "Machine Learning", "Data Visualization", "Experimentation", "Pandas", "Forecasting"],
  "Web Developer": ["JavaScript", "React", "Next.js", "CSS", "Accessibility", "REST APIs", "Performance", "Responsive Design"],
  "UI/UX Designer": ["Figma", "User Research", "Prototyping", "Design Systems", "Accessibility", "Interaction Design", "Usability Testing", "Wireframing"],
};
export function skillsFor(role: string) { return roleSkills[role] || roleSkills["Software Developer"]; }
export function analyze(profile: ProfileData): Analysis {
  const checks = [
    { label: "Add your name", done: profile.name.trim().length > 1, tip: "Make it easy for recruiters to recognize you." },
    { label: "Write a focused headline", done: profile.headline.trim().length >= 40, tip: "Lead with your role, specialty, and value." },
    { label: "Complete your About section", done: profile.about.trim().length >= 150, tip: "Tell your story in at least 150 characters." },
    { label: "Showcase your experience", done: profile.experience.trim().length >= 80, tip: "Add outcomes and measurable impact." },
    { label: "List at least 5 skills", done: profile.skills.split(/[,\n]/).filter(Boolean).length >= 5, tip: "Include relevant technical and transferable skills." },
    { label: "Set a target role", done: Boolean(profile.targetRole), tip: "Tailor your profile to your next move." },
    { label: "Add a job description", done: profile.jobDescription.trim().length >= 80, tip: "Compare your profile with a real opportunity." },
  ];
  const weights = [10, 18, 20, 19, 15, 8, 10];
  const score = checks.reduce((sum, c, i) => sum + (c.done ? weights[i] : 0), 0);
  const corpus = [profile.headline, profile.about, profile.experience, profile.skills].join(" ").toLowerCase();
  const keywords = skillsFor(profile.targetRole).map(word => ({ word, found: corpus.includes(word.toLowerCase()) }));
  return { score, checklist: checks, keywords, matched: keywords.filter(k => k.found).length, total: keywords.length, suggestions: checks.filter(c => !c.done).slice(0, 3).map(c => c.tip) };
}
const tidy = (s: string) => s.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
function short(s: string, length = 190) { const t = tidy(s); return t.length > length ? t.slice(0, length).replace(/\s+\S*$/, "") + "…" : t; }
function extractedWords(description: string) {
  const stop = new Set("about after also and are been being can could create data designed experience for from have help into job looking more our role skills strong team that their them these this using want will with work working years your you the a an of in to on as at by or is it".split(" "));
  const counts = new Map<string,number>();
  for (const raw of description.toLowerCase().match(/[a-z][a-z+#.\-]{2,}/g) || []) { const word = raw.replace(/[.,]+$/, ""); if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1); }
  return [...counts].sort((a,b) => b[1]-a[1]).slice(0,12).map(([word]) => word);
}
export function demoGenerate(tool: Tool, p: ProfileData, input: string) {
  const name = p.name.trim() || "Your name";
  const role = p.targetRole || "Software Developer";
  const skillList = skillsFor(role);
  const given = tidy(input);
  const years = p.yearsExperience ? `${p.yearsExperience}+ years of experience` : "hands-on experience";
  const industry = p.industry.trim() || "technology";
  switch(tool) {
    case "headline": return `${role} | ${skillList.slice(0,3).join(" · ")} | Building thoughtful solutions in ${industry}`;
    case "summary": return `I’m ${name}, a ${role.toLowerCase()} with ${years} turning complex ideas into practical, people-centered results. My focus spans ${skillList.slice(0,3).join(", ")}, and I enjoy collaborating across teams to solve meaningful challenges.\n\n${given ? `My background includes ${short(given, 210)}. ` : "I bring curiosity, ownership, and a continuous-learning mindset to every project. "}I’m now looking to contribute to ambitious teams in ${industry} where quality, measurable outcomes, and growth matter.\n\nLet’s connect to share ideas and explore opportunities.`;
    case "experience": return `• Led initiatives involving ${given ? short(given, 145).toLowerCase() : skillList.slice(0,2).join(" and ")}, translating business needs into clear deliverables.\n• Collaborated with cross-functional partners to improve workflows and deliver reliable outcomes; add a verified metric here (e.g., time saved or adoption rate).\n• Applied ${skillList.slice(0,3).join(", ")} to identify opportunities for improvement and document results.\n\nTip: Replace the suggested metric with a real number you can substantiate.`;
    case "objective": return `Seeking a ${role} opportunity in ${industry} where I can apply ${skillList.slice(0,3).join(", ")} to deliver meaningful results, collaborate with strong teams, and continue growing as a professional.${given ? ` Particularly interested in ${short(given, 100).toLowerCase()}.` : ""}`;
    case "keywords": { const words = extractedWords(given || p.jobDescription); return words.length ? `KEYWORDS FROM JOB DESCRIPTION\n${words.map((w,i) => `${String(i+1).padStart(2,"0")}. ${w}`).join("\n")}\n\nROLE-RELEVANT SKILLS TO CONSIDER\n${skillList.join(" · ")}\n\nUse only keywords that genuinely reflect your experience.` : `Add a job description to extract its keywords. Suggested ${role} skills: ${skillList.join(" · ")}.`; }
    case "review": { const a = analyze(p); return `PROFILE REVIEW · ${a.score}/100\n\nCompleted: ${a.checklist.filter(c => c.done).length} of ${a.checklist.length} essentials.\nRole keyword coverage: ${a.matched}/${a.total}.\n\nNEXT STEPS\n${(a.suggestions.length ? a.suggestions : ["Your profile covers the core essentials. Keep your accomplishments and skills current."]).map((s,i) => `${i+1}. ${s}`).join("\n")}\n\nThis is a rule-based completeness review, not an external recruiter assessment.`; }
    case "career": { const a = analyze(p); const missing = a.keywords.filter(k => !k.found).slice(0,4).map(k => k.word); return `YOUR NEXT MOVE: ${role.toUpperCase()}\n\n1. Highlight relevant work: Reframe your most relevant experience around outcomes, ownership, and scope.\n2. Strengthen your skill story: ${missing.length ? `Consider adding ${missing.join(", ")} if you have genuine experience with them.` : "Your profile already includes the main suggested role keywords."}\n3. Show proof: Add a portfolio project, case study, or concrete achievement that demonstrates your impact.\n4. Build connections: Engage with practitioners and teams working in ${industry}.\n\nThese are general, rule-based suggestions tailored to the information you provided.`; }
  }
}
export async function generateContent(tool: Tool, profile: ProfileData, input: string): Promise<{ output: string; mode: "demo" | "ai" }> {
  if (!process.env.AI_API_KEY) return { output: demoGenerate(tool, profile, input), mode: "demo" };
  const instructions: Record<Tool,string> = {
    headline: "Write 3 compelling, concise LinkedIn headline alternatives. Lead with target role and genuine keywords. Do not invent credentials.",
    summary: "Write a polished first-person LinkedIn About section in 2-3 short paragraphs with a warm, credible voice and a call to connect. Do not invent achievements.",
    experience: "Rewrite the provided experience into strong LinkedIn bullet points with action verbs. Never invent metrics; indicate where real metrics should be inserted.",
    objective: "Write a concise career objective tailored to the target role, using only provided background.",
    keywords: "Extract 8-12 important job-description keywords and recommend how to naturally include only truthful ones in a LinkedIn profile.",
    review: "Review the profile for completeness, clarity, role targeting, and ATS keywords. Give specific prioritized and truthful improvements. Do not claim to have checked LinkedIn directly.",
    career: "Offer 4 actionable personalized career growth suggestions and relevant skills based on the provided role and profile. No guaranteed employment claims.",
  };
  const response = await fetch(process.env.AI_BASE_URL || "https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", response_format: { type: "json_object" }, messages: [ { role: "system", content: `You are an expert career writing assistant. ${instructions[tool]} Return valid JSON with exactly one string field named "output". Never fabricate facts, metrics, job titles, or education. Write plain text, not markdown. No voice or audio.` }, { role: "user", content: JSON.stringify({ tool, profile, extraInput: input }) } ] }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error("AI service unavailable");
  const payload = await response.json();
  const parsed: unknown = JSON.parse(payload.choices?.[0]?.message?.content || "null");
  if (!parsed || typeof parsed !== "object" || !("output" in parsed) || typeof parsed.output !== "string" || parsed.output.trim().length < 15 || parsed.output.length > 20000) throw new Error("Invalid AI response");
  return { output: parsed.output.trim(), mode: "ai" };
}
