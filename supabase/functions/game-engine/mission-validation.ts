export type MissionQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source_url?: string;
  source_note?: string;
};

export function missionOptions(question: MissionQuestion): string[] {
  return Array.isArray(question?.options) ? [...question.options] : [];
}

export function missionQuestionIsValid(question: MissionQuestion): boolean {
  if (!question || typeof question.prompt !== "string" ||
      typeof question.explanation !== "string") return false;

  const options = missionOptions(question);
  const sourceNote = String(question.source_note ?? "").trim();
  let source: URL;
  try {
    source = new URL(String(question.source_url ?? "").trim());
  } catch {
    return false;
  }

  return question.prompt.trim().length >= 12 &&
    options.length === 4 &&
    options.every((option) => typeof option === "string" && option.trim().length >= 8) &&
    new Set(options.map((option) => option.trim().toLocaleLowerCase("it"))).size === 4 &&
    Number.isInteger(question.correct_index) &&
    question.correct_index >= 0 &&
    question.correct_index < 4 &&
    question.explanation.trim().length >= 20 &&
    source.protocol === "https:" &&
    source.hostname.length > 0 &&
    sourceNote.length >= 20;
}
