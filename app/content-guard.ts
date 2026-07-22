const MINOR_REFERENCE = /\b(?:niñ[oa]s?|menor(?:es)?(?:\s+de\s+edad)?|preadolescente(?:s)?|(?:[0-9]|1[0-7])\s*años?)\b/i;
const SEXUAL_CONTEXT = /\b(?:sexo(?:\s+oral)?|sexual(?:es)?|er[oó]tic[oa]s?|desnud[oa]s?|penetr(?:ar|aci[oó]n|aba|ando)?|coito|genital(?:es)?|pene|vagina|cl[ií]toris|orgasmo|masturb(?:ar|aci[oó]n)?|fellatio)\b/i;

export function containsSexualMinorContent(text: string) {
  return MINOR_REFERENCE.test(text) && SEXUAL_CONTEXT.test(text);
}
