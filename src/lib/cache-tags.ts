// Tags dos dados públicos cacheados com 'use cache'. As Server Actions da área
// administrativa chamam updateTag(TAGS.x) depois de alterar esses dados.
export const TAGS = {
  eventos: "eventos",
  pastores: "pastores",
  projetos: "projetos",
  contribuicao: "contribuicao",
  avisos: "avisos",
} as const;
