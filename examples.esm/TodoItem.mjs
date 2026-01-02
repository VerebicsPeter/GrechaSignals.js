import { Grecha } from "../grecha.js";
const { input, state$, derived$, ite$ } = Grecha;

export const TodoItem = (todo, {filter, removeTodo}) => {
  const [getDone, setDone] = state$(todo.done);
  const [getText, setText] = state$(todo.text);
  
  const [shouldShow] = derived$([filter, getDone, getText],
    (filter, done, text) => {
    // sync UI state to the domain state
    todo.done = done;
    todo.text = text;
    // NOTE: 
    // call the filter instead of adding a watcher for state,
    // this allows for better performance
    return filter(todo);
  });

  return div(
    div("Todo: ", span(getText).style$({ fontWeight: "bold" })),
    div("Done: ", span(ite$(getDone, "Yes", "No"))),

    input("text")
      .bind$("value", setText),

    button("Remove")
      .on$("click", () => removeTodo(todo)),

    button(ite$(getDone, "Mark Todo", "Mark Done"))
      .on$("click", () => setDone(!getDone()))
  )
    .show$(shouldShow)
    .style$({ border: "1px solid black", marginTop: "1px"});
};
