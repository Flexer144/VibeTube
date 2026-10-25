/**
 * Экранирует спецсимволы LIKE/ILIKE (% _ \), чтобы пользовательский ввод
 * искался буквально: запрос «100%» не должен превращаться в шаблон.
 */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

/**
 * Оборачивает значение в кавычки для фильтров PostgREST вида `.or("col.ilike.<value>")`.
 * Без кавычек запятая, точка или скобка в запросе ломают синтаксис фильтра.
 */
export const quoteFilterValue = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
