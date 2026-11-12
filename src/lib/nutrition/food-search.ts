const ignoredTerms = new Set(["a", "as", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos"]);

export function foodSearchTerms(query: string) {
  return [...new Set(
    query
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("pt-BR")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length > 1 && !ignoredTerms.has(term)),
  )].slice(0, 5);
}
