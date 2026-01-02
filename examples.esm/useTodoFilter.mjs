import { Grecha } from "../grecha.js";
const { state$, derived$ } = Grecha;

export const STATUSES = {
  "all": "All",
  "done": "Done",
  "todo": "Todo",
};

export function useTodoFilter() {
  const [filterText] = state$("");
  const [filterDone] = state$("all");

  const [filter] = derived$(
    [filterText, filterDone],
    (text, done) => (todo) => {
      let passDone = false;
      switch (done) {
        case "all":
          passDone = true;
          break;
        case "done":
          passDone = !!todo.done;
          break;
        case "todo":
          passDone = !!todo.done === false;
          break;
      }
      return todo.text.includes(text) && passDone;
    }
  );

  return {
    filterText,
    filterDone,
    filter,
  };
}
