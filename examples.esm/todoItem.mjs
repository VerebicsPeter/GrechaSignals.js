import { Grecha } from "../grecha.js";
const { input, state$, derived$, ite$ } = Grecha;

export const TodoItem = (todo, {getShowDoneOnly, removeTodo}) => {
  const [getText, setText, watchText] = state$(todo.text);
  const [getDone, setDone] = state$(todo.done);
  
  watchText((text) => {
    // sync UI state to the domain state
    todo.text = text;
  });
  
  const [shouldShow] = derived$(getDone, (done)=>{
    // sync UI state to the domain state
    todo.done = done;
    // NOTE: 
    // poll the dependency instead of adding a watcher to it,
    // this allows for better performance
    return getShowDoneOnly() ? done : true;
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
