import { Grecha } from "../grecha.js";
import { STATUSES } from "./useTodoFilter.mjs";
const { input, select } = Grecha;

export const TodoFilter = ({ filterText, filterDone }) => {
  const filterTextInput = input("text")
    .bind$("value", filterText);
  const filterDoneInput = select(STATUSES)
    .bind$("value", filterDone, {delay: 1000});
  
  return div(
    p("Filter Todos:"),
    div("Text: ", filterTextInput),
    div("Done: ", filterDoneInput),
  );
};
