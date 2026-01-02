import { Grecha } from "../grecha.js";
const { input, state$ } = Grecha;

export const TodoForm = ({
  getTodos,
  createTodo,
  getShowDoneOnly,
  setShowDoneOnly,
}) => {
  const [getTodoId, setTodoId] = state$(getTodos().length);
  const [todoText] = state$("");

  const submit = () => {
    if (todoText()) {
      setTodoId(getTodoId() + 1); // increment id
      createTodo({ id: getTodoId(), text: todoText(), done: false });
    } else {
      alert("Please enter todo text.");
    }
  };

  const todoInput = input("text")
    .bind$("value", todoText)
    .on$("keydown", (evt) => evt.key === "Enter" && submit());

  return div(
    div("Todo Text: ", todoInput),

    button("Create Todo")
      .onclick$(submit),

    button(ite$(getShowDoneOnly, "Show All", "Show Done"))
      .onclick$(() => setShowDoneOnly(!getShowDoneOnly()))
  );
};
