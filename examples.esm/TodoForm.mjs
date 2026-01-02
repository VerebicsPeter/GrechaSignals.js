import { Grecha } from "../grecha.js";
const { input, state$ } = Grecha;

export const TodoForm = ({ getTodos, createTodo }) => {
  const [todoText] = state$("");
  const [getTodoId, setTodoId] = state$(getTodos().length);

  const submit = () => {
    if (todoText()) {
      setTodoId(getTodoId() + 1); // increment id
      createTodo({ id: getTodoId(), text: todoText(), done: false });
    } else {
      alert("Please enter todo text.");
    }
  };

  return div(
    p("Create Todo:"),
    div(
      input("text")
        .bind$("value", todoText)
        .on$("keydown", (evt) => evt.key === "Enter" && submit())
    ),
    button("Create Todo").onclick$(submit)
  );
};
