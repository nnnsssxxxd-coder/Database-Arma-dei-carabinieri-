import { missionOptions, missionQuestionIsValid, type MissionQuestion } from "./mission-validation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const validQuestion: MissionQuestion = {
  prompt: "Quale documento deve essere acquisito per verificare la discordanza descritta?",
  options: [
    "Il documento originale o una copia conforme proveniente dall'ente emittente",
    "Una fotografia illeggibile priva di riferimenti identificativi",
    "Un commento informale non verificato di un soggetto estraneo",
    "Una ricostruzione personale non supportata da atti o registrazioni"
  ],
  correct_index: 0,
  explanation: "Il riscontro deve provenire da una fonte attendibile e consentire di verificare contenuto, provenienza e integrità del documento.",
  source_url: "https://www.normattiva.it/",
  source_note: "Normattiva: repertorio ufficiale per consultare il testo vigente degli atti normativi citati nella scheda."
};

Deno.test("accepts only four explicit, distinct and sourced mission options", () => {
  assert(missionQuestionIsValid(validQuestion), "A complete sourced question should be valid");
  const options = missionOptions(validQuestion);
  assert(options.length === 4, "Exactly four authored options must be returned");
  assert(options.every((option, index) => option === validQuestion.options[index]), "Options must not be rewritten or supplemented");
});

Deno.test("does not invent a fourth option for legacy three-choice questions", () => {
  const legacy = { ...validQuestion, options: validQuestion.options.slice(0, 3) };
  assert(missionOptions(legacy).length === 3, "Legacy choices must remain unchanged");
  assert(!missionQuestionIsValid(legacy), "Three-choice questions must be blocked");
});

Deno.test("rejects duplicated options", () => {
  const duplicate = { ...validQuestion, options: [...validQuestion.options.slice(0, 3), validQuestion.options[0]] };
  assert(!missionQuestionIsValid(duplicate), "Duplicate choices must be rejected");
});

Deno.test("rejects invalid answer indexes", () => {
  assert(!missionQuestionIsValid({ ...validQuestion, correct_index: 4 }), "Out-of-range answer index must be rejected");
});

Deno.test("rejects missing, non-HTTPS or underspecified sources", () => {
  assert(!missionQuestionIsValid({ ...validQuestion, source_url: undefined }), "Missing source must be rejected");
  assert(!missionQuestionIsValid({ ...validQuestion, source_url: "http://example.org" }), "Non-HTTPS source must be rejected");
  assert(!missionQuestionIsValid({ ...validQuestion, source_note: "Fonte" }), "Non-specific source note must be rejected");
});

Deno.test("rejects short explanations", () => {
  assert(!missionQuestionIsValid({ ...validQuestion, explanation: "Risposta corretta." }), "Short explanation must be rejected");
});
